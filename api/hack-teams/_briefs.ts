// The seven detailed challenge briefs. SERVER ONLY.
//
// The public /hack page says what each team builds; these say who it is for,
// why, and the ground rules, which is why they are never on that page, in the
// repository's client code or in any bundle. A participant's browser gets
// their own team's brief from api/hack-teams/me only, once the Champions
// have announced the teams. Do not import this from anything under src/.
//
// Source: HACK_Dubai_Challenges.pptx (the challenge deck) and, for 05,
// HACK2026_Dubai_Challenge_05_Serve.md, the merged Serve and Kinship brief,
// since renamed Skills. Keep the numbers and titles in step with
// CHALLENGES in src/data/hack.ts.

export type Brief = {
  n: number;
  title: string;
  strap: string;
  challenge: string;
  /** The one thing a team most often gets wrong, said up front. */
  callout: { title: string; body: string };
  build: string;
  parts: { name: string; what: string }[];
  whoGets: { who: string; items: string[] }[];
  rules: { rule: string; detail: string }[];
  /** Only where the deck says; left out rather than guessed. */
  exists?: string;
  team: string[];
  by21: string[];
  measured?: string[];
  demo?: string[];
  /** Things this team should know about the rest of the lineup and the timeline. */
  notes: string[];
};

/** What the three website kit teams all need to know. */
const KIT_NOTES = [
  "Testing needs care. \"Outside the team\" means Arabic-speaking volunteers you trust, not real visitors. No real visitor touches any of this during the build.",
  "Everything rests on Challenge 01. Teams 02 and 03 build on its page structure, so Team 01 settles a structure by the 29 October check-in, even if it's still ugly.",
  "Nobody owns the content yet: the questions, reflections and passages, and a theological review of them. Give it a name and a date at the dinner.",
];

export const BRIEFS: Brief[] = [
  {
    n: 1,
    title: "Start where they are",
    strap: "The journey site",
    challenge:
      "Someone wondering about God starts with a feeling, not a doctrine question: tired, ashamed, afraid, alone. Most faith websites expect you to know what you're looking for.",
    callout: {
      title: "The system is the deliverable",
      body: "Journeys four, five and six must be easy to add. If adding one needs a developer, this dies when the team disperses.",
    },
    build: "A home page that opens with a question, a picker of feeling-words, and one short journey behind each word.",
    parts: [
      { name: "One question", what: "Where each journey begins." },
      { name: "One video", what: "60 to 90 seconds." },
      { name: "One passage", what: "A short reading." },
      { name: "One reflection", what: "A few lines to sit with." },
      { name: "Three doors", what: "Next steps, including a way to ask a question." },
    ],
    whoGets: [
      {
        who: "The visitor",
        items: [
          "A home page that opens with a question",
          "A feeling-word picker with few choices",
          "A journey: question, video, passage, reflection, three doors",
          "Arabic first, right to left, with an English switch",
          "Fast on a cheap phone",
        ],
      },
      {
        who: "Whoever runs it later",
        items: [
          "A content file per journey that a non-developer can edit",
          "A documented way to add a journey without touching code",
          "A style guide so new content matches old",
        ],
      },
      {
        who: "The video makers",
        items: [
          "Reusable project templates, not only finished videos",
          "Faceless: typography, hands, light, objects, landscape",
          "Arabic captions that render correctly",
          "Clear with the sound off",
        ],
      },
    ],
    rules: [
      { rule: "Sample content only", detail: "No real visitor's words anywhere." },
      { rule: "No faces, voices or recognisable places", detail: "In any video." },
      { rule: "No tracking", detail: "No tracking pixels, and no analytics that identify a person." },
      { rule: "Check every licence", detail: "Stock footage and fonts. Free is not always unrestricted." },
      { rule: "Watch for foreignness", detail: "Western-looking stock footage signals the site came from outside." },
    ],
    exists:
      "Faith-journey sites and courses for enquirers exist, Alpha among them. Arabic first, no sign-up, no tracking and easy to hand over is rarer. Search for half a day first.",
    team: ["Developer", "Designer", "Arabic writer", "Video editor"],
    by21: [
      "A live site on test content, in Arabic and English, demoed working",
      "Someone outside the team adds a new journey in under an hour, watched live",
      "Tested by at least three Arabic speakers who didn't build it",
    ],
    measured: ["Arabic reads naturally to a native speaker", "Loads in under 2 seconds on a phone", "The outside person managed to add a journey"],
    demo: ["Pick a feeling", "Walk one journey end to end", "Arrive at the door"],
    notes: KIT_NOTES,
  },
  {
    n: 2,
    title: "A question without a name",
    strap: "Ask a question. Get a real answer. No name, no account.",
    challenge:
      "Today there are two bad options: ask publicly and expose yourself, or sign up and trust a stranger with your identity.",
    callout: {
      title: "Be honest about scope",
      body: "The hardest of the three. Working but leaky is worse than unfinished. A careful prototype marked \"not for production\" is a success. And remember: a retrieval code is an identifier. So is a submission timestamp.",
    },
    build: "A box where someone writes a question and gets a short code. On the other side, a private inbox where a real person answers.",
    parts: [
      { name: "Write a question", what: "Or a prayer request." },
      { name: "Get a short code", what: "The only way back to the reply." },
      { name: "Come back later", what: "With the code, on any device." },
      { name: "Read a real reply", what: "From a real person." },
    ],
    whoGets: [
      {
        who: "The person asking",
        items: [
          "Two doors: ask a question, or ask for prayer",
          "No email, no account, no CAPTCHA",
          "Plain words on what is and isn't stored",
          "A one-time code to read the reply",
          "An age statement",
        ],
      },
      {
        who: "The person answering",
        items: [
          "An inbox with the minimum: chosen name, field, next step",
          "Flags: crisis, hostile, a minor, dependency",
          "A protective reply template for difficult cases",
          "Automatic deletion on a schedule",
        ],
      },
      {
        who: "The reviewer",
        items: [
          "A threat model: who might want this data, and how",
          "A data map: every field stored, why, and for how long",
          "A go or hold recommendation",
        ],
      },
    ],
    rules: [
      { rule: "Test data only", detail: "Never a real question from a real person, at any stage." },
      { rule: "No AI on visitors' words", detail: "AI never touches a question and never writes the answer." },
      { rule: "No lists of people", detail: "Store nothing that could become one." },
      { rule: "Free tier for the demo", detail: "Production hosting is a separate decision." },
      { rule: "Legal counsel first", detail: "Before any real message: where data is stored, and under whose jurisdiction." },
    ],
    exists:
      "In nearby fields, yes: anonymous tip tools such as SecureDrop, and anonymous feedback forms. Study how they handle return visits before inventing a scheme.",
    team: ["Two developers", "A reviewer", "A plain-language privacy writer"],
    by21: [
      "A working prototype on test data, demoed live",
      "A threat model and data map signed off, or marked for fixes, by a security reviewer",
      "Tested by outsiders asking test questions and reading the replies",
    ],
    measured: [
      "Can the reviewer name anything stored that could identify someone?",
      "If so, that is the finding, and a useful result",
    ],
    demo: ["Ask a question", "Receive a code", "Close the browser", "Come back", "Read the reply"],
    notes: KIT_NOTES,
  },
  {
    n: 3,
    title: "Safe to visit, easy to find",
    strap: "Two problems that look separate but are not",
    challenge:
      "Someone may be reading on a shared phone, or a device a family member checks. They need a fast way out, to understand the traces they leave, and to find the site at all.",
    callout: {
      title: "The hard part is the safety page",
      body: "Quick exit is an afternoon's work. The page on reading safely needs real research into shared devices, history and family access. Build both halves, or neither helps.",
    },
    build:
      "A site nobody can find helps nobody, and a site that's easy to find but unsafe to open is worse than nothing. Build both.",
    parts: [
      { name: "Easy to find", what: "Pages that search engines, screen readers and keyboards all understand." },
      { name: "Safe to open", what: "A quick exit, advice on reading safely, and an offline copy." },
    ],
    whoGets: [
      {
        who: "The visitor at risk",
        items: [
          "A quick-exit button on every page",
          "A plain-language page on reading safely, with advice for their device",
          "An offline copy that works without a connection",
          "Fast on a weak connection",
        ],
      },
      {
        who: "Someone searching",
        items: ["Pages structured so search engines understand them", "Honest page titles and descriptions", "Full keyboard and screen-reader support"],
      },
      {
        who: "The team maintaining it",
        items: ["A simple checklist anyone can run before publishing", "A speed and accessibility test that runs automatically"],
      },
    ],
    rules: [
      { rule: "No install links, no QR codes", detail: "Anywhere in the kit." },
      { rule: "No VPN recommendations", detail: "On any page." },
      { rule: "Privacy-respecting analytics only", detail: "Or none at all." },
      { rule: "The safety page is reviewed, not just shipped", detail: "False confidence is more dangerous than no advice." },
      { rule: "Stay clear of circumvention", detail: "Country-specific legal questions are for counsel to decide." },
    ],
    exists:
      "Yes. Domestic violence support sites have used quick exits and safety pages for years: borrow their practice. Accessibility and search are standard web practice.",
    team: ["Developer", "Front-end builder", "Writer", "Tester"],
    by21: [
      "Quick exit, the safety page, the offline build and speed all working, demoed live",
      "The safety page reviewed by an outsider with relevant knowledge",
      "Accessibility tested with a real keyboard and screen reader, not a tool score",
    ],
    measured: ["First paint under 1.5 seconds", "Fully usable by keyboard alone", "The safety page judged genuinely useful by the reviewer"],
    demo: ["Open the site", "Hit quick exit", "Show what someone checking the device sees"],
    notes: KIT_NOTES,
  },
  {
    n: 4,
    title: "Sojourn",
    strap: "A welcome app for young Christians new to the UAE",
    challenge: "Young Christians arrive in the UAE alone and don't know where a youth group in their language meets.",
    callout: {
      title: "Never pull people from their church",
      body: "Sojourn helps people find a fellowship, a buddy and events. It must never draw anyone away from a church they already belong to.",
    },
    build: "Help newcomers find a fellowship, a buddy and events, with every group verified by its own church leaders.",
    parts: [
      { name: "Welcome setup", what: "Languages, tradition (optional), and \"Already have a church?\"" },
      { name: "Find your people", what: "Youth groups verified by their own church leaders." },
      { name: "Events", what: "Youth gatherings, worship nights, sports." },
      { name: "Welcome buddy", what: "Same language group, with conversation starters." },
      { name: "First weeks guide", what: "Compounds, transport, service times." },
      { name: "Leader dashboard", what: "Each leader sees only their own group." },
    ],
    whoGets: [],
    rules: [
      { rule: "Verified groups only", detail: "Every group is confirmed by its own church leaders before it's listed." },
      { rule: "Safeguarding from day one", detail: "Buddy pairings and events involve young people: a safeguarding reviewer checks the flows." },
      { rule: "Leaders see their own group only", detail: "No leader can browse another church's people." },
    ],
    team: ["Product lead", "1 to 2 front-end developers", "1 back-end developer", "Designer and writer", "1 to 2 church liaisons", "Safeguarding reviewer (part-time)"],
    by21: ["A working app with 2 to 3 partner churches", "Their real youth groups listed", "A few real events", "A handful of tested buddy pairings"],
    demo: ["A newcomer arrives", "Finds a Malayalam fellowship", "Gets a buddy", "Sees Friday's football match"],
    notes: [
      "Sojourn and Skills both need logins, church verification and profiles. They could become one app, with Skills as a section inside Sojourn, saving about a week. Decide together on 17 October.",
    ],
  },
  {
    n: 5,
    title: "Skills",
    strap: "Serve the church, and find someone who can help",
    challenge:
      "Churches and small ministries need posters, videos, website fixes and musicians, and many skilled Christians would gladly help but don't know where. And a church of 500 a service is full of skills nobody can find: an accountant, a plumber, a mechanic, a teacher, a physio. A newcomer who needs one has no way to ask. Both are the same gap: the church can't see its own people's gifts.",
    callout: {
      title: "One profile, two sides",
      body: "Members serving the church, and members helping each other, share one verified profile. Contact details are shared only when both sides accept.",
    },
    build: "One app with two sides that share one verified profile. Free for churches to use, starting with one partner church.",
    parts: [
      { name: "Needs board", what: "Verified ministries post short, time-limited needs, unpaid or paid: \"poster for Friday\", \"sound for Sunday\"." },
      { name: "Offer and match", what: "A skilled member offers to help. Contact is shared only when both sides accept." },
      { name: "Skills quiz", what: "Helps people discover skills they didn't think counted." },
      { name: "Thank-you notes", what: "Finished jobs get a note that builds the helper's portfolio." },
      { name: "Find people", what: "Search members by skill, profession, language and area of the UAE." },
      { name: "What I offer", what: "Free help, a member discount, or normal paid work." },
      { name: "Ask to connect", what: "A request with a short note. Contact is shared only when the member accepts." },
      { name: "Verified sign-up", what: "A church leader, or two verified members, confirms each new member." },
      { name: "Church admin", what: "Leaders approve or remove members and ministries, handle reports and see simple counts." },
    ],
    whoGets: [
      { who: "The member", items: ["Opts in: nobody is listed unless they choose to be", "One profile for both sides; they choose what shows", "Can pause or delete their profile at any time"] },
      { who: "The ministry", items: ["Posts short needs that always end", "Sees offers from verified members only", "Thanks helpers when a job is done"] },
      { who: "The member looking for help", items: ["Searches by skill, profession, language or area", "Sees verified members only, each marked \"verified by your church\"", "Gets contact details once a request is accepted"] },
      { who: "The church", items: ["Approves, pauses or removes members and ministries", "Has a clear report button and a short code of conduct", "Sees counts only, never private requests"] },
    ],
    rules: [
      { rule: "Members only", detail: "No public search, and no page an outsider can browse." },
      { rule: "Opt-in and minimal", detail: "No Emirates ID, passport, home address or date of birth." },
      { rule: "Contact on consent", detail: "Phone and email are shared only when both sides accept." },
      { rule: "No export, no scraping", detail: "No \"download all members\" for anyone, admins included. Searches are rate-limited." },
      { rule: "Not a marketplace", detail: "No payments or commissions. Any payment is agreed directly, outside the app." },
      { rule: "Helpers stay in their own church", detail: "And every ministry request has an end date." },
      { rule: "Check the data rules in week 1", detail: "A directory of people is personal data under UAE law. Agree where it's stored and who can see it before real members join." },
    ],
    exists:
      "Church management tools such as Planning Center and ChurchSuite include member directories and volunteer rotas, and LinkedIn does skills search. None is free, skills-first, verified by your own church and built for the UAE. Spend half a day looking before you build.",
    team: ["Product lead", "2 full-stack developers", "Designer", "Writer (profile prompts, code of conduct, help text)", "1 to 2 church and ministry liaisons", "A privacy reviewer (part-time)"],
    by21: [
      "A working app piloted with one partner church",
      "3 to 5 real ministries and 5 or more real needs posted, some completed and thanked",
      "25 or more real members with verified profiles",
      "5 or more real connections made through \"Ask to connect\"",
      "A written note on where the data lives and who can see it",
    ],
    measured: ["How many needs were met", "How many connections led to real help"],
    demo: [
      "A youth group posts \"poster for Friday\", and a designer offers and finishes it",
      "A newcomer needs an accountant and searches \"accountant\"",
      "Finds a verified member and taps \"Ask to connect\"",
      "The member accepts, and they're talking",
    ],
    notes: [
      "Skills shares logins and church verification with Sojourn. The two could become one app: find your people, then serve and find help. Decide together on 17 October.",
    ],
  },
  {
    n: 6,
    title: "Steady",
    strap: "A wellbeing app for adult students",
    challenge: "Many students carry stress, loneliness and anxiety quietly.",
    callout: {
      title: "Never a counsellor",
      body: "The AI companion listens and points to real help. It never acts as a counsellor, and it never talks to real students during the five weeks.",
    },
    build: "Honest Christian content, simple self-care tools, and an AI companion that points to real help.",
    parts: [
      { name: "Content library", what: "15 to 20 short pieces: exam stress, homesickness, loneliness, anxiety, identity." },
      { name: "Self-care tools", what: "Breathing, a mood check-in and a gratitude journal, stored only on the phone." },
      { name: "Talk to a person", what: "Trusted pastors, chaplains and counsellors from partner churches." },
      { name: "AI companion prototype", what: "Suggests content or prayer, and hands over to a person." },
      { name: "Crisis path", what: "Self-harm, suicide or abuse stops the AI and shows human contacts and verified UAE helplines." },
    ],
    whoGets: [],
    rules: [
      { rule: "A licensed professional signs off", detail: "A licensed mental health professional approves the content and the AI." },
      { rule: "Adults only", detail: "For students 18 and over." },
      { rule: "AI on test conversations only", detail: "It does not talk to real students during the five weeks." },
      { rule: "Check the regulation", detail: "Whether a wellbeing app like this is regulated in the UAE is checked with an advisor." },
    ],
    team: ["Product lead", "Licensed mental health professional", "1 to 2 front-end developers", "AI engineer", "2 content writers", "Theology reviewer", "Designer"],
    by21: [
      "A working app with reviewed content",
      "Self-care tools tested by 5 to 10 adult students",
      "A \"talk to a person\" list",
      "The AI prototype, with its safety test results",
    ],
    notes: [
      "Not in the build: no real students talk to the AI, and no users under 18. The professional and church leaders, not the build team, decide whether the AI is ever offered to real students.",
    ],
  },
  {
    n: 7,
    title: "Provision",
    strap: "A trusted job network for churches",
    challenge:
      "People come to the UAE for work, or lose a job and need one fast. Job forwards in church groups are mostly unreliable, fake offers spread, and one church's circle is small.",
    callout: {
      title: "Legal advice in week 1",
      body: "Matching people to jobs may count as recruitment activity that needs a licence in the UAE. Get that answered in the first week, before anything else is built on it.",
    },
    build:
      "Bring employers across churches together with Christian job seekers, so seekers find real openings faster, employers find people they can trust, and nobody gets scammed. It starts in the UAE and is built to work for churches anywhere.",
    parts: [],
    whoGets: [
      {
        who: "Job givers",
        items: [
          "Post an opening at their own company, or a lead they know is real",
          "Every post shows who posted it and that they're a verified church member",
          "Posts expire after 30 days unless renewed",
        ],
      },
      {
        who: "Job seekers",
        items: [
          "A simple profile: skills, experience, work wanted, an optional CV",
          "Tap \"I'm interested\"; contact is shared only when the poster accepts",
          "A scam check: real offers come with an official labour ministry letter, and genuine employers never charge fees",
        ],
      },
      {
        who: "Volunteers and the church",
        items: [
          "CV reviews, mock interviews and LinkedIn help (can link to Skills)",
          "A care list so the pastor or care team can check in, only with the seeker's permission",
        ],
      },
    ],
    rules: [
      { rule: "Verified Christians only", detail: "From any church, vouched for by a church leader. No public job board." },
      { rule: "Not a recruiter", detail: "It never charges anyone and never acts as an agency." },
      { rule: "Collect little", detail: "No visa status, salary history, passport or ID numbers stored." },
      { rule: "Care is private", detail: "Only the seeker decides whether their pastor or care team is told." },
    ],
    team: ["Product lead", "2 full-stack developers", "Designer", "Writer (scam checklist, help text)", "1 to 2 church liaisons", "An advisor for the legal question"],
    by21: [
      "2 to 3 partner churches",
      "10 or more real openings or leads",
      "15 to 20 seekers with profiles",
      "Volunteers giving CV reviews and mock interviews",
      "A clear answer on the legal question, written down",
    ],
    measured: ["How many seekers got an interview", "How many got a job"],
    demo: ["A member posts an opening", "A seeker taps \"I'm interested\"", "Gets a CV review", "Lands an interview"],
    notes: [],
  },
];

export const briefFor = (n: number): Brief | null => BRIEFS.find((b) => b.n === n) ?? null;

/**
 * The safety checklist for a team: its own brief's ground rules, plus the two
 * things every team owes the reviewer. Ticks are stored by position, so add
 * new items at the end.
 */
export function safetyItems(n: number): string[] {
  const b = briefFor(n);
  return [
    ...(b?.rules.map((r) => `${r.rule}. ${r.detail}`) ?? []),
    "Test or sample data only: no real person's words, details or photos anywhere in the project.",
    "A data map is written down: every field we store, why we need it, and how long we keep it.",
  ];
}
