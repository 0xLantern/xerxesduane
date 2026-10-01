import { useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import { ArrowUp, CalendarCheck, Mail, RotateCcw, X } from "lucide-react";
import { ChatGlyph } from "../ui/NavIcons";
import WhatsAppGlyph from "../ui/WhatsAppGlyph";
import { whatsappHref } from "../../data/contact";
import { assistantConfig, type AssistantVariant } from "../../data/assistant";
import { useAssistantChat } from "./useAssistantChat";

interface Props {
  locale: "en" | "ar";
  /** Which assistant: the business one, or the /ministry one. */
  variant: AssistantVariant;
  onClose: () => void;
  /** Focus returns here when the panel closes — see SiteAssistant. */
  labelledBy: string;
}

/** One message. The visitor's turns are the navy slab; the assistant's are cards. */
function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={
          mine
            ? "max-w-[85%] rounded-2xl rounded-ee-md bg-navy px-3.5 py-2.5 text-[0.9rem] leading-relaxed text-fg-onSolid"
            : "max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-es-md border border-line bg-panel px-3.5 py-2.5 text-[0.9rem] leading-relaxed text-fg shadow-pill"
        }
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The assistant's conversation surface.
 *
 * Two things here are deliberate rather than decorative:
 *
 * WhatsApp is pinned above the composer, not buried in a reply. The assistant
 * is grounded in the site and will refuse to invent a price or a timeline, so
 * a real prospect hits its limits quickly — and the moment they do, the way to
 * a human has to already be on screen. It carries their last question across,
 * so the handoff doesn't cost them a retype.
 *
 * The disclaimer is permanent, under the composer. It's a language model
 * reading marketing pages: it can be wrong, and saying so once at the top
 * where it scrolls away isn't saying so.
 */
export default function AssistantPanel({ locale, variant, onClose, labelledBy }: Props) {
  const config = assistantConfig(variant, locale);
  const { copy } = config;
  const { turns, pending, error, send, reset, lastQuestion } = useAssistantChat(
    config.endpoint,
    locale,
    copy.error,
  );
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Escape is bound on the document, not the panel: the visitor can click a
  // link on the page behind (this is a popover, not a modal) and still expect
  // Escape to close the chat.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Follow the stream. `scrollTop = scrollHeight` rather than scrollIntoView,
  // which would scroll the page behind the panel as well.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [turns, pending, error]);

  const submit = (text: string) => {
    setDraft("");
    void send(text);
    inputRef.current?.focus({ preventScroll: true });
  };

  const waHref = whatsappHref(config.whatsappText(lastQuestion));
  const finished = !pending && turns.length > 0 && turns[turns.length - 1].role === "assistant";

  return (
    <m.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      role="dialog"
      aria-labelledby={labelledBy}
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-3 z-[55] flex h-[min(32rem,calc(100dvh-9rem))] w-[calc(100vw-1.5rem)] max-w-[23.5rem] flex-col overflow-hidden rounded-[1.5rem] border border-line bg-canvas shadow-card-hover lg:bottom-7 lg:end-7 lg:h-[min(34rem,calc(100dvh-6rem))]"
    >
      {/* ---- who you're talking to ---- */}
      <header className="flex items-center gap-3 border-b border-line bg-panel px-4 py-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-accent text-accent-ink shadow-[0_6px_14px_-8px_rgb(var(--c-accent))]">
          <ChatGlyph size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span id={labelledBy} className="block truncate font-display text-[0.95rem] font-extrabold text-fg">
            {copy.name}
          </span>
          <span className="block truncate text-[0.72rem] leading-tight text-fg-faint">{copy.role}</span>
        </span>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={reset}
            aria-label={copy.restart}
            title={copy.restart}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-panel text-fg-soft transition hover:border-accent/45 hover:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
          >
            <RotateCcw size={16} strokeWidth={2.2} aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.closeLabel}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-panel text-fg-soft transition hover:border-accent/45 hover:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
        >
          <X size={16} strokeWidth={2.2} aria-hidden />
        </button>
      </header>

      {/* ---- transcript ----
          `data-lenis-prevent` keeps the site's inertia scroller from
          swallowing the wheel events that belong to this list. */}
      <div ref={logRef} data-lenis-prevent className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <Bubble role="assistant">{copy.greeting}</Bubble>

        {turns.length === 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {copy.prompts.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  onClick={() => submit(prompt)}
                  className="rounded-full border border-line bg-panel px-3 py-1.5 text-[0.8rem] font-bold text-fg-soft shadow-pill transition hover:-translate-y-px hover:border-accent/45 hover:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  {prompt}
                </button>
              </li>
            ))}
          </ul>
        )}

        {turns.map((turn, i) =>
          // The empty assistant turn that the stream is about to fill would
          // otherwise render as a bare bubble with nothing in it.
          turn.content ? (
            <Bubble key={i} role={turn.role}>
              {turn.content}
            </Bubble>
          ) : null,
        )}

        {pending && turns[turns.length - 1]?.content === "" && (
          <p className="flex items-center gap-1.5 ps-1 text-[0.8rem] text-fg-faint">
            {copy.thinking}
            <span className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </span>
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-accent/40 bg-accent-soft px-3 py-2 text-[0.82rem] leading-snug text-accent-deep">
            {error}
          </p>
        )}

        {/* Announced once the reply is complete — streaming every token into a
            live region would read the answer letter by letter. */}
        <p className="sr-only" aria-live="polite">
          {finished ? `${copy.replied}. ${turns[turns.length - 1].content}` : ""}
        </p>
      </div>

      {/* ---- the way to a human, always on screen ---- */}
      <div className="grid grid-cols-2 gap-2 border-t border-line bg-panel px-3 pt-3">
        <a
          href={waHref}
          target="_blank"
          rel="noopener"
          data-lenis-ignore
          className="flex items-center justify-center gap-2 rounded-xl bg-[#1FA855] px-3 py-2.5 text-[0.82rem] font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
        >
          <WhatsAppGlyph size={16} />
          {copy.whatsapp}
        </a>
        <a
          href={config.secondary.href}
          {...(config.secondary.external ? { target: "_blank", rel: "noopener" } : {})}
          data-lenis-ignore
          className="flex items-center justify-center gap-2 rounded-xl border border-line bg-panel px-3 py-2.5 text-[0.82rem] font-bold text-fg transition hover:border-accent/45 hover:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
        >
          {config.secondary.icon === "mail" ? (
            <Mail size={16} strokeWidth={2.2} aria-hidden />
          ) : (
            <CalendarCheck size={16} strokeWidth={2.2} aria-hidden />
          )}
          {copy.book}
        </a>
      </div>

      {/* ---- composer ---- */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
        className="bg-panel px-3 pb-1 pt-2"
      >
        <div className="flex items-center gap-2 rounded-full border border-line bg-canvas ps-4 pe-1.5 py-1.5 focus-within:border-accent/50">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={copy.placeholder}
            aria-label={copy.placeholder}
            maxLength={500}
            enterKeyHint="send"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[0.9rem] text-fg placeholder:text-fg-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            aria-label={copy.sendLabel}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
          >
            <ArrowUp size={17} strokeWidth={2.6} aria-hidden />
          </button>
        </div>
        <p className="px-2 py-2 text-center text-[0.68rem] leading-tight text-fg-faint">
          {copy.disclaimer}
        </p>
      </form>
    </m.div>
  );
}
