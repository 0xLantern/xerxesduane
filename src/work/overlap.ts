/**
 * Two entries overlap when one starts before the other ends. Billing the
 * same minutes twice is the one mistake the client would mind, so the
 * editor warns before saving, and the log marks any pair already in it.
 */
type Span = { id: string; start: number; end: number };

export function overlaps(a: Span, b: Span): boolean {
  return a.id !== b.id && a.start < b.end && b.start < a.end;
}

/** The entries in `all` that `span` overlaps (itself excluded). */
export function overlapping<T extends Span>(span: Span, all: T[]): T[] {
  return all.filter((e) => overlaps(span, e)).sort((a, b) => a.start - b.start);
}

/** The ids of every entry that overlaps another one. */
export function overlapIds(all: Span[]): Set<string> {
  const sorted = [...all].sort((a, b) => a.start - b.start);
  const out = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length && sorted[j].start < sorted[i].end; j++) {
      out.add(sorted[i].id);
      out.add(sorted[j].id);
    }
  }
  return out;
}
