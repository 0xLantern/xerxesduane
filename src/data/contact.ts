/**
 * How to reach Xerxes. Imported by the site (through content.ts) and by the
 * edge endpoints directly, so it must stay free of imports.
 */
export const CONTACT = {
  whatsapp: "971543281995",
  whatsappDisplay: "+971 54 328 1995",
  email: "hi@xerxesduane.com",
  location: "Dubai, UAE",
  calendar: "https://zcal.co/xerxesduane/audit",
  formspreeId: "xrednbek",
};

/** A wa.me link that opens WhatsApp with `text` already typed. */
export function whatsappHref(text: string): string {
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;
}
