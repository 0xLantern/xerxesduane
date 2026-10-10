/**
 * "Suggest teams": a first draft for the Champions to adjust, never final.
 *
 * Everyone who has answered starts in their first choice. Then, smallest
 * first, any team below `min` people gives up: each member with a second
 * choice moves there. A team nobody can leave stays as it is. Repeats until
 * nothing moves. With about twenty people and seven challenges, some
 * challenges end up with no team, which is the point: the room's interest
 * decides which ones run.
 */
export function suggestTeams(
  people: { code: string; prefs?: { first: number; second: number | null } | null }[],
  min = 3,
): Map<string, number> {
  const answered = people.filter((p) => p.prefs);
  const team = new Map(answered.map((p) => [p.code, p.prefs!.first]));
  const settled = new Set<number>();

  for (let round = 0; round < 50; round++) {
    const counts = new Map<number, number>();
    for (const n of team.values()) counts.set(n, (counts.get(n) ?? 0) + 1);
    const small = [...counts.entries()]
      .filter(([n, c]) => c < min && !settled.has(n))
      .sort((a, b) => a[1] - b[1])[0];
    if (!small) break;
    const [n] = small;
    let moved = 0;
    for (const p of answered) {
      const second = p.prefs!.second;
      if (team.get(p.code) === n && second && second !== n) {
        team.set(p.code, second);
        moved++;
      }
    }
    if (!moved) settled.add(n);
  }
  return team;
}
