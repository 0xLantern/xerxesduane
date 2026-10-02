/**
 * Publishing a letter: pick the PDF, see its first pages (drawn here, from
 * the file on this device), give it a title, choose who gets it, and publish.
 * Encryption happens in this browser before anything is uploaded.
 */
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Partner, Settings } from "./api";
import type { Fresh } from "./LetterDetail";
import { fmtSize, msg } from "./local";
import { PdfPage } from "./Pages";
import { openPdf, pdfTitle } from "./pdf";
import { publish, type Step } from "./publish";
import { LIFESPAN_DAYS, MAX_PDF_BYTES } from "./shared";
import { ACCENT, Bar, Box, Btn, Check, Err, INK, Label, Reach, SERIF, SOFT, inputCls } from "./ui";

type Picked = { name: string; bytes: Uint8Array; doc: PDFDocumentProxy };

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
  const [step, setStep] = useState<Step | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
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
      const r = await publish(file.bytes, { title: title.trim(), allowDownload: allow, sender: settings.sender, partners: recipients }, setStep);
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
            <Btn kind="primary" className="mt-4" disabled={reading} onClick={() => input.current?.click()}>
              Choose a PDF
            </Btn>
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
              <Btn onClick={() => input.current?.click()} disabled={reading}>
                Choose another
              </Btn>
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
            <p className="text-sm" style={{ color: SOFT }}>
              Emails go out as soon as you publish. Then you'll get a list to send each WhatsApp message yourself. Each link works for {LIFESPAN_DAYS} days, or until you withdraw it.
            </p>
            <Err>{error}</Err>
            <Btn kind="primary" className="w-full" onClick={() => void go()} disabled={!recipients.length || !title.trim()}>
              Encrypt &amp; publish
            </Btn>
          </Box>
        </>
      )}
      {!file && <Err>{error}</Err>}
    </div>
  );
}
