// Insights (blog) content. Posts are authored as typed content blocks so they
// render cleanly in the prerendered HTML with zero markdown dependency.
export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string };

export interface InsightPost {
  slug: string;
  title: string;
  /** Meta description + card excerpt. */
  description: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /**
   * ISO date of a meaningful revision — new facts, corrected figures, a
   * rewritten section. Absent unless that happened: `dateModified` equal to
   * `datePublished` on every post tells a reader and a crawler nothing, and
   * bumping it for a typo is the kind of freshness signal that earns distrust.
   */
  updated?: string;
  author: string;
  readingMinutes: number;
  body: Block[];
  /** Service-page slugs to cross-link from this post (internal linking). */
  relatedServices?: string[];
  /**
   * Primary sources for the checkable third-party facts in the post — the
   * vendor's own documentation or pricing page, never a blog summarising it.
   *
   * Only posts that assert something a reader could verify carry these. A post
   * whose content is my own judgement says so in the prose instead; inventing a
   * citation for an opinion is worse than having none.
   */
  sources?: { label: string; url: string; note?: string }[];
}

export const INSIGHTS: InsightPost[] = [
  {
    slug: "aeo-seo-geo-dubai",
    title: "AEO vs SEO vs GEO: how Dubai businesses get found",
    description:
      "SEO, AEO, and GEO explained in plain English for Dubai businesses: what each one does, where they overlap, and what an SME should do first.",
    date: "2026-06-14",
    author: "Xerxes Duane",
    readingMinutes: 8,
    relatedServices: ["seo-dubai", "answer-engine-optimization-dubai", "generative-engine-optimization-dubai"],
    body: [
      {
        type: "p",
        text: "For years, getting found online meant one thing: ranking on Google. In 2026 it means three. Your customers still type into Google, but they also read the AI summary at the top before they scroll, and a growing number of them skip Google entirely and ask ChatGPT, Gemini, or Perplexity instead. Three acronyms have grown up around this, SEO, AEO, and GEO, and most of the people selling them make it sound far more complicated than it is. Here is the plain-English version, and what a Dubai business should actually do about it.",
      },
      { type: "h2", text: "The three, in one sentence each" },
      {
        type: "p",
        text: "Strip away the jargon and they are easy to tell apart. The difference is simply where you are trying to show up.",
      },
      {
        type: "ul",
        items: [
          "SEO (Search Engine Optimization) is the classic one: ranking in the blue links on a Google or Bing results page, so someone clicks through to your site.",
          "AEO (Answer Engine Optimization) is about being the answer rather than a link, getting quoted in Google's AI Overview, the featured snippet box, the 'people also ask' section, and voice assistants that read one answer aloud.",
          "GEO (Generative Engine Optimization) is about being cited or recommended inside ChatGPT, Gemini, Perplexity, and Copilot, when someone asks the AI a question and never touches a search engine at all.",
        ],
      },
      {
        type: "p",
        text: "SEO wants the click. AEO wants the quote. GEO wants the recommendation. Same business, same website, three different places your name needs to appear.",
      },
      { type: "h2", text: "Why search is fragmenting" },
      {
        type: "p",
        text: "Ten years ago there was one front door: you typed a few words into Google, looked at the ten links, and clicked one. That front door still exists, but it is no longer the only one, and increasingly it is not even the first thing people see. Google now puts an AI-written summary above the links for a large share of searches. Plenty of people read that summary, get their answer, and never scroll, never click. That is the rise of the 'zero-click' search, and it is the reason ranking number one is not the guarantee it used to be.",
      },
      {
        type: "p",
        text: "At the same time, a real chunk of people have changed their first move entirely. When someone wants 'the best accounting software for a Dubai free zone company' or 'a reliable AC maintenance company in JLT', a growing number now ask an AI assistant before they ever open Google. The AI gives them a shortlist with a few names on it. If your business is on that shortlist, you get the lead. If it is not, you are invisible, and you will not even see it happen in your analytics, because there was no click to track.",
      },
      {
        type: "quote",
        text: "You used to compete to be the first link people clicked. Now you are also competing to be the answer they never have to click for, and the name an AI says out loud.",
      },
      { type: "h2", text: "What SEO still requires (and why it is the foundation)" },
      {
        type: "p",
        text: "None of this means SEO is dead. The opposite, really: the AI summaries and the chatbots are pulling their answers from somewhere, and that somewhere is mostly the same web of pages that classic search ranks. If your site is fast, well-structured, and trusted enough to rank on Google, you have already done most of the work that makes the other two possible. SEO is the foundation the other two stand on.",
      },
      {
        type: "p",
        text: "The fundamentals have not changed much: pages that load fast and work on a phone, content that genuinely answers what people are searching for, a sensible site structure, and other reputable sites linking to you. For a Dubai business, local signals matter a lot, a properly filled-in Google Business Profile, consistent name-address-phone details, and real reviews. That groundwork is what gets you into the consideration set for everything that follows.",
      },
      { type: "h2", text: "What AEO requires: answer the question, and prove it in code" },
      {
        type: "p",
        text: "Answer engines, the AI Overview, the snippet box, the voice assistant, are trying to lift a clean, correct answer straight off your page. So the practical work of AEO is making your answers easy to lift. That means writing answer-first: state the answer plainly in the first line or two, then explain. It means structuring content as real questions and direct answers, the way someone would actually ask. And it means giving Google machine-readable hints about what is on the page.",
      },
      {
        type: "ul",
        items: [
          "Answer-first content: lead with the short, direct answer, then add the detail underneath. Burying the answer in paragraph six gets you skipped.",
          "FAQ and structured data (schema): code-level labels that tell search engines 'this is a question, this is its answer, this is a price, this is a review'. It is invisible to your visitors but very visible to the machines.",
          "Genuine question-and-answer formatting: headings phrased as the questions people actually type or speak, with a tidy answer right beneath each.",
          "Clarity over cleverness: short sentences, plain words, and specifics. Vague marketing copy does not get quoted; a clear factual answer does.",
        ],
      },
      {
        type: "p",
        text: "The honest catch with AEO is that getting quoted does not always get you a click, the whole point of an answer engine is to satisfy the person on the spot. But being named as the source still builds trust and recognition, and for many local searches the answer box is now the most valuable real estate on the page, more visible than the link in position one.",
      },
      { type: "h2", text: "What GEO requires: become a known entity the AI can cite" },
      {
        type: "p",
        text: "GEO is the newest and the fuzziest, because nobody outside the AI labs sees the exact recipe. But the pattern is reasonably clear. Tools like ChatGPT, Gemini, and Perplexity recommend businesses they can find written about, consistently, across the web, with enough detail to be confident about. They are pattern-matching on reputation and clarity, not just keywords. So GEO is less about tricks and more about being a recognisable, well-described entity.",
      },
      {
        type: "ul",
        items: [
          "Be described clearly and consistently: who you are, where you operate (for us, that is Dubai and the UAE), and exactly what you do, repeated the same way across your site and your profiles.",
          "Earn mentions and citations off your own site: directory listings, reputable local publications, and being referenced by others is what gives an AI the confidence to repeat your name.",
          "Publish substance worth citing: genuinely useful, specific content, real prices, real comparisons, real how-tos, is the kind of thing these tools quote and link.",
          "Keep your facts current and aligned everywhere, because the AI is stitching together what it finds, and contradictory details make it leave you out.",
        ],
      },
      {
        type: "p",
        text: "Notice there is no schema trick or settings toggle that 'turns on' GEO. You earn it by being clear, useful, and talked about, which is, conveniently, the same thing that has always made a business worth recommending.",
      },
      { type: "h2", text: "Where they overlap (this is the good news)" },
      {
        type: "p",
        text: "Here is what the people selling three separate packages would rather you did not notice: these three things mostly want the same work. A fast, well-structured, trustworthy site with clear, answer-first content and clean structured data serves all three at once. Good SEO content is exactly what gets quoted by answer engines and cited by chatbots. There is no world where your SEO is strong but you are mysteriously invisible to AI, the same signals feed all of it.",
      },
      {
        type: "quote",
        text: "AEO and GEO are not a different job from SEO. They are what good SEO content looks like once you also write it to be quoted and cited, not just clicked.",
      },
      {
        type: "p",
        text: "So if a vendor quotes you three line items, 'SEO', 'AEO', and 'GEO', as if each were a separate project with a separate fee, be a little sceptical. There is overlap they should be charging you once for, not three times.",
      },
      { type: "h2", text: "What a Dubai SME should actually do first" },
      {
        type: "p",
        text: "Do not try to chase all three at once, and do not let the new acronyms distract you from boring fundamentals that still do most of the work. Here is the order I would put them in for a small or mid-sized business in the UAE.",
      },
      {
        type: "ul",
        items: [
          "Get the foundation right first: a fast, mobile-first site, a complete Google Business Profile, consistent contact details, and real reviews. Skip this and the rest is built on sand.",
          "Rewrite your key pages answer-first: open each important page and service with a clear, direct answer to the question that page is really about.",
          "Add the basic structured data: FAQ schema on your service pages, organisation and local-business schema sitewide. It is a one-time technical job with lasting payoff.",
          "Publish a handful of genuinely useful, specific pages, real prices in AED, honest comparisons, plain how-tos, that an answer engine would be happy to quote and a chatbot happy to cite.",
          "Then check yourself: search your services on Google and look at the AI Overview, and ask ChatGPT and Perplexity the questions your customers ask. See whether you show up, and where the gaps are.",
        ],
      },
      {
        type: "p",
        text: "That last step is worth doing today, for free. Open ChatGPT or Perplexity and ask it to recommend a business that does what you do in Dubai. If your name comes up, good. If a competitor's does and yours does not, you have just found a problem worth fixing, and you will understand these three acronyms better in five minutes of testing than in an hour of reading.",
      },
      { type: "h2", text: "The bottom line" },
      {
        type: "p",
        text: "Search is not getting replaced, it is getting more places to show up. SEO gets you the click, AEO gets you quoted as the answer, and GEO gets you recommended by the AI, and the same honest, clear, well-structured work feeds all three. The businesses that win in 2026 are not the ones chasing every acronym; they are the ones that are genuinely clear about who they are and genuinely useful to the people asking.",
      },
      {
        type: "p",
        text: "If you are not sure where your business currently stands across Google, the AI Overviews, and the chatbots, that is exactly what a free audit covers, I will run the real searches, show you where you appear and where you do not, and tell you the few fixes that matter most. You can also see how I think about answer-first content and AI search in practice over at the live AI Lab at /ai-lab. No jargon, no three-package upsell, just an honest picture of how findable you actually are.",
      },
    ],
  },
  {
    slug: "get-cited-by-chatgpt-perplexity-dubai",
    title: "How to get cited by ChatGPT and Perplexity",
    description:
      "How AI engines decide what to cite, what Dubai businesses can do to get recommended, and how to check whether you already show up.",
    date: "2026-06-13",
    author: "Xerxes Duane",
    readingMinutes: 8,
    body: [
      {
        type: "p",
        text: "More people in Dubai are asking ChatGPT and Perplexity questions they used to type into Google. \"Best accountant for a free zone company.\" \"Who does Odoo setup in Dubai.\" \"Reliable AC maintenance in JLT.\" The answer they get back names a handful of businesses, and the rest are invisible. This is a practical guide to how those engines decide who gets named, what you can actually do about it as a Dubai business, and where the honest limits are.",
      },
      { type: "h2", text: "How a generative engine actually picks who to cite" },
      {
        type: "p",
        text: "It helps to drop the magic. When someone asks ChatGPT or Perplexity a question, the engine usually runs a search behind the scenes, pulls a set of pages it trusts, reads them, and writes an answer that stitches together the clearest, most consistent information it found. It is not ranking ten blue links. It is choosing which sources to believe and quote. So the question is not \"how do I rank number one\" but \"how do I become one of the sources the model trusts enough to name.\"",
      },
      {
        type: "p",
        text: "In practice, the businesses that get cited tend to share a few traits. The engine can tell exactly who they are. Their details match everywhere it looks. Other websites mention them. Their pages answer the question directly instead of burying it. None of this is a trick. It is the same thing a careful human would do before recommending you to a friend.",
      },
      { type: "h2", text: "Be a clear entity the model can recognise" },
      {
        type: "p",
        text: "An \"entity\" just means a thing the engine can identify with confidence, your business as a distinct, named thing in the world. If a model is unsure whether \"Threshold Works,\" \"Threshold Works LLC,\" and \"thresholdworks.ae\" are the same company, it gets nervous about naming you, because it cannot be sure the good things it read apply to the right business. Vagueness is the enemy.",
      },
      {
        type: "p",
        text: "You make yourself a clear entity by being boringly consistent about who you are and what you do. One business name, used the same way everywhere. A plain description of what you offer and who you serve. A real address and contact details. A few authoritative places that confirm you exist, your own site, your Google Business Profile, your LinkedIn, a directory or two. The model is connecting dots; your job is to make the dots line up.",
      },
      { type: "h2", text: "Keep your name, address and phone identical everywhere" },
      {
        type: "p",
        text: "This is the least glamorous tip and one of the most important, especially in the UAE where it is easy to drift. Your name, address and phone number, what people in SEO call NAP, should be byte-for-byte identical across your website, Google Business Profile, social pages, and any directory you appear in. \"Office 1203\" in one place and \"Suite 1203\" in another, a +971 50 number here and a landline there, an old trade-name from before you rebranded, every mismatch makes the engine less sure it is looking at one business.",
      },
      {
        type: "ul",
        items: [
          "Pick one exact spelling of your business name and one address format, and use them everywhere.",
          "Use one primary phone number consistently; pick a single international format and stick to it.",
          "Clean up old listings from a previous name, location, or freezone before you registered the new one.",
          "Make sure your Google Business Profile is claimed, verified, and matches your website exactly.",
          "If you operate in both English and Arabic, keep the core details consistent across both.",
        ],
      },
      { type: "h2", text: "Third-party mentions are what build trust" },
      {
        type: "p",
        text: "Here is the part many Dubai businesses miss. Saying you are the best on your own website counts for very little, because everyone says that. What moves an engine is other sites saying it for you. A mention in a local publication, an honest review on Google, a credible directory listing, a partner who links to you, a podcast or interview where you are named, all of these tell the model that your reputation exists outside your own marketing. The engine is effectively asking, \"who else vouches for this business,\" and reading the room.",
      },
      {
        type: "p",
        text: "You do not need hundreds of these. You need a handful of genuine, relevant ones. A few real reviews from real clients, a profile on a respected local directory, and being mentioned somewhere that talks about your industry will do more than a wall of self-praise on your homepage.",
      },
      {
        type: "quote",
        text: "An AI engine recommends you for the same reason a person does: not because you told it you are good, but because enough independent sources agree that you are.",
      },
      { type: "h2", text: "Write the clearest answer on the page" },
      {
        type: "p",
        text: "Engines quote pages that answer the question directly. If someone asks \"how much does a website cost in Dubai\" and your page opens with three paragraphs of marketing fluff before getting to a number, the model skips you for the site that gives a clear range in the first line. Structure helps too: plain headings that match real questions, short direct answers underneath, lists where lists make sense, and a real address and contact details the engine can lift. You are making it easy to be quoted.",
      },
      {
        type: "ul",
        items: [
          "Answer the actual question in the first sentence or two, then explain.",
          "Use headings that mirror how people phrase questions, not clever wordplay.",
          "Give concrete specifics, real AED ranges, real timelines, real steps, not vague claims.",
          "Add basic structured data and a clear contact block so the facts are machine-readable.",
          "Keep one definitive page per topic instead of five thin, overlapping ones.",
        ],
      },
      { type: "h2", text: "How to check whether you are already being cited" },
      {
        type: "p",
        text: "You do not have to guess. Open ChatGPT and Perplexity and ask them the questions your customers would actually ask, the way they would phrase them. \"Who does CRM setup in Dubai.\" \"Best web developer for a small business in Dubai.\" Then read what comes back honestly. Are you named? Is a competitor named instead? Is the information about you correct, or is it pulling an old address or a service you no longer offer? Perplexity is especially useful here because it shows its sources, so you can see exactly which pages it trusted.",
      },
      {
        type: "p",
        text: "Run the same question a few times and on both tools, because answers vary. What you are looking for is a pattern: consistently named, occasionally named, or never named. If you are never named for questions you should clearly own, that is the gap to work on. If you are named but the details are wrong, that is a consistency problem you can fix faster than you would expect.",
      },
      { type: "h2", text: "The honest limits: you cannot bribe your way in" },
      {
        type: "p",
        text: "Now the part nobody selling \"AI SEO packages\" wants to say out loud. There is no paid slot inside a ChatGPT or Perplexity answer the way there is with Google Ads. You cannot pay the model to recommend you. You cannot guarantee placement, because the engines change, the answers shift between runs, and no one controls them from the outside. Anyone promising you a fixed spot in an AI answer is either confused or selling you something that does not exist.",
      },
      {
        type: "p",
        text: "What you can do is make yourself the obvious, well-documented, trustworthy choice, and then be patient. This work compounds rather than spikes. It is closer to building a reputation than buying an ad, which is exactly why it is durable once it lands. The flip side is that it does not happen overnight, and any honest person will tell you that up front.",
      },
      {
        type: "ul",
        items: [
          "No, you cannot pay for a citation; there is no ad slot inside the answer.",
          "No, results are not guaranteed or fixed; the same question can return different answers.",
          "Yes, clear identity, consistent details, real third-party mentions, and direct content genuinely move the needle.",
          "Yes, it takes time, and that is the cost of it being hard to fake.",
        ],
      },
      {
        type: "p",
        text: "If you want to know where you stand today, the quickest start is to ask ChatGPT and Perplexity the questions your customers ask and see who they name. If you would rather I do it with you, I offer a free audit where I check whether you are being cited, find the consistency and content gaps holding you back, and tell you honestly what is worth fixing first, no package, no padding. You can also try the live AI Lab at /ai-lab to see this kind of thing working in practice before you commit to anything.",
      },
    ],
    relatedServices: ["generative-engine-optimization-dubai", "answer-engine-optimization-dubai", "seo-dubai"],
  },
  {
    slug: "whatsapp-automation-not-spam-dubai",
    sources: [
      {
        label: "WhatsApp Business Messaging Policy",
        url: "https://business.whatsapp.com/policy",
        note: "The opt-in requirement and what counts as unsolicited.",
      },
      {
        label: "WhatsApp Cloud API documentation",
        url: "https://developers.facebook.com/docs/whatsapp/cloud-api",
        note: "The official platform, as opposed to the grey-market tools.",
      },
      {
        label: "Conversation types",
        url: "https://developers.facebook.com/docs/whatsapp/conversation-types",
        note: "The 24-hour customer service window.",
      },
      {
        label: "Message templates",
        url: "https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates",
        note: "What has to be pre-approved before you can start a conversation.",
      },
      {
        label: "Messaging limits",
        url: "https://developers.facebook.com/docs/whatsapp/messaging-limits",
        note: "How quality rating raises or throttles your sending limits.",
      },
    ],
    title: "WhatsApp lead automation that doesn't feel like spam",
    description:
      "The difference between WhatsApp spam and helpful automation: opt-in, Cloud API setup, smart follow-up, and where AI should hand off to humans.",
    date: "2026-06-12",
    author: "Xerxes Duane",
    readingMinutes: 8,
    relatedServices: ["ai-automation-dubai", "crm-development-dubai"],
    body: [
      {
        type: "p",
        text: "In Dubai, WhatsApp is not a side channel. It is the channel. People reply to a WhatsApp message in minutes when they would leave an email for three days and never pick up an unknown call. So the temptation is obvious: automate it, send a few thousand messages, watch the leads roll in. The problem is that the lazy version of this is exactly what gets your number flagged, blocked, and reported, and it teaches your future customers to ignore you. There is a better way, and the gap between the two is mostly about respect, not technology.",
      },
      { type: "h2", text: "Why WhatsApp is the channel in the UAE" },
      {
        type: "p",
        text: "Almost everyone here lives in WhatsApp. It is how the building handyman, the school, the clinic, and your accountant all reach you. For a small business that means a customer is far more likely to be sitting inside WhatsApp at the moment they're deciding whether to book you. An email lands in a pile. A WhatsApp message lands in the same place as messages from their family. That is a privilege, and it is also the exact reason a bad automated message feels so intrusive: you've walked into a personal space uninvited.",
      },
      {
        type: "p",
        text: "So the bar is higher here, not lower. The same automated message that feels mildly annoying as an email feels like a genuine violation as a WhatsApp from a number nobody recognises. Get it right and WhatsApp is the fastest, warmest channel you have. Get it wrong and it's the fastest way to become the number people screenshot and warn their friends about.",
      },
      { type: "h2", text: "Blasting versus helping: the actual difference" },
      {
        type: "p",
        text: "Blasting is sending the same message to a list of people who never asked to hear from you, hoping a small percentage bite. Helping is responding faster and more usefully to people who already raised their hand. Both can be automated. Only one builds a business you'd be proud of. The honest test is simple: would the person on the other end be glad this message arrived, or annoyed? If you can't answer that confidently, you're blasting.",
      },
      {
        type: "p",
        text: "Here's the same situation, two ways. A blast: a cold contact gets 'Hi, we offer the best cleaning services in Dubai, reply YES for 20% off.' A helpful automation: someone fills in your website form asking about a deep clean, and ninety seconds later gets 'Hi Sara, thanks for your enquiry about a deep clean for a 2-bedroom in JLT. I've got two slots this week, Wednesday morning or Friday afternoon, which suits you better?' The second one isn't spam because it's a timely, relevant reply to a question she actually asked. That's the whole game.",
      },
      { type: "h2", text: "The compliant way: Cloud API, opt-in, approved templates" },
      {
        type: "p",
        text: "If you're doing this properly, you use the official WhatsApp Business Platform (the Cloud API), not a grey-market tool that automates a phone in someone's drawer. The unofficial route works until it doesn't, and when it stops, you lose the number and the conversations with it. The official platform costs a little more and asks you to follow rules, but those rules are the same ones that keep you out of the spam pile.",
      },
      {
        type: "ul",
        items: [
          "Opt-in is the foundation. You can only message people who agreed to hear from you, a website form, a checkbox, a 'message us on WhatsApp' button, or a reply to your number. No bought lists, no scraped contacts.",
          "Inside the 24-hour window, after a customer messages you, you can reply freely with normal messages for 24 hours. This is where almost all genuinely helpful automation lives.",
          "Outside that window you need an approved template. To start a conversation or follow up later, you send a pre-written 'template' message that Meta has reviewed. This is the guardrail that stops random promotional blasts.",
          "Quality rating is real. Meta tracks how often people block or report your number. Behave like a spammer and your limits get throttled, then cut. Behave well and your sending limits actually go up over time.",
        ],
      },
      {
        type: "p",
        text: "None of this is hard to set up correctly the first time. It's much harder to recover a number you've already burned, so it's worth doing properly from day one.",
      },
      { type: "h2", text: "What's worth automating" },
      {
        type: "p",
        text: "The best automations remove waiting and admin, not human judgement. They make sure nobody who reached out gets left on read, and they handle the boring, repetitive parts so you can spend your attention on the conversations that need a person.",
      },
      {
        type: "ul",
        items: [
          "Instant, personalised first reply. When a lead comes in from your site, Instagram, or a WhatsApp button, an immediate message that uses their name and references what they actually asked about, then hands off to you.",
          "Light qualifying. A couple of natural questions, what they need, where they are, roughly when, so that by the time you pick up the conversation you already know if it's a fit.",
          "Booking and rescheduling. Offer real available slots, confirm the time, and let people change it without a phone call.",
          "Reminders and confirmations. A friendly nudge the day before an appointment, which quietly kills no-shows, plus order or payment confirmations people genuinely want.",
          "Routing to the right person. Send the enquiry, with context, straight into your CRM and to whoever should handle it, so nothing lives in one person's phone.",
        ],
      },
      { type: "h2", text: "What you should never automate" },
      {
        type: "p",
        text: "Some things should stay manual, or shouldn't happen at all. The line is roughly: if it pretends to be human attention when there isn't any, or it reaches people who never asked, don't do it.",
      },
      {
        type: "ul",
        items: [
          "Cold outreach to people who never opted in. This is the one that gets you blocked, reported, and eventually banned. It also rarely works.",
          "Mass promotional blasts to your whole list 'because we can'. Even with opt-in, hammering everyone with offers trains people to mute you.",
          "Pretending a bot is you. If someone asks a real, emotional, or high-stakes question, they should reach a human quickly, and never be strung along by a bot impersonating one.",
          "Complaints, refunds, and anything sensitive. Automate the acknowledgement, then get a person on it. An automated reply to a frustrated customer makes things worse, fast.",
        ],
      },
      {
        type: "quote",
        text: "Good WhatsApp automation isn't about sending more messages. It's about making sure the right person gets the right reply at the right moment, and that a human is one tap away the second they need one.",
      },
      { type: "h2", text: "How AI keeps it human" },
      {
        type: "p",
        text: "The old version of automation was a rigid menu: reply 1 for sales, 2 for support, 3 to go in circles. People hate it because it forces them to think like a machine. The newer approach uses AI to read what someone actually wrote, in plain Arabic or English, understand it, and respond in normal language, the way you would if you had time to answer every message in ninety seconds. Used well, it makes automation feel less robotic, not more.",
      },
      {
        type: "p",
        text: "The key word is 'used well'. AI should draft and personalise, then know its limits. It can write a warm, specific opener that references the exact thing someone asked about. It can answer the same five questions you get every day. What it should not do is bluff. A good setup has the AI hand off the moment it's unsure, when the question is about pricing for an unusual job, a complaint, or anything where being wrong is expensive. The goal is a conversation that feels human because a human is genuinely in the loop, not one that imitates a human to avoid having one.",
      },
      {
        type: "p",
        text: "Done this way, the customer often can't tell where the automation ended and you began, and that's the point. They got a fast, relevant, friendly reply. Whether the first sentence was drafted by a model or typed by you matters far less than whether it actually helped them.",
      },
      { type: "h2", text: "Try it before you trust it" },
      {
        type: "p",
        text: "You don't have to take my word for any of this. I've put the WhatsApp tools I actually use into the live AI Lab on this site, at /ai-lab, so you can see a personalised opener get written, watch a qualifying flow run, and judge for yourself whether it reads like spam or like a helpful reply. Play with it, try to break it, see where it would hand off to a human.",
      },
      {
        type: "p",
        text: "And if you want this set up properly for your own business, on the official Cloud API, wired into your CRM, with opt-in and approved templates done right so you never burn your number, that's exactly what a free 60-minute audit is for. I'll look at where your enquiries come from today, show you what's worth automating and what genuinely isn't, and give you an honest plan, whether or not you ever hire me. No blasting, no lock-in, and no pretending a bot is a person.",
      },
    ],
  },
  {
    slug: "website-cost-dubai",
    sources: [
      {
        label: "My own published prices",
        url: "/pricing",
        note: "The starting figures I quote, rather than a market average nobody can check.",
      },
    ],
    title: "How much does a website really cost in Dubai? (2026)",
    description:
      "An honest 2026 website cost guide for Dubai: AED ranges by type, what drives price, forgotten costs, and how to avoid overpaying.",
    date: "2026-06-06",
    author: "Xerxes Duane",
    readingMinutes: 7,
    body: [
      {
        type: "p",
        text: "Short answer: from what I quote and what I see quoted in Dubai, a professional website runs from around AED 1,500 for a simple landing page to AED 50,000+ for a complex custom build, with most small-business sites landing in the AED 5,000–15,000 range. These are my figures, not a surveyed average — my own published starting prices are on the pricing page. The honest longer answer, what you are actually paying for and where people quietly overpay, is below.",
      },
      { type: "h2", text: "What you are actually paying for" },
      {
        type: "p",
        text: "A website is not just a design file. The price covers strategy (what the site is for), copywriting, the design itself, the build, making it fast and mobile-friendly, basic SEO so it can be found, and testing. When one quote is a tenth of another, it is almost always because one of these is missing, usually the strategy, the copy, or the SEO.",
      },
      { type: "h2", text: "Website cost in Dubai by type (2026)" },
      {
        type: "ul",
        items: [
          "Landing page / one-pager, AED 1,500–5,000. One focused page to capture leads or launch a campaign.",
          "Standard business website, AED 5,000–15,000. Five to ten pages, mobile-friendly, an editor you can update yourself, basic SEO. Where most Dubai SMEs sit.",
          "E-commerce store, AED 12,000–40,000+. Product catalogue, online payments, shipping, and VAT-ready invoicing.",
          "Custom site or web app, AED 25,000–80,000+. Bespoke design plus integrations (CRM, ERP, bookings) and custom functionality.",
        ],
      },
      { type: "h2", text: "The costs people forget" },
      {
        type: "ul",
        items: [
          "Domain, roughly AED 40–120 per year.",
          "Hosting, roughly AED 100–1,000 per month, depending on traffic and stack.",
          "Content, professional photos, copywriting, and Arabic translation often cost more than the build if you outsource them.",
          "Maintenance, updates, security, and backups; budget around 10–20% of the build cost per year.",
          "Getting found, a site nobody visits does not pay for itself, so SEO or ads are part of the real cost.",
        ],
      },
      { type: "h2", text: "Why two quotes for 'a website' can differ 10×" },
      {
        type: "p",
        text: "A cheap template filled in over a weekend and a strategic build designed to bring in leads are both called 'a website', but they do very different jobs. The cheap option often costs more in the end: it does not rank, it does not convert, and you end up paying again to rebuild it properly a year later.",
      },
      {
        type: "quote",
        text: "A website is either a salesperson that works 24/7 or a brochure nobody reads. The price difference is usually the difference between the two.",
      },
      { type: "h2", text: "How to avoid overpaying" },
      {
        type: "ul",
        items: [
          "Get clear on the goal first, leads, sales, or credibility, before you ask anyone for a quote.",
          "Always own your domain, hosting, and accounts yourself. Never get locked in to an agency.",
          "Ask exactly what is included: copy, SEO, revisions, training, and who owns the code at the end.",
          "Match the build to your stage. Do not buy a custom web app to test an idea a landing page could validate.",
        ],
      },
      { type: "h2", text: "How long does a website take in Dubai?" },
      {
        type: "p",
        text: "A landing page can be live in a few days. A standard business website is typically two to six weeks, depending on how quickly content and feedback come back, that part is usually the bottleneck, not the build.",
      },
      { type: "h2", text: "Do I have to pay monthly?" },
      {
        type: "p",
        text: "The build itself is usually a one-off cost. Hosting and maintenance are ongoing but small. Be wary of anyone who only offers an open-ended monthly fee with no clear deliverable, and make sure you are never locked out of your own site.",
      },
      { type: "h2", text: "What it costs with Xerxes Duane" },
      {
        type: "p",
        text: "I give you a fixed quote after a free 60-minute audit, so you only pay for what actually moves your business, and you own the domain, hosting, and code. No surprise invoices, no lock-in. If a simple page is all you need, I will tell you that. Book a free audit and I will map exactly what your site should do, and what it should cost.",
      },
    ],
    relatedServices: ["web-development-dubai", "seo-dubai", "landing-page-design-dubai", "ecommerce-development-dubai"],
  },
  {
    slug: "crm-setup-mistakes-dubai",
    title: "CRM setup mistakes that cost Dubai businesses leads",
    description:
      "The CRM mistakes I see most often in Dubai small businesses, how each one quietly loses you leads, and what a CRM that actually works looks like.",
    date: "2026-06-01",
    author: "Xerxes Duane",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "A CRM is supposed to make sure no lead slips through the cracks. Set up badly, it does the opposite: it becomes a graveyard nobody updates. Here are the mistakes that cost Dubai businesses real revenue, and how to avoid them.",
      },
      { type: "h2", text: "1. Treating it as a contact list, not a process" },
      {
        type: "p",
        text: "A CRM isn't a fancy address book. If it doesn't reflect your actual sales stages, new lead, contacted, quoted, won, your team has no shared definition of what to do next, and leads stall in limbo.",
      },
      { type: "h2", text: "2. Leads that never enter the system" },
      {
        type: "p",
        text: "WhatsApp enquiries, website forms, walk-ins, and Instagram DMs that live in five inboxes never get followed up consistently. If capture isn't automatic, you're losing leads before the CRM even sees them.",
      },
      { type: "h2", text: "3. No follow-up automation" },
      {
        type: "p",
        text: "Most sales happen after several touches, but manual follow-up is the first thing that drops when everyone's busy. Without automated reminders or sequences, your hottest leads go cold while you're heads-down on delivery.",
      },
      { type: "h2", text: "4. Nobody can see the pipeline" },
      {
        type: "p",
        text: "If the owner can't glance at a dashboard and see what's in play and what's stuck, you're flying blind. Reporting that lives in someone's head isn't reporting.",
      },
      { type: "h2", text: "5. Too complex to actually use" },
      {
        type: "p",
        text: "An over-engineered CRM with 40 required fields gets abandoned. The best CRM is the one your team will actually keep updated, which usually means fewer fields, clearer stages, and automation doing the boring parts.",
      },
      {
        type: "quote",
        text: "A CRM only works when capture is automatic, the pipeline is visible, and follow-up happens whether or not anyone remembers.",
      },
      {
        type: "p",
        text: "I set up CRM (often inside Odoo) so leads capture themselves, follow-ups send themselves, and you can see the whole pipeline at a glance. A free audit will show you exactly where leads are leaking today.",
      },
    ],
    relatedServices: ["odoo-erp-dubai", "web-development-dubai", "crm-development-dubai", "custom-software-development-dubai"],
  },
  {
    slug: "odoo-enterprise-vs-community",
    sources: [
      {
        label: "Odoo editions comparison",
        url: "https://www.odoo.com/page/editions",
        note: "Odoo's own feature-by-feature split between Community and Enterprise.",
      },
      {
        label: "Odoo pricing",
        url: "https://www.odoo.com/pricing",
        note: "Current per-user licence pricing, direct from Odoo.",
      },
    ],
    title: "Do you need Odoo Enterprise, or is Community enough?",
    description:
      "A no-spin guide to choosing between Odoo Community and Enterprise for a small business: what you get, what you give up, and how to decide without overpaying.",
    date: "2026-05-30",
    author: "Xerxes Duane",
    readingMinutes: 5,
    body: [
      {
        type: "p",
        text: "Odoo comes in two editions, and the choice trips up a lot of small businesses. Pick wrong and you either overpay for licenses you don't use, or fight Community to do something Enterprise handles out of the box. Here's the honest breakdown.",
      },
      { type: "h2", text: "What Community gives you (free)" },
      {
        type: "p",
        text: "Odoo Community is open-source and genuinely capable: CRM, sales, invoicing, basic inventory, website, and more. For many small businesses starting out, it covers the essentials without a per-user license fee.",
      },
      { type: "h2", text: "What Enterprise adds (paid)" },
      {
        type: "ul",
        items: [
          "Polished, faster interfaces and mobile apps.",
          "Studio (low-code customization) and more advanced accounting.",
          "Official Odoo support and hosting options.",
          "Features like full double-entry accounting, advanced reporting, and more integrations.",
        ],
      },
      { type: "h2", text: "How to actually decide" },
      {
        type: "ul",
        items: [
          "Will you rely on advanced accounting or just basic invoicing?",
          "Do you need official support, or a consultant who runs it for you?",
          "How many users, and is the per-user cost justified by the time it saves?",
          "Do the Enterprise-only modules map to things you'll genuinely use?",
        ],
      },
      {
        type: "quote",
        text: "The right edition is the one that fits how you work today, with room to grow, not the one with the longest feature list.",
      },
      {
        type: "p",
        text: "I'm not an official Odoo Partner, which means I have no incentive to push you toward Enterprise. In a free audit I'll tell you honestly which edition fits, and what it'll actually cost.",
      },
    ],
    relatedServices: ["odoo-erp-dubai", "custom-software-development-dubai"],
  },
  {
    slug: "choosing-a-web-developer-dubai",
    title: "How to choose a web developer in Dubai",
    description:
      "The questions to ask, the red flags to avoid, and what good looks like when hiring a web developer in Dubai, so you own your site and it actually performs.",
    date: "2026-05-28",
    author: "Xerxes Duane",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "Plenty of Dubai businesses have been burned by a web project, locked out of their own site, ghosted after launch, or handed something pretty that brings in nothing. Here's how to choose well.",
      },
      { type: "h2", text: "Ask: do I own everything?" },
      {
        type: "p",
        text: "Your domain, hosting, code, and accounts should all be in your name. If a developer keeps you locked out 'for convenience,' that's a red flag. Ownership is non-negotiable.",
      },
      { type: "h2", text: "Ask: what happens after launch?" },
      {
        type: "p",
        text: "Launch is the start, not the finish. Ask who fixes things, who you call, and what support looks like in month six. A good partner is still reachable years later.",
      },
      { type: "h2", text: "Ask: is it built to be found?" },
      {
        type: "p",
        text: "A site that isn't fast, mobile-first, and structured for search is a brochure nobody reads. Ask how they handle performance and SEO from day one, not as an afterthought.",
      },
      { type: "h2", text: "Red flags to watch for" },
      {
        type: "ul",
        items: [
          "No fixed quote, or pricing that keeps moving.",
          "Vague answers about ownership and access.",
          "All style, no questions about your business goals.",
          "No examples of work that actually performs.",
        ],
      },
      {
        type: "quote",
        text: "A good web partner asks about your business before they talk about design, and hands you the keys when it's done.",
      },
      {
        type: "p",
        text: "I quote fixed, build fast, and set everything up in your name, start to finish. If you're weighing up a web project, a free audit will tell you what's worth keeping and what isn't.",
      },
    ],
    relatedServices: ["web-development-dubai", "seo-dubai", "landing-page-design-dubai", "mobile-app-development-dubai"],
  },
  {
    slug: "how-much-does-odoo-cost-dubai",
    sources: [
      {
        label: "Odoo pricing",
        url: "https://www.odoo.com/pricing",
        note: "The licence half of the number. Implementation is quoted separately.",
      },
      {
        label: "Odoo editions comparison",
        url: "https://www.odoo.com/page/editions",
        note: "What the paid edition adds over the free one.",
      },
    ],
    title: "How much does Odoo cost for a small business in Dubai?",
    description:
      "A plain-English breakdown of what Odoo actually costs a Dubai small business: licences, implementation and the costs nobody mentions up front.",
    date: "2026-06-01",
    author: "Xerxes Duane",
    readingMinutes: 6,
    body: [
      {
        type: "p",
        text: "It's the first question almost every owner asks, and the honest answer is: it depends, but not as much as agencies make it sound. Here's how Odoo pricing actually breaks down for a small business in Dubai, in plain numbers, so you can budget with your eyes open.",
      },
      { type: "h2", text: "The three costs that actually matter" },
      {
        type: "p",
        text: "Most quotes blur these together so the total looks like one scary number. Separate them and it gets manageable:",
      },
      {
        type: "ul",
        items: [
          "Licenses, what you pay Odoo per user, per month.",
          "Implementation, the one-time cost to configure it around your business.",
          "Support, ongoing help once you're live (optional, but most small teams want it).",
        ],
      },
      { type: "h2", text: "1. Licenses: Community vs Enterprise" },
      {
        type: "p",
        text: "Odoo Community is free and open-source. For many small businesses it genuinely covers the basics: CRM, sales, inventory, and invoicing. Odoo Enterprise adds polished features, mobile apps, and official support, billed per user per month. The trap is paying for Enterprise when Community plus a little configuration would have done the job, or the reverse, forcing Community to do things that justify the Enterprise upgrade.",
      },
      {
        type: "quote",
        text: "The cheapest license is the one that fits, not the one with the lowest sticker. I'll tell you which edition you actually need.",
      },
      { type: "h2", text: "2. Implementation: where the real range is" },
      {
        type: "p",
        text: "This is the part that varies, because it depends on how much of your business you want connected. A single module configured cleanly is a modest, fixed-scope project. A full deployment, sales, inventory, purchasing, accounting, and a website talking to each other, is more, but it replaces the patchwork of apps and spreadsheets you're already paying for.",
      },
      {
        type: "p",
        text: "I scope this as a fixed quote up front, phased so you see value before everything is switched on. No open-ended hourly meters.",
      },
      { type: "h2", text: "3. The hidden costs nobody quotes" },
      {
        type: "ul",
        items: [
          "Data migration, getting your existing customers, products, and history in cleanly.",
          "Training, so your team actually uses the system instead of working around it.",
          "The cost of doing nothing, the hours lost every week to re-keying data between disconnected tools.",
        ],
      },
      { type: "h2", text: "So what should you budget?" },
      {
        type: "p",
        text: "Start with a free systems audit. I look at what you run today, tell you which Odoo edition fits, and give you a fixed-price plan for the implementation, before you commit to anything. You walk away with the numbers and a clear map, whether or not you hire me.",
      },
    ],
    relatedServices: ["odoo-erp-dubai", "custom-software-development-dubai"],
  },
  {
    slug: "odoo-vs-zoho-uae",
    sources: [
      {
        label: "Odoo pricing",
        url: "https://www.odoo.com/pricing",
      },
      {
        label: "Zoho CRM pricing",
        url: "https://www.zoho.com/crm/pricing/",
      },
      {
        label: "Zoho One pricing",
        url: "https://www.zoho.com/one/pricing/",
      },
    ],
    title: "Odoo vs Zoho for UAE small businesses",
    description:
      "A practical comparison of Odoo and Zoho for small businesses in the UAE, where each one wins, where each one hurts, and how to choose without the sales spin.",
    date: "2026-05-26",
    author: "Xerxes Duane",
    readingMinutes: 7,
    body: [
      {
        type: "p",
        text: "Both Odoo and Zoho promise to run your whole business from one place. Both can. The right answer depends less on features and more on how you actually work, and how much you want connected. Here's the honest version.",
      },
      { type: "h2", text: "Where Zoho tends to win" },
      {
        type: "ul",
        items: [
          "You mostly need CRM, email, and a few light apps, fast.",
          "You want predictable per-app pricing and a gentle learning curve.",
          "You don't need deep manufacturing, complex inventory, or heavy customization.",
        ],
      },
      { type: "h2", text: "Where Odoo tends to win" },
      {
        type: "ul",
        items: [
          "You want one tightly integrated system: sales, inventory, purchasing, accounting, and a website that all talk.",
          "You need real operational depth, manufacturing, multi-step inventory, project costing.",
          "You want to own and customize the system around your exact workflow.",
        ],
      },
      {
        type: "quote",
        text: "Zoho is often faster to switch on. Odoo usually goes deeper once your operations get complex. Neither is 'better', they're built for different stages.",
      },
      { type: "h2", text: "The questions that actually decide it" },
      {
        type: "ul",
        items: [
          "How many of your tools do you want in one system, two, or ten?",
          "Is inventory or manufacturing central to your business, or a side concern?",
          "Do you want to customize deeply, or keep it simple and standard?",
          "What's your in-house appetite to administer it (or do you want it run for you)?",
        ],
      },
      {
        type: "p",
        text: "I work hands-on with Odoo, so I'll tell you honestly when Zoho (or even a lighter setup) is the smarter fit for where you are. The audit exists to answer exactly this, before you spend a dirham on licenses.",
      },
    ],
    relatedServices: ["odoo-erp-dubai", "crm-development-dubai"],
  },
  {
    slug: "signs-outgrown-spreadsheets",
    title: "5 signs your business has outgrown spreadsheets",
    description:
      "Spreadsheets quietly cost growing businesses hours and lost revenue. Five clear signs it's time to move to a proper system, and what to do about it.",
    date: "2026-05-19",
    author: "Xerxes Duane",
    readingMinutes: 5,
    body: [
      {
        type: "p",
        text: "Spreadsheets are brilliant until they aren't. For most growing businesses, the moment they become the bottleneck creeps up quietly. Here are the five signs I see most often.",
      },
      { type: "h2", text: "1. The same number lives in three places" },
      {
        type: "p",
        text: "Stock levels in one sheet, sales in another, invoices in a third, and they never quite agree. If your team re-keys the same data between files, you're paying for that twice and trusting it less each time.",
      },
      { type: "h2", text: "2. Only one person really understands 'the file'" },
      {
        type: "p",
        text: "When a single master spreadsheet is held together by one person's formulas, you have a single point of failure, not a system. Holidays and resignations become emergencies.",
      },
      { type: "h2", text: "3. You find out about problems too late" },
      {
        type: "p",
        text: "Stockouts, overdue invoices, leads that went cold, by the time they show up in a sheet, the damage is done. A real system surfaces them while you can still act.",
      },
      { type: "h2", text: "4. Reporting takes hours, not clicks" },
      {
        type: "p",
        text: "If pulling a simple month-end picture means an afternoon of copy-paste, you're spending your most expensive hours on admin instead of decisions.",
      },
      { type: "h2", text: "5. Growth makes it worse, not easier" },
      {
        type: "p",
        text: "More orders, staff, or products should feel like progress. If each one adds spreadsheet pain, the tools are now working against the growth.",
      },
      {
        type: "quote",
        text: "You don't need more spreadsheets. You need them to become one system that tells you the truth in real time.",
      },
      {
        type: "p",
        text: "If two or more of these sound familiar, a free systems audit will show you exactly where the time and money are leaking, and the fastest way to fix it.",
      },
    ],
    relatedServices: ["odoo-erp-dubai", "ai-automation-dubai", "crm-development-dubai", "custom-software-development-dubai"],
  },
  {
    slug: "what-a-systems-audit-covers",
    title: "What a free systems audit actually covers",
    description:
      "No jargon, no sales pitch: exactly what happens in a free 60-minute systems audit with Xerxes Duane, and the plain-English map you walk away with.",
    date: "2026-05-12",
    author: "Xerxes Duane",
    readingMinutes: 4,
    body: [
      {
        type: "p",
        text: "Free audit can sound like code for a sales call. Mine isn't. Here's exactly what the 60 minutes covers and what you leave with, whether or not you ever hire me.",
      },
      { type: "h2", text: "Before the call" },
      {
        type: "p",
        text: "I confirm a time on WhatsApp and ask one question: what's the tech thing on your mind right now? That's it. No forms, no prep homework.",
      },
      { type: "h2", text: "During the 60 minutes" },
      {
        type: "ul",
        items: [
          "A screen-share walk through your current website, tools, and workflow.",
          "Where your systems don't talk to each other, and what that's costing you.",
          "The quick wins you can action immediately, in order of impact.",
          "Honest answers, including 'you don't need me for that' where it's true.",
        ],
      },
      { type: "h2", text: "What you walk away with" },
      {
        type: "ul",
        items: [
          "A plain-English map of how your systems connect (or don't).",
          "Your top three quick wins, prioritized.",
          "A fixed-price plan, only if you want me to build it.",
        ],
      },
      {
        type: "quote",
        text: "The map and the quick wins are yours to keep. No obligation, no jargon, no hard sell.",
      },
      {
        type: "p",
        text: "That's the whole thing. If it's useful, we'll talk about building it. If it's not, you still leave with a clearer picture than you came in with.",
      },
    ],
    relatedServices: ["odoo-erp-dubai", "web-development-dubai", "ai-automation-dubai", "seo-dubai", "crm-development-dubai", "custom-software-development-dubai"],
  },
];

export function getInsight(slug: string): InsightPost | undefined {
  return INSIGHTS.find((p) => p.slug === slug);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Deterministic date format (no locale, so SSR and client always match). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
