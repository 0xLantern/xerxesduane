/**
 * Write the letter here: a title, a date line, paragraphs, headings, quotes
 * and photos with captions, in order. "Make the PDF" lays it out (compose.ts)
 * and hands it to the publish step, where it is previewed and encrypted like
 * any other PDF. The draft stays on this device until the letter is published.
 */
import { useEffect, useRef, useState } from "react";
import { composePdf, emptyDraft, loadDraft, newId, saveDraft, shrinkPhoto, unsupported, type Block, type Draft } from "./compose";
import { msg } from "./local";
import { ACCENT, Box, Btn, Err, INK, Label, SERIF, SOFT, inputCls } from "./ui";

export default function Editor({ sender, onCancel, onPdf }: { sender: string; onCancel: () => void; onPdf: (bytes: Uint8Array, title: string) => void }) {
  const [d, setD] = useState<Draft>(() => loadDraft() ?? emptyDraft(sender));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [kept, setKept] = useState(true);
  const photoInput = useRef<HTMLInputElement>(null);
  const insertAt = useRef<number>(-1);

  // Saved as it changes, a moment after the last keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setKept(saveDraft({ ...d, updatedAt: Date.now() })), 400);
    return () => window.clearTimeout(t);
  }, [d]);

  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const setBlock = (id: string, patch: Partial<Block>) => set({ blocks: d.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)) });
  const remove = (id: string) => set({ blocks: d.blocks.filter((b) => b.id !== id) });
  const move = (id: string, by: -1 | 1) => {
    const i = d.blocks.findIndex((b) => b.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= d.blocks.length) return;
    const next = [...d.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    set({ blocks: next });
  };
  const add = (kind: "paragraph" | "heading" | "quote", after = d.blocks.length - 1) => {
    const next = [...d.blocks];
    next.splice(after + 1, 0, { id: newId(), kind, text: "" });
    set({ blocks: next });
  };
  const addPhoto = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    try {
      const made: Block[] = [];
      for (const f of Array.from(files).slice(0, 10)) made.push({ id: newId(), kind: "photo", dataUrl: await shrinkPhoto(f), caption: "" });
      const next = [...d.blocks];
      next.splice(insertAt.current + 1, 0, ...made);
      set({ blocks: next });
    } catch (e) {
      setError(msg(e));
    }
  };

  const odd = unsupported([d.title, d.dateLine, d.greeting, d.closing, d.signature, ...d.blocks.map((b) => (b.kind === "photo" ? b.caption : b.text))].join(" "));
  const words = d.blocks.reduce((n, b) => n + (b.kind === "photo" ? 0 : b.text.split(/\s+/).filter(Boolean).length), 0);
  const photos = d.blocks.filter((b) => b.kind === "photo").length;

  const make = async () => {
    if (!d.title.trim()) return setError("Give the letter a title.");
    if (!d.blocks.some((b) => (b.kind === "photo" ? true : b.text.trim()))) return setError("Write something first.");
    setBusy(true);
    setError("");
    try {
      const bytes = await composePdf(d, sender);
      onPdf(bytes, d.title.trim());
    } catch (e) {
      setError(msg(e));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Btn onClick={onCancel}>‹ Back</Btn>
        <p className="text-sm" style={{ color: SOFT }}>
          {words} words · {photos} photo{photos === 1 ? "" : "s"}
          {!kept && " · too big to keep on this device: make the PDF before you leave"}
        </p>
      </div>

      <Box className="space-y-3">
        <Label text="Title">
          <input className={`${inputCls} text-lg font-bold`} style={{ fontFamily: SERIF }} value={d.title} maxLength={140} onChange={(e) => set({ title: e.target.value })} placeholder="For the Joy Set Before Us" />
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="Date line">
            <input className={inputCls} value={d.dateLine} maxLength={60} onChange={(e) => set({ dateLine: e.target.value })} />
          </Label>
          <Label text="Greeting">
            <input className={inputCls} value={d.greeting} maxLength={80} onChange={(e) => set({ greeting: e.target.value })} />
          </Label>
        </div>
      </Box>

      <ol className="space-y-3">
        {d.blocks.map((b, i) => (
          <li key={b.id}>
            <Box className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                  {b.kind}
                </span>
                <span className="flex gap-1">
                  <Small onClick={() => move(b.id, -1)} disabled={i === 0} label="Move up">
                    ↑
                  </Small>
                  <Small onClick={() => move(b.id, 1)} disabled={i === d.blocks.length - 1} label="Move down">
                    ↓
                  </Small>
                  <Small onClick={() => remove(b.id)} label="Remove" danger>
                    ×
                  </Small>
                </span>
              </div>
              {b.kind === "photo" ? (
                <>
                  <img src={b.dataUrl} alt="" className="max-h-72 w-full rounded-xl object-contain" style={{ background: "#f2ede4" }} />
                  <input className={inputCls} value={b.caption} maxLength={200} onChange={(e) => setBlock(b.id, { caption: e.target.value })} placeholder="Caption (optional)" />
                </>
              ) : b.kind === "heading" ? (
                <input className={`${inputCls} font-bold`} value={b.text} maxLength={120} onChange={(e) => setBlock(b.id, { text: e.target.value })} placeholder="A heading" />
              ) : (
                <textarea
                  className={`${inputCls} min-h-[7rem] resize-y leading-relaxed`}
                  style={{ fontFamily: SERIF, fontSize: "1.05rem" }}
                  value={b.text}
                  maxLength={6000}
                  onChange={(e) => setBlock(b.id, { text: e.target.value })}
                  placeholder={b.kind === "quote" ? "A verse or a line worth setting apart" : "Write as you'd speak. A blank line starts a new paragraph."}
                />
              )}
              <div className="flex flex-wrap gap-1 pt-1">
                <Small onClick={() => add("paragraph", i)} label="Add a paragraph after this">
                  + Paragraph
                </Small>
                <Small onClick={() => add("heading", i)} label="Add a heading after this">
                  + Heading
                </Small>
                <Small onClick={() => add("quote", i)} label="Add a quote after this">
                  + Quote
                </Small>
                <Small
                  onClick={() => {
                    insertAt.current = i;
                    photoInput.current?.click();
                  }}
                  label="Add a photo after this"
                >
                  + Photo
                </Small>
              </div>
            </Box>
          </li>
        ))}
      </ol>
      {d.blocks.length === 0 && (
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => add("paragraph")}>+ Paragraph</Btn>
          <Btn
            onClick={() => {
              insertAt.current = -1;
              photoInput.current?.click();
            }}
          >
            + Photo
          </Btn>
        </div>
      )}
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void addPhoto(e.target.files);
          e.target.value = "";
        }}
      />

      <Box className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Label text="Closing">
            <input className={inputCls} value={d.closing} maxLength={80} onChange={(e) => set({ closing: e.target.value })} />
          </Label>
          <Label text="Signed">
            <input className={inputCls} value={d.signature} maxLength={120} onChange={(e) => set({ signature: e.target.value })} />
          </Label>
        </div>
        {odd.length > 0 && (
          <p className="rounded-xl bg-[#fdf0dc] px-3 py-2 text-sm" style={{ color: "#8a5a0e" }}>
            These will be left out of the PDF, because the letter's fonts don't have them: {odd.slice(0, 12).join(" ")}
            {odd.length > 12 ? " …" : ""}. Emoji and scripts like Korean or Arabic can't be set; Latin, Vietnamese, Greek and Cyrillic can.
          </p>
        )}
        <Err>{error}</Err>
        <div className="flex flex-wrap gap-2">
          <Btn kind="primary" onClick={() => void make()} disabled={busy}>
            {busy ? "Laying it out…" : "Make the PDF"}
          </Btn>
          <Btn
            kind="danger"
            onClick={() => {
              if (!window.confirm("Start over? This draft is thrown away.")) return;
              setD(emptyDraft(sender));
            }}
          >
            Start over
          </Btn>
        </div>
        <p className="text-sm" style={{ color: SOFT }}>
          You'll see the pages next and can come back here to change anything. The draft stays on this device until the letter is published.
        </p>
      </Box>
    </div>
  );
}

function Small({ children, onClick, label, disabled, danger }: { children: string; onClick: () => void; label: string; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="min-h-9 rounded-full border px-3 text-sm font-semibold disabled:opacity-30"
      style={{ borderColor: "#ddd5c7", color: danger ? "#9b3a2e" : INK }}
    >
      {children}
    </button>
  );
}
