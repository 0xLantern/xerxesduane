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
 * Detailed challenge briefs (who a track serves, research, data sources)
 * go to registered teams privately, never onto this page. The page keeps
 * a public summary of the seven challenges and says the full brief
 * comes privately.
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
    "Join #HACK2026 Dubai, part of the global Christian hackathon run by Indigitous. Over six weeks, small teams take on seven challenges: a free, private website kit in Arabic and English, and four community apps for churches and the people they serve.",
  /** The #HACK Champions leading Dubai, as the invitation signs it. */
  champions: ["Xerxes Duane", "Abel Thomas"],
  global: "https://hack.indigitous.org/",
  /**
   * Who may join. Said plainly in the header, the "who it's for" section and
   * the FAQ: #HACK2026 Dubai is a gathering of Christians, not an outreach.
   */
  audience: "For Christians only",
  audienceNote: "#HACK2026 Dubai is for Christians only: followers of Jesus who want to use their skills for God.",
  /** The page's own address, for the share message and the calendar file. */
  url: "https://ministry.xerxesduane.com/hack",
  /**
   * Every gathering as one calendar file. Written by scripts/hack-ics.mjs
   * from EVENTS on every build, so it can never disagree with the page.
   */
  calendarFile: "/hack/hack2026-dubai.ics",
};

/**
 * "Hack" sounds like breaking into computers to some people. This section
 * says what the word means here, that hackathons are ordinary in the UAE,
 * and that #HACK is the Christian version of one.
 */
export const WHAT_IS = {
  eyebrow: "New to hackathons?",
  title: "It's not about breaking into computers.",
  definition: { word: "hack", say: "/hak/", kind: "noun", meaning: "A clever technique for improving something." },
  points: [
    {
      title: "Hack plus marathon",
      body: "A hackathon is a short, focused stretch where people with different skills form small teams and build something useful together. Designers, writers and testers matter as much as coders.",
    },
    {
      title: "Ordinary across the UAE",
      body: "Universities, schools and companies across the country run hackathons. The national UAE Hackathon, run by the TDRA, invites school students, university students, government teams and startups to solve real challenges.",
      link: { href: "https://hackathon.ae/", label: "hackathon.ae" },
    },
    {
      title: "#HACK is the Christian version",
      body: "Every year since 2016, Indigitous has gathered followers of Jesus in cities around the world to use their skills for good. In Dubai, our teams build a free website kit and four community apps for churches and faith sites.",
      link: { href: "https://hack.indigitous.org/", label: "hack.indigitous.org" },
    },
  ],
};

/** What the "invite a friend" button sends. Keep it to what the page says. */
export const INVITE_MESSAGE =
  "Come build with me at #HACK2026 Dubai, a six-week hackathon for Christians. You don't need to code: designers, writers, video makers and testers are all needed. Online kickoff Thu 8 Oct, 8pm. Register by Mon 12 Oct:";

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
  "2026-10-29": "The main build under way, and the website kit's page structure settled",
  "2026-11-05": "Halfway: your work ready for a safety check",
  "2026-11-12": "Finished and tested by real people outside your team",
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
      { time: "8:35", what: "The seven challenges" },
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

export type TrackId = "kit" | "apps";

export interface Challenge {
  n: number;
  track: TrackId;
  title: string;
  /** A few words under the title. */
  tag: string;
  build: string;
  /** The team the brief asks for. */
  team: string;
}

/**
 * The two tracks, from "HACK_Dubai_Challenges.pptx" (7 Oct 2026).
 *
 * PUBLIC SUMMARY ONLY. The deck's full briefs (threat models, ground rules,
 * legal notes, who each kit challenge is ultimately for) go to registered
 * teams privately. This page says what each team builds and who it needs,
 * nothing more. Keep it that way when the deck changes.
 */
export const TRACKS: { id: TrackId; label: string; title: string; lede: string }[] = [
  {
    id: "kit",
    label: "Part one",
    title: "The website kit",
    lede: "Three teams of four, each building one part of a free, private website kit for faith sites. Sample content only throughout.",
  },
  {
    id: "apps",
    label: "Part two",
    title: "Community apps",
    lede: "Four apps for churches, ministries and the people they serve, each tested with partner churches by 21 November.",
  },
];

export const CHALLENGES: Challenge[] = [
  {
    n: 1,
    track: "kit",
    title: "Start where they are",
    tag: "The journey site",
    build:
      "A home page that opens with a question, a picker of feeling-words, and one short journey behind each: a question, a short video, a passage and a reflection. Arabic first, fast on a cheap phone, and easy for a non-developer to add more.",
    team: "Developer, designer, Arabic writer, video editor",
  },
  {
    n: 2,
    track: "kit",
    title: "A question without a name",
    tag: "Ask without giving a name",
    build:
      "Ask a question and get a real person's reply, with no name, email or account: a short code to come back with, and a private inbox for whoever answers.",
    team: "Two developers, a reviewer, a plain-language privacy writer",
  },
  {
    n: 3,
    track: "kit",
    title: "Safe to visit, easy to find",
    tag: "Two problems, one build",
    build:
      "A quick-exit button, a page on reading safely and an offline copy, plus pages that search engines, screen readers and keyboards all understand.",
    team: "Developer, front-end builder, writer, tester",
  },
  {
    n: 4,
    track: "apps",
    title: "Sojourn",
    tag: "Find your people",
    build:
      "A welcome app for young Christians new to the UAE: find a youth group in your language, a welcome buddy and events, without pulling anyone from a church they already belong to.",
    team: "7 to 9: product lead, developers, designer, writer, church liaisons",
  },
  {
    n: 5,
    track: "apps",
    title: "Serve",
    tag: "Find a place to serve",
    build:
      "Connects churches and ministries that need posters, videos, websites or music with skilled Christians who would gladly help. Contact details are shared only when both sides accept.",
    team: "6 to 8: product lead, developers, designer, writer, ministry liaisons",
  },
  {
    n: 6,
    track: "apps",
    title: "Steady",
    tag: "Care for students",
    build:
      "A wellbeing app for adult students: honest Christian content, simple self-care tools kept on the phone, and an easy way to talk to a trusted person. Every piece is reviewed by a licensed professional.",
    team: "7 to 9: product lead, licensed professional, developers, writers, designer",
  },
  {
    n: 7,
    track: "apps",
    title: "Provision",
    tag: "Find real work",
    build:
      "A trusted job network for churches: verified members post real openings, seekers tap \"I'm interested\", and scam checks keep everyone safe. It never charges anyone.",
    team: "6 to 8: product lead, developers, designer, writer, church liaisons",
  },
];

export const TOOLS = "GitHub and Astro for code, Figma and Canva for design, CapCut for video.";

/**
 * The "Get ready for 17 October" panel. Visible until the team dinner ends,
 * then it steps aside. Ticks on the checklist are kept in the visitor's own
 * browser only; nothing is sent anywhere.
 */
export const GET_READY = {
  title: "Get ready for 17 October",
  lede: "The team dinner is where teams form and plan. Five minutes now makes the evening easier.",
  /** Bump the version if the checklist items change, so old ticks don't carry over. */
  storageKey: "hack2026-dubai-ready-v1",
  checklist: [
    { id: "register", text: "Register and pay the AED 30 by Monday 12 October." },
    { id: "kickoff", text: "Join the online kickoff on Thursday 8 October at 8pm." },
    {
      id: "github",
      text: "Create a free GitHub account with your personal email, not a work one.",
      link: { href: "https://github.com/signup", label: "github.com/signup" },
    },
    { id: "poll", text: "Vote for your top two challenges in the poll sent after the kickoff." },
    { id: "address", text: "Save the address when it arrives privately, and keep it to yourself." },
    { id: "cant", text: "Can't make it? Message Xerxes or Abel so we can place you in a team." },
  ],
  bring: [
    "Your laptop and its charger, fully charged",
    "Your phone, signed in to GitHub",
    "Something to write on, or your favourite notes app",
    "An appetite: dinner is served at 6pm",
    "Optional: a sketch, idea or link that inspired you for your top challenge",
  ],
  tips: [
    { title: "Come curious, not perfect", body: "Nobody expects you to know everything. Most people learn something new at their first hackathon." },
    { title: "Say what you bring", body: "Tell your team what you're good at and what you'd like to learn. Both help them plan." },
    { title: "Small and working wins", body: "Something small that works on 21 November beats something big that doesn't." },
    { title: "Ask early", body: "Stuck for more than half an hour? Ask your team or a Champion. That's what check-ins are for." },
    { title: "Keep it quiet", body: "Arrive and leave quietly, and keep photos and posts off social media." },
  ],
};

export const STEPS = [
  { title: "Register", body: `Fill in the form and pay the ${REGISTRATION.fee} by ${REGISTRATION.closesLabel}.` },
  { title: "Set up GitHub", body: "Create a free GitHub account before 17 October, using your personal email, not a work one." },
  { title: "Pick your top two", body: "Read the seven challenges and think about your top two. You choose in a poll after the kickoff." },
  { title: "Can't make 17 October?", body: "Message Xerxes or Abel. We'll place you in a team and catch you up." },
];

export const JUDGING = {
  intro: "Start with two answers: what is it, and why does it matter? Then show it working, live, not slides.",
  criteria: ["Does it work?", "Does it help people?", "Could it really be used?", "How well did the team work together?"],
  musts: ["It works, shown live and tested by real people, not slides", "It passes our safety check", "Website kit teams: it works properly in Arabic, right to left"],
};

export const GROUND_RULES = [
  "Website kit teams use sample content only. Everyone works on their own laptop and personal accounts.",
  "No photos, posts, stories or location tags from our gatherings, and don't name anyone who was there.",
  "Don't share the address or the host's name. Arrive and leave quietly.",
  "Use AI to help write code, not content. Pause before you prompt.",
  "If you'll miss a check-in, tell your team lead beforehand.",
];

export const IF_ASKED =
  "They're free tools for churches and faith sites, built at a Christian hackathon.";

export const FAQS = [
  {
    q: "Who can join?",
    a: "Christians only: followers of Jesus who want to use their skills for God. You don't need to be a programmer.",
  },
  {
    q: "Is this about hacking into systems?",
    a: "No. Here \"hack\" means a clever fix. Teams build new tools from scratch, and nobody touches anyone else's systems.",
  },
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
    a: "The website kit uses sample content only and doesn't go live during the program. The community apps are tried out with partner churches, and each church decides what happens next.",
  },
  {
    q: "What is #HACK?",
    a: "A worldwide Christian hackathon run by Indigitous, where local Champions bring teams together in their own city to build technology for God's mission.",
  },
];
