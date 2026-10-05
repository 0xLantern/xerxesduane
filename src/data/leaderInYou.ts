import { CONTACT } from "./contact";

/**
 * The Leader in Y.O.U.: everything /leader-in-you says, in one place.
 *
 * Source: Dr. Owen Fernandes's program decks and the testimonials he sent
 * (October 2026). Two things are deliberately NOT stated, because the decks
 * disagree or are silent and a landing page must not guess:
 *   - the price (the deck says "to be discussed"),
 *   - the next dates (none confirmed).
 * Both are answered in FAQS as "shared on request". When they are known, add
 * them to NEXT_COHORT below and the page will show them.
 *
 * Testimonials are verbatim, trimmed only at sentence boundaries, signed with
 * the initials and city he supplied.
 */

export const PROGRAM = {
  name: "The Leader in Y.O.U.",
  /** "Developing the Leader in Y.O.U." is the certificate's full title. */
  fullName: "Developing the Leader in Y.O.U.",
  tagline: "Become the leader you always wanted to be.",
  lede:
    "A 2-day in-person leadership masterclass in Dubai. You start with a research-grade look at who you are, then turn what you learn into goals, habits and a way of leading that people actually follow.",
  quote: "Everything rises and falls on leadership.",
  city: "Dubai, UAE",
  duration: "2 days",
  seats: "Small groups of up to 12",
  certificate: "International certificate of completion",
};

export const FACILITATOR = {
  name: "Dr. Owen Fernandes",
  short: "Dr. Owen",
  role: "Founder & Managing Partner, Ascend Higher Associates",
  bio:
    "More than 30 years of international experience helping people lead from self-awareness. Dr. Owen is known for a pragmatic, people-first style and a real passion for people development.",
  credentials: [
    "MBA, Personal & Leadership Development",
    "Certified Maxwell Leadership Coach & Trainer",
    "ICF Certified Coach",
    "Certified Psychometric Analyst",
    "NLP Practitioner",
    "Certified Emotional Intelligence Coach Practitioner",
  ],
  company: "Ascend Higher Associates",
  companyTagline: "Elevating Success",
  site: "https://www.ascendhigher.ae",
  personalSite: "https://www.owenfernandes.com",
};

/**
 * Enquiries go to Xerxes, who manages the program in Dubai, not to Dr. Owen
 * directly. The numbers live in data/contact.ts.
 */
export const CONTACT_ENQUIRY = {
  whatsapp: CONTACT.whatsapp,
  phoneDisplay: CONTACT.whatsappDisplay,
  phoneHref: `tel:+${CONTACT.whatsapp}`,
  email: CONTACT.email,
};

/** What the Reserve / WhatsApp buttons open with. */
export const WHATSAPP_MESSAGE =
  "Hi Xerxes, I found The Leader in Y.O.U. on your website. Please tell me about the next 2-day masterclass in Dubai.";

export const EMAIL_SUBJECT = "The Leader in Y.O.U. - next masterclass in Dubai";
export const EMAIL_BODY =
  "Hi Dr. Owen,\n\nI'd like to know about the next 2-day Leader in Y.O.U. masterclass in Dubai.\n\nName:\nOrganisation / church:\nRole:\nJust me, or a team of (number):\n";

/** Fill in once a date is confirmed; the page then replaces "dates on request". */
export const NEXT_COHORT: { dates: string; venue?: string } | null = null;

/** Y.O.U., spelled out. */
export const YOU = [
  {
    letter: "Y",
    title: "You are valued",
    body: "Recognise your inherent worth and the unique qualities you bring to every role you hold.",
  },
  {
    letter: "O",
    title: "Only you are you",
    body: "Your individuality is not something to smooth over. It is the source of your leadership strength.",
  },
  {
    letter: "U",
    title: "Understand yourself",
    body: "Know your strengths, your growth areas and what really drives you, so you can lead others well.",
  },
];

export const AUDIENCES = {
  work: {
    title: "In your career",
    blurb: "You are ready to move from doing the work to leading the people who do it.",
    people: [
      { role: "First-time managers", note: "Sales, customer service and line managers making the jump from individual contributor to inspiring leader." },
      { role: "Team leaders and project managers", note: "Take your leadership to the next level and lead teams to results." },
      { role: "Department heads and division leads", note: "Navigate complex team dynamics and drive meaningful outcomes." },
      { role: "Leaders of hybrid and remote teams", note: "Build trust and engagement wherever your people sit." },
    ],
  },
  church: {
    title: "In church and ministry",
    blurb: "Leading volunteers and a congregation takes the same self-awareness and people skills, with less authority to lean on.",
    people: [
      { role: "Pastors and ministry heads", note: "Understand your own wiring so you lead your team and congregation with clarity." },
      { role: "Ministry and department leaders", note: "Worship, children, youth, outreach and operations leaders who guide teams of volunteers." },
      { role: "Cell group and small group leaders", note: "Influence people you have no authority over, and keep conflict healthy." },
      { role: "Emerging leaders", note: "Young professionals and volunteers being groomed for bigger responsibility." },
    ],
  },
};

export interface Phase {
  n: number;
  name: string;
  tag: string;
  day: 1 | 2;
  body: string;
  outcome: string;
}

export const PHASES: Phase[] = [
  {
    n: 1,
    name: "Assessment",
    tag: "Discover your core",
    day: 1,
    body: "The program opens with the debrief of a battery of four assessments, taken before you arrive. It gives you a clear picture of your identity, purpose and potential: personal traits, inherited patterns, core values and areas of potential.",
    outcome: "A clear view of your strengths and growth areas: the base of authentic self-leadership.",
  },
  {
    n: 2,
    name: "Awareness",
    tag: "Develop self-knowledge",
    day: 1,
    body: "Activities take you deeper into how you behave and communicate. You analyse your patterns, recognise your strengths and blind spots, and clarify what motivates and what stresses you.",
    outcome: "You understand how your behaviour lands on others, and where you can be more effective.",
  },
  {
    n: 3,
    name: "Alignment",
    tag: "Set intentional goals",
    day: 1,
    body: "Working with your coach, you set goals that fit your personality, your values and the mission of your organisation or ministry, and you name the challenges likely to get in the way.",
    outcome: "Personal growth linked to professional objectives, with a plan you believe in.",
  },
  {
    n: 4,
    name: "Activity",
    tag: "Grow through action",
    day: 2,
    body: "Structured group activities and live simulations turn insight into practice: planning, keeping momentum, managing performance, building resilience and handling trade-offs, with feedback all day.",
    outcome: "New leadership habits, built through doing rather than listening.",
  },
  {
    n: 5,
    name: "Accomplishment",
    tag: "Celebrate and sustain",
    day: 2,
    body: "You reflect on your progress, celebrate milestones and set intentions for continued growth, so the learning outlasts the room.",
    outcome: "A sense of real accomplishment, and a cycle of learning you keep going.",
  },
];

export const COMPETENCIES = [
  { title: "Becoming a True Leader", theme: "The process", body: "Embrace lifelong learning and self-reflection, the groundwork for trust and engagement." },
  { title: "Taking Action", theme: "Responsibility", body: "Make timely, responsible decisions in complex situations, in person and online." },
  { title: "Seeing the Future", theme: "Navigation", body: "Set and share a compelling vision that people commit to." },
  { title: "Investing in People", theme: "Empowerment and legacy", body: "Mentor, coach and delegate so others grow, in the office and remotely." },
  { title: "Developing Character", theme: "Integrity and ethics", body: "Build the reputation that earns trust long before your title does." },
  { title: "Communication", theme: "Influence, clarity, connection", body: "Listen well, speak clearly and adapt your message to each audience." },
  { title: "Trust", theme: "Credibility", body: "Build and keep credibility through transparency, reliability and psychological safety." },
  { title: "Motivation", theme: "Effort, results, rewards", body: "Match how you motivate to what each person actually needs." },
  { title: "Teamwork", theme: "Synergy and conflict", body: "Turn disagreement into commitment instead of poison." },
  { title: "Culture", theme: "Values", body: "Shape and nurture a values-driven culture that fits your mission." },
];

export const TAKE_HOME = [
  { title: "Your assessment report", body: "A comprehensive, personalised report from the four-part psychometric assessment, with in-depth feedback on your core competencies." },
  { title: "60-page participant workbook", body: "Activities, reflection exercises and key concepts to apply on the job." },
  { title: "5 e-books", body: "Reading to sharpen the skills you have just learned." },
  { title: "Take-home tools", body: "Practical resources for conflict resolution, communication and digital collaboration." },
  { title: "Certificate of completion", body: "An international certificate, for participants who attend the full program." },
  { title: "Optional 1:1 coaching", body: "Follow-up coaching with Dr. Owen over Zoom or in person." },
];

export const OUTCOMES = [
  { title: "Engagement", body: "Motivate, inspire and keep your best people." },
  { title: "Collaboration", body: "Resolve conflict and build team synergy that lifts performance." },
  { title: "Influence", body: "Communicate clearly enough that people follow, not just comply." },
  { title: "A leadership pipeline", body: "Prepare future leaders for bigger roles." },
];

export interface Testimonial {
  quote: string;
  who: string;
  place: string;
}

/** Featured first. */
export const TESTIMONIALS: Testimonial[] = [
  { quote: "I can now lead with confidence. I now know what I must do to understand my people.", who: "K.T.", place: "Dubai, UAE" },
  { quote: "I have pulled out my results twice this week to look at areas in which I need to improve and reflect on the ones where I am strong. It's truly a blessing to have met you.", who: "A.K.", place: "Abu Dhabi, UAE" },
  { quote: "Must for all Team Leaders and Managers.", who: "K.S.", place: "Muscat, Oman" },
  { quote: "I found the training to be very informative. It was well presented by Dr. Fernandes. I am planning to get all my direct reports attend it next time.", who: "J.M.", place: "Sofia, Bulgaria" },
  { quote: "Getting to know and acknowledge your weaknesses and strengths is not easy, especially weaknesses. Your passion shows so clearly and that is what moves the participants.", who: "R.K.", place: "Virginia, USA" },
  { quote: "I honestly recommend this program to all people who want to be more successful and happier with their careers.", who: "A.S.", place: "Singapore" },
  { quote: "I will be encouraging my Pastor and the leadership of my church to have you come do a workshop with us.", who: "F.S.", place: "Queens, New York, USA" },
  { quote: "You have touched my life positively. I am thrilled to know myself better and I know I have to be intentional in few things extra carefully.", who: "S.R.", place: "Bucharest, Romania" },
  { quote: "I should have heard this message 20 years ago. At 53, I will still go for a great finish.", who: "P.K.", place: "Port Harcourt, Nigeria" },
  { quote: "Powerful and Insightful. I will never be the same again.", who: "O.P.", place: "Lagos, Nigeria" },
];

export const HOW_IT_RUNS = [
  { title: "Before Day 1", body: "You complete the online psychometric assessments. We send the link and the deadline when you register." },
  { title: "Day 1: know yourself", body: "Assessment debrief, awareness activities and goal alignment with your coach." },
  { title: "Day 2: practise", body: "Simulations, group activities and a close that sets your next steps." },
  { title: "After", body: "A short feedback form at the end, then a follow-up questionnaire 30 days later to capture how you have applied it." },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "When is the next program, and what does it cost?",
    a: "Dates and the fee for each cohort are shared on request, because groups are kept small. Message Xerxes, who coordinates the program in Dubai, on WhatsApp or email and you will get the next dates, the venue and the fee.",
  },
  {
    q: "How long is it, and where?",
    a: "Two days, in person in Dubai. Attendance on both days is required, so the learning builds properly and you qualify for the certificate.",
  },
  {
    q: "What is the assessment, and do I need to prepare?",
    a: "Before the program you complete a holistic psychometric assessment: a battery of four assessments that look at your traits, values, communication and behavioural style, and motivators. Complete it before Day 1, by the deadline you are given. There is nothing to study and no pass or fail. The results form the basis of Day 1.",
  },
  {
    q: "Is this only for senior managers?",
    a: "No. It suits first-time managers, team leaders, project managers, department heads, leaders of hybrid teams, and emerging leaders. If other people look to you for direction, in your job or in a volunteer role, it is for you.",
  },
  {
    q: "Is it suitable for church and ministry leaders?",
    a: "Yes. The program is built on self-awareness, communication, trust, conflict and teamwork, which matter just as much when you lead volunteers and a congregation. Church leaders who have attended have asked for it for their own teams.",
  },
  {
    q: "Can my company or church bring it to our own team?",
    a: "Yes. The program can be delivered for your organisation, onsite, with a certificate that can be co-branded. Message Xerxes with your team size and goals and he will arrange a proposal with Dr. Owen.",
  },
  {
    q: "Do I get a certificate?",
    a: "Yes. Participants who attend the full program receive an international Certificate of Completion, presented by Dr. Owen Fernandes.",
  },
  {
    q: "How is the program taught?",
    a: "Mostly in the room: individual activities, group exercises, role play, case studies and simulations, each followed by a short debrief. Everyone is equal during an activity; job titles do not matter.",
  },
];
