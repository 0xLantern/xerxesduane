/** Sender name, reply-to, the WhatsApp message, and the download default. */
import { useState } from "react";
import { api, type Settings } from "./api";
import { PLACEHOLDERS, fillTemplate, fmtDate, msg } from "./local";
import { Box, Btn, Check, Err, INK, Label, Note, SOFT, inputCls } from "./ui";

export default function SettingsTab({ settings, defaults, onSaved }: { settings: Settings; defaults: { waTemplate: string }; onSaved: (s: Settings) => void }) {
  const [s, setS] = useState<Settings>(settings);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  // A sample for the preview: a letter published now (a pure value for render).
  const [sampleExpiry] = useState(() => Date.now() + 30 * 864e5);
  const set = (patch: Partial<Settings>) => {
    setS({ ...s, ...patch });
    setSaved(false);
  };
  const preview = fillTemplate(s.waTemplate, {
    hello: "Beat",
    name: "Beat Baumann",
    title: "For the Joy Set Before Us",
    link: "https://ministry.xerxesduane.com/l/…",
    expires: fmtDate(sampleExpiry),
  });

  return (
    <Box className="space-y-5">
      <Label text="Your name, as partners see it" hint="“A letter from …” at the top of each letter, and the email's sender.">
        <input className={inputCls} value={s.sender} onChange={(e) => set({ sender: e.target.value })} />
      </Label>
      <Label text="Replies go to" hint="When a partner answers the email. Empty uses hi@xerxesduane.com.">
        <input className={inputCls} type="email" value={s.replyTo} onChange={(e) => set({ replyTo: e.target.value })} />
      </Label>
      <div>
        <Label text="WhatsApp message" hint={<>Filled in for each partner: {PLACEHOLDERS.map((p) => <code key={p} className="mr-1 rounded bg-[#f2ede4] px-1 py-0.5 text-[0.8rem]">{`{{${p}}}`}</code>)}</>}>
          <textarea className={`${inputCls} min-h-[13rem] resize-y leading-relaxed`} value={s.waTemplate} onChange={(e) => set({ waTemplate: e.target.value })} />
        </Label>
        {s.waTemplate.trim() !== defaults.waTemplate && defaults.waTemplate && (
          <button type="button" className="mt-1 min-h-11 text-sm font-semibold" style={{ color: SOFT }} onClick={() => set({ waTemplate: defaults.waTemplate })}>
            Back to the original message
          </button>
        )}
        <div className="mt-3 rounded-2xl bg-[#e7f3e6] p-3 text-[0.92rem] leading-relaxed" style={{ color: INK }}>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: SOFT }}>
            Beat would get
          </p>
          <p className="whitespace-pre-wrap break-words">{preview}</p>
        </div>
      </div>
      <Check checked={s.allowDownload} onChange={(on) => set({ allowDownload: on })}>
        <span className="font-semibold" style={{ color: INK }}>
          Let partners download the PDF, by default
        </span>
        <span className="block text-sm" style={{ color: SOFT }}>
          You can still change it for each letter when you publish.
        </span>
      </Check>
      <Err>{error}</Err>
      <Note>{saved ? "Saved." : ""}</Note>
      <Btn
        kind="primary"
        onClick={() =>
          void api.saveSettings(s).then(
            (r) => {
              setS(r.settings);
              onSaved(r.settings);
              setSaved(true);
              setError("");
            },
            (e) => setError(msg(e)),
          )
        }
      >
        Save settings
      </Btn>
    </Box>
  );
}
