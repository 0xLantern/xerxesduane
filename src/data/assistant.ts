/**
 * Copy for the site assistant widget.
 *
 * All of it lives here so the assistant can be renamed, re-voiced or
 * translated without touching the component. Everything is bilingual because
 * the site is — the Arabic strings are what an `/ar/*` visitor sees, and the
 * endpoint is told to answer in the language it was asked in.
 *
 * Deliberately absent: any availability or status claim. The header says what
 * the assistant *is* and where its answers come from, not that anyone is
 * "online" — that would be a promise the site can't keep.
 *
 * Two assistants share the widget. The site assistant answers from the
 * business pages; the ministry assistant exists only on /ministry and answers
 * from that page alone (see api/ministry-assistant.ts). `assistantConfig`
 * picks between them.
 */
import { CONTACT } from "./contact";

export type AssistantVariant = "site" | "ministry";

export interface AssistantCopy {
  /** Header title. */
  name: string;
  /** Header subtitle — what it is and where answers come from. */
  role: string;
  /** First message in the transcript, shown before anything is sent. */
  greeting: string;
  /** Chips under the greeting. Sent verbatim when tapped. */
  prompts: string[];
  openLabel: string;
  closeLabel: string;
  placeholder: string;
  sendLabel: string;
  /** Persistent handoff row above the composer. */
  whatsapp: string;
  /** The second handoff: the audit booking, or email on /ministry. */
  book: string;
  /** Shown under the composer. */
  disclaimer: string;
  /** Network / server failures. */
  error: string;
  thinking: string;
  /** Screen-reader announcement when a reply finishes. */
  replied: string;
  restart: string;
}

/**
 * The assistant's name. Short, clearly not Xerxes himself, and the one string
 * most likely to change — it appears in the header and nowhere else.
 */
const NAME_EN = "Xen";
const NAME_AR = "زين";

export const ASSISTANT_EN: AssistantCopy = {
  name: NAME_EN,
  role: "AI assistant · answers from this site",
  greeting:
    `Hi, I'm ${NAME_EN}. I'm the assistant on Xerxes's site: ask me about the work, how a project runs, or how to get started. ` +
    "For anything I can't answer, WhatsApp is right below.",
  prompts: ["What does Xerxes build?", "How does pricing work?", "How do I get started?"],
  openLabel: "Ask a question about this site",
  closeLabel: "Close the assistant",
  placeholder: "Ask a question…",
  sendLabel: "Send",
  whatsapp: "Chat on WhatsApp",
  book: "Book a free audit",
  disclaimer: "Answers come from this site and can be wrong. Chats aren't stored.",
  error: "That didn't go through. Try again, or message on WhatsApp for a real reply.",
  thinking: "Reading the site…",
  replied: "Assistant replied",
  restart: "Start over",
};

export const ASSISTANT_AR: AssistantCopy = {
  name: NAME_AR,
  role: "مساعد ذكي · يجيب من هذا الموقع",
  greeting:
    `مرحبًا، أنا ${NAME_AR}، المساعد على موقع Xerxes. اسألني عن الخدمات، أو كيف يسير المشروع، أو كيف تبدأ. ` +
    "ولأي سؤال لا أستطيع الإجابة عنه، واتساب في الأسفل.",
  prompts: ["ما الذي يقدّمه Xerxes؟", "كيف تُحدَّد الأسعار؟", "كيف أبدأ؟"],
  openLabel: "اسأل عن هذا الموقع",
  closeLabel: "أغلق المساعد",
  placeholder: "اكتب سؤالك…",
  sendLabel: "إرسال",
  whatsapp: "تواصل عبر واتساب",
  book: "احجز تدقيقًا مجانيًا",
  disclaimer: "الإجابات مأخوذة من هذا الموقع وقد تكون غير دقيقة. المحادثات لا تُحفظ.",
  error: "لم يتم الإرسال. حاول مرة أخرى، أو راسلنا على واتساب.",
  thinking: "أقرأ الموقع…",
  replied: "ردّ المساعد",
  restart: "ابدأ من جديد",
};

export const assistantCopy = (locale: "en" | "ar"): AssistantCopy =>
  locale === "ar" ? ASSISTANT_AR : ASSISTANT_EN;

/**
 * The WhatsApp handoff message.
 *
 * When the visitor has already asked something, carry it across — arriving in
 * the inbox with the question attached saves them retyping it and saves Xerxes
 * a round trip. Clamped because the whole thing rides in a URL.
 */
export function whatsappText(locale: "en" | "ar", question?: string): string {
  const q = question?.trim().slice(0, 180);
  if (locale === "ar") {
    return q
      ? `مرحبًا Xerxes، كنت أتصفّح موقعك وسألت: «${q}»`
      : "مرحبًا Xerxes، أودّ معرفة المزيد.";
  }
  return q
    ? `Hi Xerxes, I was on your site and asked: "${q}"`
    : "Hi Xerxes, I'd like to learn more.";
}

/**
 * The ministry assistant, on /ministry only. English, because the page is.
 *
 * No persona name: it is plainly "the assistant on this page", so nobody
 * mistakes it for Xerxes or for a pastor they are confiding in.
 */
export const MINISTRY_ASSISTANT: AssistantCopy = {
  name: "Ministry assistant",
  role: "AI assistant · answers from this page",
  greeting:
    "Hi! I can tell you about Xerxes's ministry: his story, how he serves churches and leaders, and how to pray or partner with him. " +
    "For anything I can't answer, WhatsApp is right below.",
  prompts: ["How can Xerxes serve our church?", "How did he come to Dubai?", "How can I pray or partner?"],
  openLabel: "Ask about Xerxes's ministry",
  closeLabel: "Close the assistant",
  placeholder: "Ask about the ministry…",
  sendLabel: "Send",
  whatsapp: "WhatsApp Xerxes",
  book: "Email Xerxes",
  disclaimer: "Answers come from this page and can be wrong. Chats aren't stored.",
  error: "That didn't go through. Try again, or message Xerxes on WhatsApp.",
  thinking: "Reading the page…",
  replied: "Assistant replied",
  restart: "Start over",
};

function ministryWhatsappText(question?: string): string {
  const q = question?.trim().slice(0, 180);
  return q
    ? `Hi Xerxes, I was on your ministry page and asked: "${q}"`
    : "Hi Xerxes, I saw your ministry page and would love to connect.";
}

export interface AssistantConfig {
  copy: AssistantCopy;
  /** The endpoint the chat streams from. */
  endpoint: string;
  /** Text the WhatsApp handoff opens with, carrying the last question. */
  whatsappText: (question?: string) => string;
  /** The second handoff button. */
  secondary: { href: string; icon: "calendar" | "mail"; external: boolean };
}

export function assistantConfig(variant: AssistantVariant, locale: "en" | "ar"): AssistantConfig {
  if (variant === "ministry") {
    return {
      copy: MINISTRY_ASSISTANT,
      endpoint: "/api/ministry-assistant",
      whatsappText: ministryWhatsappText,
      secondary: {
        href: `mailto:${CONTACT.email}?subject=${encodeURIComponent("Serving together")}`,
        icon: "mail",
        external: false,
      },
    };
  }
  return {
    copy: assistantCopy(locale),
    endpoint: "/api/assistant",
    whatsappText: (question) => whatsappText(locale, question),
    secondary: { href: CONTACT.calendar, icon: "calendar", external: true },
  };
}
