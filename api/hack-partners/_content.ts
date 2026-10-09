// The #HACK2026 Dubai partner page's words. SERVER ONLY.
//
// This file is the reason the page is built the way it is: these words are
// never in the site's HTML or JavaScript bundle. A partner's browser gets
// them from api/hack-partners/read only after its personal link checks out
// (see that file). Do not import this from anything under src/.
//
// Source: "HACK2026_Dubai_Partners_UAE.pdf" (Lighthouse folder), which says
// "Please share in person, don't post or forward". Keep it in step with that
// document; no payment details belong here, they are sent privately.
// Unlike the PDF, there is no gift deadline: the owner asked for none.

export const CONTENT = {
  eyebrow: "#HACK2026 · Dubai · For friends here in the UAE",
  title: "Ten friends, AED 300 each",
  intro:
    "#HACK began in Manila as a public event, with sponsors thanked on stage. This year a small group of builders, designers and writers here in the UAE spends six weeks building a free, private website kit for people who are searching for God, and four community apps for churches and the people they serve. We're asking ten friends who live here to carry it together. Here, the kindest way to thank a partner is to keep them, and everyone taking part, out of the spotlight.",

  program: [
    { when: "Thu 8 October · online", what: "Kickoff call: what #HACK is, how we work safely, and the challenges teams can choose from." },
    { when: "Sat 17 October · 6 to 9pm", what: "Dinner together in a friend's home. We split into teams, define roles, and agree each team's challenge and outcomes in detail." },
    { when: "The weeks between", what: "Teams build together, meeting online and in small groups at their own pace." },
    { when: "Sat 21 November", what: "We gather again and each team presents what it built." },
  ],

  ask: {
    headline: "We're looking for 10 partners at AED 300: AED 3,000 for the whole program.",
    amount: "AED 300",
    amountNote: "one gift, once · about US$82",
    carries: "Carries one builder through all six weeks: dinner on both nights, a share of the tools and hosting their team needs, and a token of thanks.",
    places: 10,
    shareNote: "Two friends can share a place at AED 150 each. In-kind gifts count the same, for example buying a software licence or a domain directly.",
  },

  budget: [
    { item: "Dinners on 17 Oct and 21 Nov", total: 1000, each: 100 },
    { item: "Tokens of thanks for everyone", total: 500, each: 50 },
    { item: "Tools: Claude, Canva Pro, CapCut Pro", total: 480, each: 48 },
    { item: "Domains, hosting and AI credit", total: 400, each: 40 },
    { item: "Thank-you gift for our host", total: 300, each: 30 },
    { item: "Supplies and cables", total: 170, each: 17 },
    { item: "Buffer", total: 150, each: 15 },
  ],

  receives: [
    "Your first name prayed over on 17 October and 21 November.",
    "A private update after 17 October on the teams and their challenges.",
    "A one-page report after 21 November on what was built.",
    "A statement of how every dirham was used.",
    "An update when the finished website goes live.",
  ],

  howToGive: [
    "Tap one of the answers above, or tell us in person, if you'd like one of the ten places.",
    "We'll send giving details to you privately. No need to mention #HACK in a transfer reference.",
  ],

  pray: [
    "For the teams as they form on 17 October, and for perseverance in the weeks of building after.",
    "For the people who will one day find what we build, and a real person waiting to answer them.",
  ],

  why: {
    eyebrow: "What we're building, and why",
    title: "\"Can't people just Google it?\"",
    intro:
      "It's a fair question. Type \"Who is Jesus?\" into Google or YouTube and you'll get millions of results. But the internet was built to remember what you search, recommend what you watched, and ask for your name before it answers you. For someone whose family, friends or workplace would not welcome the question, that is not a small detail.",
    punch: "There's no shortage of content about God online. What's missing is a safe place to ask.",
    rows: [
      {
        problem: "Search and video sites remember you.",
        looks: "Search history, watch history and \"recommended for you\" follow a person onto a shared phone or the family TV.",
        instead: "No tracking tools, no accounts, no sign-up, and a quick-exit button on every page.",
      },
      {
        problem: "Most answers are for people already in church.",
        looks: "Written in church language. The questions people type late at night are about shame, family, fear, loneliness and whether God sees them.",
        instead: "Visitors start with how they feel (\"worn out\", \"afraid\", \"alone\") and walk a short, gentle journey from there.",
      },
      {
        problem: "A video can't answer you back.",
        looks: "Comments are public. \"Contact us\" asks for an email, a phone number or WhatsApp: a name.",
        instead: "An anonymous question box with no email and no number. A private code to come back for the reply, and a real person who answers.",
      },
      {
        problem: "Content on someone else's platform can disappear.",
        looks: "Videos and pages can be removed, buried or blocked overnight.",
        instead: "A simple website that its owners control, a copy that works offline, and a spare address ready to switch to.",
      },
    ],
    /**
     * The seven challenges, in step with the public /hack page (src/data/hack.ts)
     * and HACK_Dubai_Challenges.pptx. Numbered across both tracks. The "hook"
     * lines say why, which is fine here: this page is for partners only.
     */
    challengesTitle: "The seven challenges our teams will take on",
    tracks: [
      {
        label: "Part one",
        title: "The website kit",
        lede: "Three teams of four, each building one part. Sample content only, and nothing goes live during the program.",
        challenges: [
          { title: "Start where they are", hook: "Pages that meet a person in how they feel, not in what we want to say.", body: "A home page that opens with a question, a \"pick a feeling\" menu and short journeys: a question, a short video, a passage, a reflection, then three gentle choices. Arabic first, fast on a cheap phone, and easy for a non-developer to add to. Plus reusable short-video templates: faceless, with Arabic captions, clear with the sound off." },
          { title: "A question without a name", hook: "The one thing YouTube can't do: let a person ask, and be answered.", body: "An anonymous box for a question or prayer request: no email, no phone number, no account. A short code to come back for the reply, and a private inbox for the real person who answers. It keeps as little as possible." },
          { title: "Safe to visit, easy to find", hook: "A safe site only helps if a searcher can find it, and visiting it never puts anyone at risk.", body: "A quick-exit button, a \"read this site safely\" page and an offline copy, plus pages that search engines, screen readers and keyboards all understand." },
        ],
      },
      {
        label: "Part two",
        title: "Community apps",
        lede: "Four apps for churches, ministries and the people they serve, each tried out with a partner church by 21 November.",
        challenges: [
          { title: "Sojourn", hook: "Young Christians arrive in the UAE alone and don't know where a youth group in their language meets.", body: "A welcome app: find a fellowship, a welcome buddy and events, without pulling anyone from a church they already belong to." },
          { title: "Skills", hook: "A church of 500 a service is full of skills nobody can find, and ministries that need them.", body: "One app, two sides. Ministries post needs such as posters, videos or music, and skilled Christians offer to help. And a members-only directory by skill and profession, from accountants to physios. Church leaders verify everyone; contact is shared only when both sides agree." },
          { title: "Steady", hook: "Many students carry stress, loneliness and anxiety quietly.", body: "A wellbeing app for adult students: honest Christian content, simple self-care tools kept on the phone, and an easy way to talk to a trusted person. Every piece reviewed by a licensed professional." },
          { title: "Provision", hook: "People come to the UAE for work, or lose a job and need one fast, and fake offers spread.", body: "A trusted job network for churches: verified members post real openings, seekers tap \"I'm interested\", and scam checks keep everyone safe. It never charges anyone." },
        ],
      },
    ],
    giftTitle: "Why your gift goes further here",
    gift:
      "Someone we know came to know Jesus because a person put something good on the internet where he could find it, and a real person answered when he reached out. This kit is how we make that happen again, on purpose and safely. And we're not building one website: we're building the safe, reusable parts that let any small team put a trustworthy site in front of searchers without starting from scratch. One partner gift of AED 300 carries one builder through all six weeks, and what they build can serve many teams, in many places, for years.",
  },

  closing: "Please share this only in person with people you know, and don't post or forward it. Thank you for carrying this with us.",
  signature: "Xerxes, Dubai Champion, #HACK2026",
  /** The message the "I'd like a place" button opens in WhatsApp. */
  whatsapp: { number: "971543281995", text: "Hi Xerxes, I'd like to take one of the ten places." },
};

export type Content = typeof CONTENT;
