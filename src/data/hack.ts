/**
 * #HACK2026 Dubai: everything the /hack page says, in one place.
 *
 * WHAT MAY GO HERE. Only what the participant invitation and the public
 * posters already say. The internal hack plan is for the core team and stays
 * out of this file: no venue or host, no names beyond the two Champions who
 * sign the invitation (Xerxes and Abel), no budget,
 * no trusted-track work, no target audiences beyond "churches and faith
 * sites". The page is unlisted (see UNLISTED_ROUTES in lib/seo.ts), but an
 * unlisted page is still a public page to anyone holding the link.
 *
 * NEXT YEAR. Change the dates, the form link and the copy here. The page
 * works out which gathering is next, and whether registration is still open,
 * from EVENTS and REGISTRATION at view time.
 */

/** Dubai is UTC+4 all year, so every time is written with its offset. */
export interface HackEvent {
  id: string;
  title: string;
  /** Start and end, ISO 8601 with +04:00. */
  start: string;
  end: string;
  /** Where, as a participant is told it. Never the address. */
  where: string;
  mode: "online" | "in person";
  /** The running order, when there is one worth printing. */
  program?: { time: string; what: string }[];
}

export const HACK = {
  year: 2026,
  city: "Dubai",
  title: "#HACK2026 Dubai",
  tagline: "You already have the skills. Let's use them for God.",
  lede:
    "Join #HACK2026 Dubai, part of the global Christian hackathon run by Indigitous. Over six weeks, small teams build a free website kit that churches and faith sites can use: simple pages, a private question box and safety features, in Arabic and English.",
  /** The #HACK Champions leading Dubai, as the invitation signs it. */
  champions: ["Xerxes Duane Magdaluyo", "Abel Thomas"],
  global: "https://hack.indigitous.org/",
};

/**
 * Who a guest can message, in the order HACK.champions names them. Numbers
 * are international format without the plus, as wa.me wants them. They only
 * appear inside wa.me links, never printed as text on the page.
 */
export const CHAMPION_CONTACTS = [
  { first: "Xerxes", whatsapp: "971543281995" },
  { first: "Abel", whatsapp: "971503454307" },
];

export const REGISTRATION = {
  url: "https://forms.gle/DT72svEkGvAx94A68",
  fee: "AED 30",
  /** Payment and registration close at the end of this day, Dubai time. */
  closes: "2026-10-12T23:59:59+04:00",
  closesLabel: "Monday 12 October",
  covers:
    "Your dinner on 17 October and 21 November, and the tools your team needs for six weeks: Claude Pro and Claude Max, Canva Pro, CapCut Pro and the other AI subscriptions we use.",
  pay: "Pay by cash or bank transfer. The details are sent after you register.",
  hardship:
    "If the fee is hard for you right now, message Xerxes or Abel privately. No reason needed; you're still welcome.",
};

const CHECK_IN_DATES = ["2026-10-22", "2026-10-29", "2026-11-05", "2026-11-12", "2026-11-19"];

/** What each team should have by each weekly check-in. */
export const CHECK_IN_GOALS: Record<string, string> = {
  "2026-10-22": "Your shared project set up and first screens started",
  "2026-10-29": "The main build under way, working in Arabic right to left",
  "2026-11-05": "Halfway: your work ready for a safety check",
  "2026-11-12": "Finished and tested on a phone, in Arabic and English",
  "2026-11-19": "A practice run of your presentation, with everything saved in the shared project",
};

/**
 * No program names prayer or devotion, on purpose: a public
 * page should not advertise religious gatherings at a private home in the
 * UAE. Participants hear the full running order from the Champions.
 */
export const EVENTS: HackEvent[] = [
  {
    id: "kickoff",
    title: "Online kickoff",
    start: "2026-10-08T20:00:00+04:00",
    end: "2026-10-08T21:15:00+04:00",
    where: "Google Meet, link sent after you register",
    mode: "online",
    program: [
      { time: "8:00", what: "Welcome, a quiet moment to begin, and introductions by first name" },
      { time: "8:10", what: "What #HACK is and what we're building" },
      { time: "8:25", what: "The ground rules" },
      { time: "8:35", what: "The four challenges" },
      { time: "8:55", what: "Questions" },
      { time: "9:05", what: "Next steps and a send-off. The challenge poll is sent after the call." },
    ],
  },
  {
    id: "team-dinner",
    title: "Team dinner: form teams and plan",
    start: "2026-10-17T18:00:00+04:00",
    end: "2026-10-17T21:00:00+04:00",
    where: "A home in Dubai, address sent privately",
    mode: "in person",
    program: [
      { time: "6:00", what: "Arrive and have dinner" },
      { time: "6:30", what: "Welcome and a quiet moment to begin" },
      { time: "6:50", what: "Meet your team, choose a team lead, and agree everyone's role" },
      { time: "7:10", what: "Define your challenge: the problem, what you'll build, and what success looks like on 21 November" },
      { time: "8:00", what: "Plan the weeks: tasks, owners, your first milestone, and when your team will meet" },
      { time: "8:30", what: "Each team shares its one-line goal (2 minutes)" },
      { time: "8:45", what: "A send-off for the teams; close at 9:00" },
    ],
  },
  ...CHECK_IN_DATES.map((date, i) => ({
    id: `check-in-${i + 1}`,
    title: `Weekly check-in ${i + 1} of ${CHECK_IN_DATES.length}`,
    start: `${date}T20:00:00+04:00`,
    end: `${date}T20:30:00+04:00`,
    where: "Google Meet",
    mode: "online" as const,
  })),
  {
    id: "presentations",
    title: "Presentations and dinner",
    start: "2026-11-21T18:00:00+04:00",
    end: "2026-11-21T21:00:00+04:00",
    where: "A home in Dubai, address sent privately",
    mode: "in person",
    program: [
      { time: "6:00", what: "Arrive and have dinner" },
      { time: "6:30", what: "Welcome and a quiet moment to begin" },
      { time: "6:40", what: "Team presentations: 5 minutes to show your work, 2 minutes for questions" },
      { time: "7:20", what: "Talk: \"Builders in a digital age\" (25 minutes, then 10 minutes in pairs)" },
      { time: "8:00", what: "What's next for each part of the kit, and tokens of thanks" },
      { time: "8:40", what: "A send-off for the teams; close at 9:00" },
    ],
  },
];

/** The four rows of the poster, for the at-a-glance table. */
export const AT_A_GLANCE = [
  { when: "Thu 8 Oct", time: "8:00 to 9:15pm", what: "Online kickoff", mode: "Online" },
  { when: "Sat 17 Oct", time: "6:00 to 9:00pm", what: "Team dinner: form teams and plan", mode: "In person" },
  { when: "Thursdays", time: "8:00 to 8:30pm", what: "Weekly check-in: 22 Oct, 29 Oct, 5 Nov, 12 Nov, 19 Nov", mode: "Online" },
  { when: "Sat 21 Nov", time: "6:00 to 9:00pm", what: "Presentations and dinner", mode: "In person" },
];

/** Straight from the poster, in its order. */
export const ROLES = [
  "Developers",
  "Designers",
  "Videographers",
  "Photographers",
  "Social media managers",
  "AI and data scientists",
  "Automation builders",
  "Marketers",
  "Writers",
  "Editors",
  "Gamers",
  "Willing hands",
];

export interface Challenge {
  n: number;
  title: string;
  build: string;
  fit: string;
}

/**
 * Word for word from the participant invitation. Do not add the "why" lines
 * from the Why-This-Kit sheet: it is marked "please don't post", and the
 * reasons behind each challenge are the part that says who the kit is for.
 */
export const CHALLENGES: Challenge[] = [
  {
    n: 1,
    title: "Start where they are",
    build:
      "A home page, a \"pick a feeling\" menu, and one short sample journey: a question, a short video, a passage, a reflection.",
    fit: "Developer, designer or video maker, Arabic speaker",
  },
  {
    n: 2,
    title: "A question without a name",
    build:
      "A private box to ask a question with no email or account, a code to come back for the reply, and an inbox for replies.",
    fit: "Two developers, one careful reviewer",
  },
  {
    n: 3,
    title: "Safe to visit",
    build: "A quick-exit button, a \"read this site safely\" page, an offline copy, and a fast site.",
    fit: "Developer, front-end builder, writer",
  },
  {
    n: 4,
    title: "Found by the people who are looking",
    build: "Pages search engines understand, that work with a screen reader or a keyboard only.",
    fit: "Search specialist, tester, researcher",
  },
];

export const TOOLS = "GitHub and Astro for code, Figma and Canva for design, CapCut for video.";

export const STEPS = [
  { title: "Register", body: `Fill in the form and pay the ${REGISTRATION.fee} by ${REGISTRATION.closesLabel}.` },
  { title: "Set up GitHub", body: "Create a free GitHub account before 17 October, using your personal email, not a work one." },
  { title: "Pick your top two", body: "Read the four challenges and think about your top two. You choose in a poll after the kickoff." },
  { title: "Can't make 17 October?", body: "Message Xerxes or Abel. We'll place you in a team and catch you up." },
];

export const JUDGING = {
  intro: "Start with two answers: what is it, and why does it matter? Then show it working, live, not slides.",
  criteria: ["Does it work?", "Does it help people?", "Could it really be used?", "How well did the team work together?"],
  musts: ["It works properly in Arabic, right to left", "It passes our safety check"],
};

export const GROUND_RULES = [
  "Use only sample content, on your own laptop and personal accounts.",
  "No photos, posts, stories or location tags from our gatherings, and don't name anyone who was there.",
  "Don't share the address or the host's name. Arrive and leave quietly.",
  "Use AI to help write code, not content. Pause before you prompt.",
  "If you'll miss a check-in, tell your team lead beforehand.",
];

export const IF_ASKED =
  "It's a free, private website template for faith sites that anyone can use, built at a Christian hackathon.";

export const FAQS = [
  {
    q: "Do I need to be a programmer?",
    a: "No. Every team needs designers, video makers, writers, testers and researchers as much as it needs code.",
  },
  {
    q: "How much time does it take?",
    a: "The four gatherings, plus about three to five hours a week with your team, at times your team chooses.",
  },
  {
    q: "Where is it?",
    a: "The kickoff and check-ins are on Google Meet. The two dinners are at a home in Dubai, and the address is sent privately to registered participants.",
  },
  {
    q: "Does anything we build go live?",
    a: "No. Teams use sample content only, and nothing goes live during the program.",
  },
  {
    q: "What is #HACK?",
    a: "A worldwide Christian hackathon run by Indigitous, where local Champions bring teams together in their own city to build technology for God's mission.",
  },
];
