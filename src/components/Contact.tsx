import { useCallback, useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import { useForm, ValidationError } from "@formspree/react";
import { ArrowUpRight, CalendarCheck, Check, Mail, MapPin, MessageCircle } from "lucide-react";
import { CONTACT, AUDIT_STEPS, AUDIT_DELIVERABLES } from "../data/content";
import { track } from "../lib/analytics";
import Reveal from "./ui/Reveal";
import GoogleRating from "./GoogleRating";

export default function Contact({ compact = false }: { compact?: boolean } = {}) {
  const [form, setForm] = useState({ name: "", business: "", email: "", phone: "", note: "" });
  const [source, setSource] = useState({ page: "", referrer: "" });
  const [state, handleSubmit] = useForm(CONTACT.formspreeId);

  const update = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Capture where the lead came from, so every enquiry is attributable.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only init; intentional SSR-safe pattern
    setSource({
      page: window.location.pathname + window.location.search,
      referrer: document.referrer || "direct",
    });
  }, []);

  useEffect(() => {
    if (state.succeeded) {
      track("generate_lead", { method: "formspree", page: source.page });
    }
  }, [state.succeeded, source.page]);

  // The funnel only had its last step. Without a start and a failure event
  // there is no way to tell "nobody opens the form" apart from "people open it
  // and give up", which are opposite problems with opposite fixes.
  //
  // Every event below carries field *names* and error *codes* only. No value a
  // visitor typed, and no message text, is ever passed to analytics.
  const started = useRef(false);
  const onFirstFocus = useCallback(() => {
    if (started.current) return;
    started.current = true;
    track("form_start", { form_id: "audit", page: source.page });
  }, [source.page]);

  // `invalid` does not bubble, so this has to run on the capture phase to see
  // a child field fail the browser's own required/type checks.
  const onFieldInvalid = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      // The handler sits on the form, so `target` is the field that failed.
      const el = e.target as HTMLInputElement | HTMLTextAreaElement;
      const field = el.name;
      const validity = el.validity;
      track("form_error", {
        form_id: "audit",
        page: source.page,
        source: "browser",
        field,
        reason: validity.valueMissing ? "missing" : validity.typeMismatch ? "format" : "other",
      });
    },
    [source.page],
  );

  // Formspree rejections, which land after the browser has already passed the
  // submission. Codes are Formspree's own enum values, not message text.
  useEffect(() => {
    if (!state.errors) return;
    const fields = state.errors.getAllFieldErrors().map(([field]) => String(field));
    const codes = [
      ...state.errors.getFormErrors().map((err) => err.code),
      ...state.errors.getAllFieldErrors().flatMap(([, errs]) => errs.map((err) => err.code)),
    ];
    track("form_error", {
      form_id: "audit",
      page: source.page,
      source: "server",
      fields: fields.join(","),
      codes: codes.join(","),
    });
  }, [state.errors, source.page]);

  // Formspree's <ValidationError> renders a bare <div> — no role, no aria-live,
  // and no association to the input it describes (verified by reading
  // @formspree/react's bundled source). So a screen-reader user got no
  // announcement when a submission was rejected, and no way to tell which
  // field the message belonged to. It does spread extra props onto that div,
  // which is enough to fix both from here.
  const fieldHasError = (name: string) =>
    Boolean(state.errors && state.errors.getFieldErrors(name).length > 0);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    track("form_submit", { form_id: "audit", page: source.page });
    void handleSubmit(e);
  };

  const whatsappMessage = [
    `Hi Xerxes, I'd like to book a free systems audit.`,
    ``,
    `Name: ${form.name}`,
    `Business: ${form.business}`,
    form.email ? `Email: ${form.email}` : "",
    `Phone: ${form.phone}`,
    form.note ? `On my mind: ${form.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const whatsappHref = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(whatsappMessage)}`;

  // Tighter fields from the board breakpoint up, compact only. Five of them
  // plus their labels and gaps set the height of the contact page's taller
  // column, and 35px was the whole difference between fitting a laptop screen
  // and not. Untouched below it, where the input is a touch target.
  const field = `w-full rounded-xl border border-cream/10 bg-ink-deep/50 px-4 text-[15px] text-cream placeholder:text-muted-dark transition-colors focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/40 ${
    compact ? "py-2 board:py-1.5" : "py-3"
  }`;

  return (
    <section id="contact" className={compact ? "scroll-mt-24" : "scroll-mt-24 py-20 sm:py-28"}>
      <div className="container-bl">
        <div className={`glass border-glow grid overflow-hidden rounded-3xl lg:grid-cols-2 ${compact ? "gap-4 p-4 board:grid-cols-[1.1fr_0.9fr] lg:gap-6" : "gap-10 p-7 sm:p-10 lg:gap-14"}`}>
          {/* Left: pitch + contacts */}
          <Reveal>
            <span className="eyebrow">
              <span className="h-px w-6 bg-gold/60" aria-hidden />
              Free Business Systems Audit
            </span>
            <h2 className={compact ? "mt-2 board:mt-1.5 text-2xl board:text-xl" : "mt-4 text-3xl sm:text-4xl"}>
              Just curious what{" "}
              <span className="text-gradient-gold">I'd say?</span>
            </h2>
            <p className={compact ? "mt-2 board:mt-1.5 max-w-md text-sm text-muted board:text-[0.83rem] board:leading-[1.45]" : "mt-4 max-w-md text-muted"}>
              60 minutes, zero pressure. You walk away with a clear map of your
              systems and three quick wins you can use right away.
            </p>

            <p className={`font-display text-xs font-extrabold uppercase tracking-[0.16em] text-accent-deep board:text-[0.68rem] ${compact ? "mt-4 board:mt-2.5" : "mt-8"}`}>What happens next</p>
            <ol className={compact ? "mt-2 board:mt-1.5 grid gap-1 board:gap-0.5 sm:grid-cols-2 board:grid-cols-1" : "mt-3 space-y-4"}>
              {AUDIT_STEPS.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm text-cream-dim board:text-[0.8rem] board:leading-[1.35]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-ink">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>

            <div className={`rounded-2xl border border-cream/10 bg-ink-deep/40 ${compact ? "mt-3 board:mt-2 p-3 board:p-2.5" : "mt-6 p-4"}`}>
              <p className="font-display text-xs board:text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-accent-deep">You walk away with</p>
              <ul className={compact ? "mt-2 board:mt-1.5 grid gap-1 board:gap-0.5 sm:grid-cols-2 board:grid-cols-1" : "mt-2.5 space-y-1.5"}>
                {AUDIT_DELIVERABLES.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-cream-dim board:text-[0.8rem] board:leading-[1.35]">
                    <Check size={14} className="mt-0.5 shrink-0 text-gold" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={CONTACT.calendar}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2.5 rounded-full border border-gold/30 bg-gold/10 px-5 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/15 board:py-2 board:text-[0.8rem] ${compact ? "mt-4 board:mt-2.5" : "mt-8"}`}
            >
              <CalendarCheck size={17} />
              Prefer to pick a time? Book instantly
            </a>

            <div className={`text-sm ${compact ? "mt-3 board:mt-2 flex flex-wrap gap-x-5 gap-y-0" : "mt-8 flex flex-col gap-1"}`}>
              <a
                href={`https://wa.me/${CONTACT.whatsapp}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2.5 py-1 text-cream transition-colors hover:text-gold"
              >
                <MessageCircle size={16} className="text-gold" />
                {CONTACT.whatsappDisplay}
              </a>
              <a
                href={`mailto:${CONTACT.email}`}
                className="inline-flex items-center gap-2.5 py-1 text-cream transition-colors hover:text-gold"
              >
                <Mail size={16} className="text-gold" />
                {CONTACT.email}
              </a>
              <span className="inline-flex items-center gap-2.5 py-1 text-muted">
                <MapPin size={16} className="text-gold" />
                {CONTACT.location}
              </span>
            </div>

            <GoogleRating className={compact ? "mt-4 board:mt-2.5" : "mt-8"} />
          </Reveal>

          {/* Right: form, or success state */}
          {state.succeeded ? (
            <div role="status" aria-live="polite" className="flex flex-col justify-center rounded-2xl bg-ink-deep/40 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
                <CalendarCheck size={24} />
              </div>
              <h3 className="mt-5 font-display text-2xl text-cream">
                Got it, thank you.
              </h3>
              <p className="mt-3 text-muted">
                Your request is in. I'll confirm your audit time within a few
                hours. Want to skip ahead?
              </p>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-navy px-7 py-3.5 text-sm font-bold text-fg-onSolid transition duration-300 hover:bg-navy-hover"
              >
                <MessageCircle size={17} />
                Continue on WhatsApp now
              </a>
            </div>
          ) : (
            <m.form
              action={`https://formspree.io/f/${CONTACT.formspreeId}`}
              method="POST"
              onSubmit={onSubmit}
              onFocusCapture={onFirstFocus}
              onInvalidCapture={onFieldInvalid}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={compact ? "flex flex-col gap-2.5 board:gap-2" : "flex flex-col gap-4"}
            >
              <input type="hidden" name="_subject" value="New audit request from xerxesduane.com" />
              {/* Lead attribution: which page + referrer the enquiry came from */}
              <input type="hidden" name="page" value={source.page} />
              <input type="hidden" name="referrer" value={source.referrer} />
              {/* Honeypot: bots fill this; Formspree drops the submission. Hidden from humans + a11y tree. */}
              <input
                type="text"
                name="_gotcha"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              />
              <div>
                <label htmlFor="name" className="mb-1 block text-xs text-muted board:mb-0.5">
                  Your name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  value={form.name}
                  onChange={update("name")}
                  className={field}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label htmlFor="business" className="mb-1 block text-xs text-muted board:mb-0.5">
                  Your business and what you do <span className="text-muted-dark">(optional)</span>
                </label>
                <input
                  id="business"
                  name="business"
                  value={form.business}
                  onChange={update("business")}
                  className={field}
                  placeholder="Acme Translation, Arabic/English legal docs"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-xs text-muted board:mb-0.5">
                  Your email <span className="text-muted-dark">(optional)</span>
                </label>
                {/* Named `email` on purpose: Formspree uses a field with that
                    name as the notification's Reply-To, so a reply from the
                    inbox goes straight back to the sender. Optional, because
                    the promised reply channel is still WhatsApp. */}
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={update("email")}
                  className={field}
                  placeholder="you@yourbusiness.ae"
                  aria-invalid={fieldHasError("email") || undefined}
                  aria-describedby="email-error"
                />
                <ValidationError
                  field="email"
                  errors={state.errors}
                  id="email-error"
                  role="alert"
                  className="mt-1 text-xs text-gold"
                />
              </div>
              <div>
                <label htmlFor="phone" className="mb-1 block text-xs text-muted board:mb-0.5">
                  WhatsApp or phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={update("phone")}
                  className={field}
                  placeholder="+971 5X XXX XXXX"
                  aria-invalid={fieldHasError("phone") || undefined}
                  aria-describedby="phone-error"
                />
                <ValidationError
                  field="phone"
                  errors={state.errors}
                  id="phone-error"
                  role="alert"
                  className="mt-1 text-xs text-gold"
                />
              </div>
              <div>
                <label htmlFor="message" className="mb-1 block text-xs text-muted board:mb-0.5">
                  What's the one tech thing on your mind? <span className="text-muted-dark">(optional)</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={3}
                  value={form.note}
                  onChange={update("note")}
                  className={`${field} resize-none`}
                  placeholder="Our site doesn't bring in leads and our invoicing is a mess…"
                />
              </div>
              <ValidationError errors={state.errors} role="alert" className="text-xs text-gold" />
              <button
                type="submit"
                disabled={state.submitting}
                className="group mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-navy px-7 py-3.5 text-sm font-bold text-fg-onSolid shadow-solid transition duration-300 hover:bg-navy-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state.submitting ? "Sending…" : "Book my free systems audit"}
                {!state.submitting && <ArrowUpRight size={17} strokeWidth={2.5} />}
              </button>
              <p className="text-center text-xs text-muted-dark">
                I'll reply on WhatsApp within a few hours. No spam, ever.
              </p>
            </m.form>
          )}
        </div>
      </div>
    </section>
  );
}
