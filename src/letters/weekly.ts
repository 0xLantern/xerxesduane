/**
 * The weekly "what we're praying for" message, built from the open prayer
 * requests: shared by the desk (Prayer tab, Share on WhatsApp) and the
 * Monday email. Imports nothing, so both sides can use it.
 */
export function weeklyMessage(requests: string[], link: string): string {
  const lines = requests.map((t) => `• ${t.replace(/\s+/g, " ").trim()}`);
  return [
    "This week, would you pray with us for:",
    "",
    ...lines,
    "",
    "Photos and updates, and a place to say you've prayed:",
    link,
    "",
    "Thank you for standing with us. 🙏",
  ].join("\n");
}
