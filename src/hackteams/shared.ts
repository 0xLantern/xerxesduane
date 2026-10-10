/**
 * Shared by the team pages and their API (api/hack-teams/_lib.ts imports
 * these), so the choices the page offers are exactly the ones the server
 * accepts. Keep this file free of imports: the edge functions import it too.
 */

/** What a participant can say they bring. Short, so the panel can show them as chips. */
export const SKILLS = [
  "Code",
  "Design",
  "Writing",
  "Arabic",
  "Video",
  "Testing",
  "Leading a team",
  "Privacy and security",
  "Church connections",
  "Counselling or health",
] as const;
export type Skill = (typeof SKILLS)[number];

/** Hours a week they can give between 17 October and 21 November. */
export const HOURS = ["1 to 2", "3 to 5", "6 or more"] as const;
export type Hours = (typeof HOURS)[number];
