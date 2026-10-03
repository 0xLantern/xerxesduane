/**
 * The partner list: who gets each letter, and how. Every partner needs an
 * email address or a WhatsApp number, or both; the greeting is the name the
 * letter and messages use ("Dear Beat").
 */
import { useMemo, useState } from "react";
import { api, type Partner } from "./api";
import { fmtShort, msg } from "./local";
import { ACCENT, Box, Btn, Err, INK, Note, Pill, SOFT, inputCls } from "./ui";

type Draft = { name: string; email: string; whatsapp: string; messenger: string; hello: string; giving: string; birthday: string; notes: string };
const empty: Draft = { name: "", email: "", whatsapp: "", messenger: "", hello: "", giving: "", birthday: "", notes: "" };

const looksLikeMessenger = (s: string) => /(facebook\.com|fb\.com|fb\.me|m\.me|messenger\.com)\//i.test(s);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "14 March" (and the age, when the year is known) from MM-DD or YYYY-MM-DD. */
function fmtBirthday(b: string, now = new Date()): string {
  const m = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(b);
  if (!m) return b;
  const text = `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`;
  if (!m[1]) return text;
  const age = now.getFullYear() - Number(m[1]) - (now.getMonth() + 1 < Number(m[2]) || (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3])) ? 1 : 0);
  return `${text} (${age})`;
}

/** Days until the next birthday, 0 for today; null without one. */
function daysToBirthday(b: string, now = new Date()): number | null {
  const m = /^(?:\d{4}-)?(\d{2})-(\d{2})$/.exec(b);
  if (!m) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let next = Date.UTC(now.getFullYear(), Number(m[1]) - 1, Number(m[2]));
  if (next < today) next = Date.UTC(now.getFullYear() + 1, Number(m[1]) - 1, Number(m[2]));
  return Math.round((next - today) / 864e5);
}

const looksLikeNumber = (s: string) => /^[+\d\s().-]+$/.test(s) && s.replace(/\D/g, "").length >= 7;

/**
 * One partner per line, "Name, email, WhatsApp, greeting". The fields after
 * the name are recognised by their look, so any of them can be left out:
 * "Anna Meier, +41 79 123 45 67" works too.
 */
function parseBulk(text: string): Draft[] {
  return text
    .split("\n")
    .map((line) => line.split(/[,;\t]/).map((x) => x.trim()))
    .filter((cells) => cells[0])
    .map(([name, ...rest]) => {
      const d: Draft = { ...empty, name };
      for (const c of rest) {
        if (!c) continue;
        if (looksLikeMessenger(c) && !d.messenger) d.messenger = c;
        else if (c.includes("@") && !d.email) d.email = c;
        else if (looksLikeNumber(c) && !d.whatsapp) d.whatsapp = c;
        else if (!d.hello) d.hello = c;
      }
      return d;
    });
}

export default function Partners({ partners, reload }: { partners: Partner[]; reload: () => Promise<void> }) {
  const [draft, setDraft] = useState<Draft>(empty);
  const [bulk, setBulk] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const add = async (rows: Draft[]) => {
    setError("");
    setNote("");
    try {
      const r = await api.addPartners(rows);
      if (r.added === 0 && r.skipped.length) setError(r.skipped.join(" "));
      else setNote(`Added ${r.added}.${r.skipped.length ? ` Skipped: ${r.skipped.join(" ")}` : ""}`);
      await reload();
      return r.added > 0;
    } catch (e) {
      setError(msg(e));
      return false;
    }
  };

  const active = partners.filter((p) => p.active).length;
  const preview = parseBulk(bulk);
  // Birthdays in the next month, soonest first: a line in the letter, or a message on the day.
  const soon = useMemo(
    () =>
      partners
        .map((p) => ({ p, days: daysToBirthday(p.birthday) }))
        .filter((x): x is { p: Partner; days: number } => x.days !== null && x.days <= 30)
        .sort((a, b) => a.days - b.days),
    [partners],
  );
  return (
    <div className="space-y-4">
      <Box className="space-y-3">
        <p className="font-bold" style={{ color: INK }}>
          Add a partner
        </p>
        <Fields value={draft} onChange={setDraft} />
        <p className="text-sm" style={{ color: SOFT }}>
          An email address, a WhatsApp number, a Messenger profile, or any mix. WhatsApp numbers need the country code.
        </p>
        <Btn
          kind="primary"
          onClick={() =>
            void add([draft]).then((ok) => {
              if (ok) setDraft(empty);
            })
          }
        >
          Add partner
        </Btn>
        <details className="pt-1">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold" style={{ color: ACCENT }}>
            Add many at once
          </summary>
          <textarea
            className={`${inputCls} mt-2 min-h-[8rem] font-mono text-sm`}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"One per line: Name, email, WhatsApp, Messenger link, greeting\nBeat Baumann, bb@gcn.live, +41 79 376 87 33, Beat\nAnna Meier, , +41 79 123 45 67\nPastor Ramon Cruz, ramon@example.ph, , Pastor Ramon"}
          />
          {preview.length > 0 && (
            <p className="mt-1 text-sm" style={{ color: SOFT }}>
              {preview.length} line{preview.length === 1 ? "" : "s"}: {preview.filter((d) => d.email).length} with email, {preview.filter((d) => d.whatsapp).length} with WhatsApp, {preview.filter((d) => d.messenger).length} with Messenger.
            </p>
          )}
          <Btn className="mt-2" disabled={!preview.length} onClick={() => void add(preview).then((ok) => ok && setBulk(""))}>
            Add all
          </Btn>
        </details>
        <Err>{error}</Err>
        <Note>{note}</Note>
      </Box>

      {soon.length > 0 && (
        <Box>
          <p className="font-bold" style={{ color: INK }}>
            Birthdays coming up
          </p>
          <ul className="mt-2 space-y-1 text-[0.95rem]">
            {soon.map(({ p, days }) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span style={{ color: INK }}>
                  {p.name} <span style={{ color: SOFT }}>· {fmtBirthday(p.birthday)}</span>
                </span>
                <span className="shrink-0 font-semibold" style={{ color: days === 0 ? ACCENT : SOFT }}>
                  {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days} days`}
                </span>
              </li>
            ))}
          </ul>
        </Box>
      )}

      <Box>
        <p className="font-bold" style={{ color: INK }}>
          {partners.length} partner{partners.length === 1 ? "" : "s"} · {active} receive letters
        </p>
        <ul className="mt-2 divide-y divide-[#efe9df]">
          {partners.map((p) => (
            <Row key={p.id} p={p} reload={reload} />
          ))}
        </ul>
      </Box>
    </div>
  );
}

function Fields({ value, onChange }: { value: Draft; onChange: (d: Draft) => void }) {
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <input className={inputCls} placeholder="Full name" aria-label="Full name" value={value.name} onChange={set("name")} autoComplete="off" />
      <input className={inputCls} placeholder="Greeting, e.g. Beat (optional)" aria-label="Greeting" value={value.hello} onChange={set("hello")} autoComplete="off" />
      <input className={inputCls} type="email" placeholder="Email (optional)" aria-label="Email" value={value.email} onChange={set("email")} autoComplete="off" />
      <input className={inputCls} type="tel" inputMode="tel" placeholder="WhatsApp, e.g. +971 50 123 4567" aria-label="WhatsApp number" value={value.whatsapp} onChange={set("whatsapp")} autoComplete="off" />
      <input className={`${inputCls} sm:col-span-2`} inputMode="url" placeholder="Messenger: their Facebook profile link, e.g. facebook.com/ramon.cruz (optional)" aria-label="Messenger" value={value.messenger} onChange={set("messenger")} autoComplete="off" />
      <input className={inputCls} placeholder="How they give, e.g. Monthly through GCN (optional)" aria-label="How they give" value={value.giving} onChange={set("giving")} autoComplete="off" />
      <input className={inputCls} placeholder="Birthday, e.g. 14 March (optional)" aria-label="Birthday" value={value.birthday} onChange={set("birthday")} autoComplete="off" />
      <textarea className={`${inputCls} sm:col-span-2`} rows={2} placeholder="Notes: family, church, how you met… (optional)" aria-label="Notes" value={value.notes} onChange={set("notes")} />
    </div>
  );
}

const toDraft = (p: Partner): Draft => ({ name: p.name, email: p.email, whatsapp: p.whatsapp ? `+${p.whatsapp}` : "", messenger: p.messenger, hello: p.hello, giving: p.giving, birthday: p.birthday, notes: p.notes });

function Row({ p, reload }: { p: Partner; reload: () => Promise<void> }) {
  const [edit, setEdit] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      await reload();
      return true;
    } catch (e) {
      setError(msg(e));
      return false;
    }
  };

  if (edit) {
    return (
      <li className="space-y-2 py-3">
        <Fields value={edit} onChange={setEdit} />
        <Err>{error}</Err>
        <div className="flex gap-2">
          <Btn kind="primary" onClick={() => void run(() => api.savePartner({ ...p, ...edit })).then((ok) => ok && setEdit(null))}>
            Save
          </Btn>
          <Btn onClick={() => setEdit(null)}>Cancel</Btn>
        </div>
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="font-semibold" style={{ color: p.active ? INK : SOFT }}>
            {p.name} <span className="font-normal" style={{ color: SOFT }}>· “Dear {p.hello}”</span> {!p.active && <Pill>Paused</Pill>}
          </p>
          <p className="break-words text-sm" style={{ color: SOFT }}>
            {[p.email, p.whatsapp && `+${p.whatsapp}`, p.messenger && `Messenger: ${p.messenger}`].filter(Boolean).join(" · ")}
          </p>
          {(p.giving || p.birthday || p.lastLetterAt) && (
            <p className="break-words text-sm" style={{ color: SOFT }}>
              {[p.giving, p.birthday && `🎂 ${fmtBirthday(p.birthday)}`, p.lastLetterAt && `last letter ${fmtShort(p.lastLetterAt)}`].filter(Boolean).join(" · ")}
            </p>
          )}
          {p.notes && (
            <p className="mt-1 whitespace-pre-line text-sm italic" style={{ color: INK }}>
              {p.notes}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" className="min-h-11 rounded-full px-3 text-sm font-semibold hover:bg-[#f2ede4]" style={{ color: INK }} onClick={() => setEdit(toDraft(p))}>
            Edit
          </button>
          <button type="button" className="min-h-11 rounded-full px-3 text-sm font-semibold hover:bg-[#f2ede4]" style={{ color: INK }} onClick={() => void run(() => api.savePartner({ ...p, whatsapp: p.whatsapp ? `+${p.whatsapp}` : "", active: !p.active }))}>
            {p.active ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-full px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
            onClick={() => window.confirm(`Remove ${p.name}? Copies already sent keep working until they expire or you withdraw them.`) && void run(() => api.deletePartner(p.id))}
          >
            Remove
          </button>
        </div>
      </div>
      <Err>{error}</Err>
    </li>
  );
}
