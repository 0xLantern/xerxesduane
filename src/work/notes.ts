/**
 * Notes as separate points, so a long note reads as a list rather than a
 * wall of text. Lines (or "- " bullets) are points; a single long paragraph
 * is split at its sentences.
 */
export function notePoints(notes: string): string[] {
  const lines = notes
    .split(/\n+/)
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
  return lines.flatMap((l) => (l.length > 160 ? l.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/) : [l])).map((p) => p.trim()).filter(Boolean);
}
