/**
 * Publishing a letter: pick the PDF, see its first pages (drawn here, from
 * the file on this device), give it a title, choose who gets it, and publish.
 * Encryption happens in this browser before anything is uploaded.
 */
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Partner, Settings } from "./api";
import { clearDraft } from "./compose";
import Editor from "./Editor";
import type { Fresh } from "./LetterDetail";
import { fmtSize, msg } from "./local";
import { PdfPage } from "./Pages";
import { openPdf, pdfTitle } from "./pdf";
import { publish, type Step } from "./publish";
import { LIFESPAN_CHOICES, LIFESPAN_DAYS, MAX_PDF_BYTES } from "./shared";

/** What's checked before a letter goes out: what would hurt if it leaked. */
const CHECKS = [
  "No names of local believers or seekers, only first names or initials where it matters",
  "No church, meeting or home locations",
  "No photos where faces of local believers can be recognised",
  "Nothing I'd mind a stranger or an official reading",
];
import { ACCENT, Bar, Box, Btn, Check, Err, INK, Label, Reach, SERIF, SOFT, inputCls } from "./ui";

type Picked = { name: string; bytes: Uint8Array; doc: PDFDocumentProxy; written?: boolean };

/** "Xerxes_Loraine_Arise_Asia_2026_1.pdf" -> "Xerxes Loraine Arise Asia 2026 1" */
/** Drop a trailing " | Senders" or " - Senders" from a PDF title: partners already see who it is from. */
const bareTitle = (t: string) => t.replace(/\s+[|\u2013\u2014-]\s+[^|\u2013\u2014-]+$/, "").trim();
const fromFileName = (name: string) => name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);

export default function Publish({ partners, settings, onCancel, onDone }: { partners: Partner[]; settings: Settings; onCancel: () => void; onDone: (id: string, fresh: Fresh) => void }) {
  const active = useMemo(() => partners.filter((p) => p.active), [partners]);
  const paused = partners.length - active.length;
  const [file, setFile] = useState<Picked | null>(null);
  const [title, setTitle] = useState("");
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(active.map((p) => p.id)));
  const [allow, setAllow] = useState(settings.allowDownload);
  const [spotlight, setSpotlight] = useState(true);
  const [holdToRead, setHoldToRead] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [writing, setWriting] = useState(false);
  const [days, setDays] = useState(LIFESPAN_DAYS);
  const [checked, setChecked] = useState<boolean[]>(() => CHECKS.map(() => false));
  const allChecked = checked.every(Boolean);
  const input = useRef<HTMLInputElement>(null);

  // Let go of the old document when a new one is picked, or on leaving.
  useEffect(() => () => void file?.doc.loadingTask.destroy(), [file]);

  const choose = async (f: File | undefined) => {
    if (!f) return;
    setError("");
    if (f.size > MAX_PDF_BYTES) return setError(`That file is ${fmtSize(f.size)}. Letters can be up to 25 MB.`);
    setReading(true);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      if (new TextDecoder().decode(bytes.subarray(0, 1024)).indexOf("%PDF-") < 0) throw new Error("That isn't a PDF. Choose the PDF file of the letter.");
      // pdf.js keeps the buffer it is given, so it gets a copy: these bytes are what's encrypted.
      const doc = await openPdf(bytes.slice()).catch(() => {
        throw new Error("That PDF couldn't be opened. Is it damaged, or protected with a password?");
      });
      setFile({ name: f.name, bytes, doc });
      setTitle(bareTitle((await pdfTitle(doc)) || "") || fromFileName(f.name));
    } catch (e) {
      setError(msg(e));
    } finally {
      setReading(false);
    }
  };

  // From the editor: the composed PDF, previewed like an uploaded one.
  const written = async (bytes: Uint8Array, name: string) => {
    setError("");
    try {
      const doc = await openPdf(bytes.slice());
      setFile({ name: `${name}.pdf`, bytes, doc, written: true });
      setTitle(name);
      setWriting(false);
      window.scrollTo(0, 0);
    } catch (e) {
      setError(msg(e));
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void choose(e.dataTransfer.files?.[0]);
  };

  const recipients = active.filter((p) => chosen.has(p.id));
  const emails = recipients.filter((p) => p.email).length;
  const whatsapps = recipients.filter((p) => p.whatsapp).length;

  const go = async () => {
    if (!file) return;
    if (!title.trim()) return setError("Give the letter a title.");
    if (!recipients.length) return setError("Choose at least one partner.");
    const note = emails ? ` ${emails} email${emails === 1 ? "" : "s"} will go out right away.` : "";
    if (!window.confirm(`Publish “${title.trim()}” to ${recipients.length} partner${recipients.length === 1 ? "" : "s"}?${note}`)) return;
    setError("");
    setStep({ label: "Encrypting the PDF", done: 0, total: 1 });
    try {
      const r = await publish(file.bytes, { title: title.trim(), allowDownload: allow, spotlight, holdToRead, days, sender: settings.sender, partners: recipients }, setStep);
      if (file.written) clearDraft();
      onDone(r.letter.id, { rec: r.rec, result: r.result });
    } catch (e) {
      setStep(null);
      setError(`${msg(e)} Nothing was sent.`);
    }
  };

  if (step) {
    return (
      <Box className="space-y-4">
        <p className="text-lg font-bold" style={{ color: INK, fontFamily: SERIF }}>
          Publishing “{title.trim()}”
        </p>
        <Bar done={step.done} total={step.total} label={step.label} />
        <p className="text-sm" style={{ color: SOFT }}>
          Keep this page open until it's done. The PDF is encrypted here, on this device, before any of it is uploaded.
        </p>
      </Box>
    );
  }

  if (writing) return <Editor sender={settings.sender} onCancel={() => setWriting(false)} onPdf={(bytes, name) => void written(bytes, name)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Btn onClick={onCancel}>‹ All letters</Btn>
      </div>

      <Box className="space-y-4">
        <p className="text-lg font-bold" style={{ color: INK, fontFamily: SERIF }}>
          1. The letter
        </p>
        {!file ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className="rounded-2xl border-2 border-dashed px-5 py-10 text-center transition"
            style={{ borderColor: drag ? ACCENT : "#d8cfbf", background: drag ? "#faf6ee" : "#fcfbf8" }}
          >
            <p className="font-bold" style={{ color: INK }}>
              {reading ? "Opening the PDF…" : "Drop the PDF here"}
            </p>
            <p className="mt-1 text-sm" style={{ color: SOFT }}>
              Up to 25 MB. It stays on this device until it's encrypted.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Btn kind="primary" disabled={reading} onClick={() => input.current?.click()}>
                Choose a PDF
              </Btn>
              <Btn disabled={reading} onClick={() => setWriting(true)}>
                Write it here
              </Btn>
            </div>
            <p className="mt-3 text-sm" style={{ color: SOFT }}>
              Or write the letter on this page, with photos, and it's laid out as a PDF for you.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {Array.from({ length: Math.min(3, file.doc.numPages) }, (_, i) => (
                <PdfPage key={i} doc={file.doc} n={i + 1} />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-sm" style={{ color: SOFT }}>
                <span className="font-semibold" style={{ color: INK }}>{file.name}</span> · {file.doc.numPages} page{file.doc.numPages === 1 ? "" : "s"} · {fmtSize(file.bytes.length)}
              </p>
              <span className="flex gap-2">
                {file.written && <Btn onClick={() => setWriting(true)}>Edit the letter</Btn>}
                <Btn onClick={() => input.current?.click()} disabled={reading}>
                  Choose another
                </Btn>
              </span>
            </div>
          </div>
        )}
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {file && (
          <Label text="Title" hint="Just the letter's name: partners see it at the top of their letter, and as the email's subject.">
            <input className={`${inputCls} font-bold`} value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} />
          </Label>
        )}
      </Box>

      {file && (
        <>
          <Box className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-lg font-bold" style={{ color: INK, fontFamily: SERIF }}>
                2. Who gets it
              </p>
              <div className="flex gap-1 text-sm font-semibold">
                <button type="button" className="min-h-11 rounded-full px-3 hover:bg-[#f2ede4]" style={{ color: ACCENT }} onClick={() => setChosen(new Set(active.map((p) => p.id)))}>
                  All
                </button>
                <button type="button" className="min-h-11 rounded-full px-3 hover:bg-[#f2ede4]" style={{ color: ACCENT }} onClick={() => setChosen(new Set())}>
                  None
                </button>
              </div>
            </div>
            {!active.length && <p style={{ color: SOFT }}>No partners yet. Add them in the Partners tab first.</p>}
            <div className="divide-y divide-[#f2ede4]">
              {active.map((p) => (
                <Check
                  key={p.id}
                  checked={chosen.has(p.id)}
                  onChange={(on) =>
                    setChosen((s) => {
                      const n = new Set(s);
                      if (on) n.add(p.id);
                      else n.delete(p.id);
                      return n;
                    })
                  }
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold" style={{ color: INK }}>
                      {p.name}
                    </span>
                    <Reach email={p.email} whatsapp={p.whatsapp} />
                  </span>
                </Check>
              ))}
            </div>
            <p className="text-sm" style={{ color: SOFT }}>
              {recipients.length} chosen: {emails} by email, {whatsapps} on WhatsApp.
              {paused > 0 && ` ${paused} paused partner${paused === 1 ? " isn't" : "s aren't"} listed.`}
            </p>
          </Box>

          <Box className="space-y-3">
            <p className="text-lg font-bold" style={{ color: INK, fontFamily: SERIF }}>
              3. Publish
            </p>
            <Check checked={allow} onChange={setAllow}>
              <span className="font-semibold" style={{ color: INK }}>
                Let partners download the PDF
              </span>
              <span className="block text-sm" style={{ color: SOFT }}>
                When it's off, they read it on the page only. (Nothing can stop someone saving what's on their screen.)
              </span>
            </Check>
            <Check checked={spotlight} onChange={setSpotlight}>
              <span className="font-semibold" style={{ color: INK }}>
                Spotlight reading on computers
              </span>
              <span className="block text-sm" style={{ color: SOFT }}>
                On a computer, only the lines under the mouse show and the rest of the page stays blank, so a PrintScreen catches a few lines, not the page.
              </span>
            </Check>
            <Check checked={holdToRead} onChange={setHoldToRead}>
              <span className="font-semibold" style={{ color: INK }}>
                Hold-to-read on phones, for a sensitive letter
              </span>
              <span className="block text-sm" style={{ color: SOFT }}>
                On a phone or tablet the letter shows only while a finger is on the screen, and goes blank when it's lifted, so a screenshot with the phone's buttons usually catches a blank page. Less comfortable to read: leave it off for ordinary letters.
              </span>
            </Check>
            <div>
              <p className="text-sm font-bold" style={{ color: INK }}>
                Open for
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {LIFESPAN_CHOICES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    aria-pressed={days === d}
                    className="min-h-11 rounded-full border px-4 text-[0.95rem] font-bold"
                    style={days === d ? { background: INK, borderColor: INK, color: "#fff" } : { borderColor: "#ddd5c7", color: INK }}
                  >
                    {d === 7 ? "1 week" : d === 14 ? "2 weeks" : `${d} days`}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-sm" style={{ color: SOFT }}>
                A week for a letter with anything sensitive in it. After that every copy and the file are deleted.
              </p>
            </div>
            <div className="rounded-2xl bg-[#faf6ee] p-3">
              <p className="text-sm font-bold" style={{ color: INK }}>
                Before it goes: would it be safe if it leaked?
              </p>
              <p className="mt-0.5 text-sm" style={{ color: SOFT }}>
                Each copy is locked to two devices and carries the partner's name, but a phone camera can still photograph a screen.
              </p>
              <div className="mt-1">
                {CHECKS.map((c, i) => (
                  <Check key={c} checked={checked[i]} onChange={(on) => setChecked((x) => x.map((v, j) => (j === i ? on : v)))}>
                    <span className="text-[0.95rem]" style={{ color: INK }}>
                      {c}
                    </span>
                  </Check>
                ))}
              </div>
            </div>
            <p className="text-sm" style={{ color: SOFT }}>
              Emails go out as soon as you publish. Then you'll get a list to send each WhatsApp message yourself. Each link opens on up to two of the partner's devices, for {days} days or until you withdraw it.
            </p>
            <Err>{error}</Err>
            <Btn kind="primary" className="w-full" onClick={() => void go()} disabled={!recipients.length || !title.trim() || !allChecked}>
              Encrypt &amp; publish
            </Btn>
          </Box>
        </>
      )}
      {!file && <Err>{error}</Err>}
    </div>
  );
}
