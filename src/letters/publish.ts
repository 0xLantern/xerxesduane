/**
 * Publishing, all of it in the owner's browser (see shared.ts for the scheme):
 * encrypt the PDF under a new file key, upload it in pieces, then make each
 * partner's copy and email the partners who have an address.
 *
 * The keys never reach the server, except that each email's link has to pass
 * through it once to be sent. They are kept in this browser (local.ts) so the
 * owner can send the WhatsApp messages afterwards.
 */
import { api, retry, type EmailSend, type Letter, type NewCopy, type Partner } from "./api";
import { local, linkFor, type LocalLetter, type LocalLink } from "./local";
import { CHUNK_BYTES, chunkCount, encrypt, newKey, randomId, toB64url, type Wrapped } from "./shared";

export type Step = { label: string; done: number; total: number };
export type OnStep = (s: Step) => void;

export type SendResult = {
  made: number;
  /** Names of partners whose copy couldn't be made. */
  failed: string[];
  emailed: number;
  /** Why emails didn't go, when they didn't. */
  emailError: string;
  /** False when this browser wouldn't keep the links (private mode, storage full). */
  kept: boolean;
};

/** Run `fn` over 0..n-1, `width` at a time. */
async function pool(n: number, width: number, fn: (i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(width, n) }, async () => {
      while (next < n) await fn(next++);
    }),
  );
}

export async function publish(
  pdf: Uint8Array,
  opts: { title: string; allowDownload: boolean; sender: string; partners: Partner[] },
  onStep: OnStep,
): Promise<{ letter: Letter; rec: LocalLetter; result: SendResult }> {
  onStep({ label: "Encrypting the PDF", done: 0, total: 1 });
  const file = await newKey();
  const sealed = await encrypt(pdf, file.key);
  const chunks = chunkCount(sealed.length);
  const { letter } = await api.createLetter({ title: opts.title, size: sealed.length, chunks, allowDownload: opts.allowDownload });

  let live: Letter;
  try {
    let sent = 0;
    onStep({ label: `Uploading piece 1 of ${chunks}`, done: 0, total: chunks });
    await pool(chunks, 3, async (n) => {
      const data = toB64url(sealed.subarray(n * CHUNK_BYTES, (n + 1) * CHUNK_BYTES));
      await retry(() => api.chunk(letter.id, n, data));
      sent++;
      onStep({ label: `Uploading piece ${Math.min(sent + 1, chunks)} of ${chunks}`, done: sent, total: chunks });
    });
    live = (await retry(() => api.finishLetter(letter.id))).letter;
  } catch (e) {
    // Half a file is no use to anyone: clear it away, then say what went wrong.
    await api.removeLetter(letter.id).catch(() => undefined);
    throw e;
  }

  const rec: LocalLetter = {
    v: 1,
    letterId: live.id,
    fileKey: file.raw,
    title: live.title,
    sender: opts.sender,
    expiresAt: live.expiresAt,
    allowDownload: live.allowDownload,
    links: {},
  };
  const kept = local.save(rec);
  const sent = await sendCopies(rec, opts.partners, onStep);
  return { letter: live, rec: sent.rec, result: { ...sent.result, kept: kept && sent.result.kept } };
}

/**
 * Make copies of a live letter for these partners (a fresh copy id and link
 * key each), keep their links here, and email those who have an address.
 * Used at publish and by "Send to more partners". Returns the record with the
 * new links in it too, for a browser that wouldn't store them.
 */
export async function sendCopies(rec: LocalLetter, partners: Partner[], onStep: OnStep): Promise<{ rec: LocalLetter; result: SendResult }> {
  const out: SendResult = { made: 0, failed: [], emailed: 0, emailError: "", kept: true };
  const enc = new TextEncoder();
  const byCopy = new Map<string, { partner: Partner; link: string }>();
  const all: NewCopy[] = [];

  onStep({ label: "Making each partner's copy", done: 0, total: partners.length });
  for (const p of partners) {
    const copyId = randomId(16);
    const key = await newKey();
    const w: Wrapped = { fileKey: rec.fileKey, title: rec.title, hello: p.hello || p.name, sender: rec.sender, expiresAt: rec.expiresAt, allowDownload: rec.allowDownload };
    all.push({ copyId, partnerId: p.id, wrapped: toB64url(await encrypt(enc.encode(JSON.stringify(w)), key.key)) });
    byCopy.set(copyId, { partner: p, link: linkFor(copyId, key.raw) });
  }

  const made: string[] = [];
  const kept: Record<string, LocalLink> = {};
  for (let i = 0; i < all.length; i += 50) {
    const batch = all.slice(i, i + 50);
    try {
      const r = await retry(() => api.copies(rec.letterId, batch));
      const links: Record<string, LocalLink> = {};
      for (const c of r.created) links[c] = { partnerId: byCopy.get(c)!.partner.id, link: byCopy.get(c)!.link };
      Object.assign(kept, links);
      if (!local.addLinks(rec.letterId, links)) out.kept = false;
      made.push(...r.created);
      for (const f of r.failed) out.failed.push(byCopy.get(f.copyId)?.partner.name ?? "a partner");
    } catch (e) {
      if (!made.length && i === 0) throw e;
      out.failed.push(...batch.map((c) => byCopy.get(c.copyId)!.partner.name));
    }
    onStep({ label: "Making each partner's copy", done: Math.min(i + 50, all.length), total: all.length });
  }
  out.made = made.length;

  const sends: EmailSend[] = made
    .map((copyId) => ({ copyId, ...byCopy.get(copyId)! }))
    .filter((s) => s.partner.email)
    .map((s) => ({ partnerId: s.partner.id, copyId: s.copyId, link: s.link }));
  if (sends.length) {
    onStep({ label: `Emailing ${sends.length} partner${sends.length === 1 ? "" : "s"}`, done: 0, total: sends.length });
    try {
      for (let i = 0; i < sends.length; i += 100) {
        const r = await retry(() => api.email(rec.letterId, sends.slice(i, i + 100)));
        out.emailed += r.sent.length;
        onStep({ label: `Emailing ${sends.length} partner${sends.length === 1 ? "" : "s"}`, done: Math.min(i + 100, sends.length), total: sends.length });
      }
    } catch (e) {
      out.emailError = e instanceof Error ? e.message : "The emails didn't go out.";
    }
  }
  onStep({ label: "Done", done: 1, total: 1 });
  return { rec: { ...rec, links: { ...rec.links, ...kept } }, result: out };
}

/** Email one copy again (or for the first time, after a failure), from the links kept here. */
export async function emailOne(letterId: string, copyId: string, partnerId: string, link: string): Promise<boolean> {
  const r = await api.email(letterId, [{ copyId, partnerId, link }]);
  return r.sent.includes(copyId);
}
