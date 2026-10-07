/**
 * The name a partner is greeted by, from the name the Champion typed.
 *
 * Usually the first word: "Maria Santos" -> "Maria". But when the first word
 * is a title, the title alone isn't a name: "Pastor Bryan" -> "Pastor Bryan",
 * "Dr. Grace Lim" -> "Dr. Grace", "Kuya Jun" -> "Kuya Jun".
 *
 * Used by the panel's WhatsApp message (Owner.tsx) and by the partner page's
 * greeting and watermark (api/hack-partners/read.ts), so both always agree.
 * Keep this file free of imports: the edge function imports it too.
 */
const TITLES = new Set([
  "pastor", "ps", "ptr", "rev", "reverend", "fr", "father", "bishop", "apostle", "elder", "deacon", "evangelist",
  "dr", "doc", "doctor", "engr", "atty", "prof", "coach",
  "mr", "mrs", "ms", "miss", "sir", "madam", "maam", "ma'am",
  "bro", "brother", "sis", "sister", "kuya", "ate", "tito", "tita", "lola", "lolo", "manong", "manang",
  "uncle", "aunt", "auntie", "aunty",
]);

export function greetName(full: string): string {
  const words = full.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "friend";
  const first = words[0].toLowerCase().replace(/\.$/, "");
  return TITLES.has(first) && words.length > 1 ? `${words[0]} ${words[1]}` : words[0];
}
