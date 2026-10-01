// Asserts the data joins that fail silently: the rate card against everything
// that reads it, and each service page's case-study reference against the
// case studies themselves.
//
// Run: npm run check:pricing  (also runs as part of npm run build)
//
// Why this exists. Prices reach the page through two joins: by service title
// for the cards on the home page, and by service page slug for the headers and
// the Schema.org offers. Both fail silently. A mistyped title just renders a
// card with no price, and a mistyped slug ships a Service node with no offer,
// which looks fine to everyone except the search engines the prices are there
// for. That exact bug was written and caught by hand once; this is so it cannot
// be shipped a second time.
//
// The charity check is arithmetic rather than a join, but it belongs here for
// the same reason: a wrong number on this site is a promise to a stranger.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const fail = [];
const check = (ok, message) => {
  if (!ok) fail.push(message);
};

// Rate card entries, straight out of the source.
const pricing = read("src/data/pricing.ts");
const card = [...pricing.matchAll(
  /\{ service: "([^"]+)",(?: pageSlug: "([^"]+)",)? from: (\d+), unit: "(\w+)" \}/g,
)].map((m) => ({ service: m[1], pageSlug: m[2], from: Number(m[3]), unit: m[4] }));

// The point is that the regex above matched every entry, not that the rate
// card is a particular length: services come and go (videography did), and a
// hard count just fails the build on a deliberate edit.
//
// Counted inside the array body, and deliberately independent of formatting.
// A first attempt counted "{ service:" on one line, which moved in step with
// the parser when an entry was reformatted onto several lines, so the two
// agreed on a wrong answer and the check passed.
const cardBody = /RATE_CARD: PricePoint\[\] = \[([\s\S]*?)\n\];/.exec(pricing)?.[1] ?? "";
const declared = (cardBody.match(/\bservice:/g) || []).length;
check(
  card.length === declared && card.length > 0,
  `parsed ${card.length} rate card entries but ${declared} are declared; the pattern missed one`,
);

// 1. Every service title must exist in SERVICES, or the home cards lose their price.
const content = read("src/data/content.ts");
const serviceBlock = content.slice(content.indexOf("const SERVICE_DEFS"));
const titles = new Set(
  [...serviceBlock.matchAll(/title: "([^"]+)"/g)].map((m) => m[1]),
);
for (const p of card) {
  check(titles.has(p.service), `rate card names "${p.service}", which is not a title in SERVICES`);
}

// 2. Every pageSlug must exist, or that page ships a Service node with no offer.
const pages = read("src/data/servicePages.ts");
const slugs = new Set([...pages.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));
for (const p of card) {
  if (!p.pageSlug) continue;
  check(slugs.has(p.pageSlug), `rate card points at page "${p.pageSlug}", which does not exist`);
}

// 3. Prices must be sane: positive, whole dirhams, and a unit the formatter knows.
const UNITS = new Set(["project", "month", "day", "video"]);
for (const p of card) {
  check(p.from > 0 && Number.isInteger(p.from), `${p.service} has a non-integer or zero price`);
  check(UNITS.has(p.unit), `${p.service} uses unit "${p.unit}", which has no label or schema mapping`);
}

// 4. The charity rate must halve cleanly, or the published table shows fractions
//    of a dirham next to a real one.
const rate = Number(/rate: ([\d.]+),/.exec(pricing)?.[1]);
check(rate > 0 && rate < 1, `non-profit rate is ${rate}, which is not a discount`);
for (const p of card) {
  const discounted = p.from * rate;
  check(
    Number.isInteger(discounted),
    `${p.service} at ${p.from} x ${rate} gives ${discounted}, which is not a whole dirham`,
  );
}

// 5. Figures hard-coded into prose must be a price the site actually charges.
//    These are written out for the FAQ answers an assistant quotes, so a stale
//    one is a number the site states and will not honour.
//
//    Two legitimate sources, not one: the rate card, and the package prices,
//    which are set independently (The Build starts at AED 5,000, which is not
//    any single service's floor). Half of either is legitimate too, because
//    that is the charity rate.
const packageMatches = [...content.matchAll(/price: "(?:from )?AED ([\d,]+)"/g)].map((m) =>
  Number(m[1].replace(/,/g, "")),
);
// Count matches, not distinct values: two packages legitimately share
// AED 2,500, and deduping them first made this assertion fail on correct data.
check(
  packageMatches.length >= 2,
  `parsed only ${packageMatches.length} package prices, expected at least 2`,
);
// The Starter's price is derived from STARTER in pricing.ts rather than typed
// into PACKAGES, so pick it up from there or every figure quoting it fails.
const starterPrice = Number(/price: (\d+),/.exec(pricing)?.[1]);
check(starterPrice > 0, "could not read STARTER.price from pricing.ts");
packageMatches.push(starterPrice);
const packagePrices = new Set(packageMatches);
const amounts = new Set([...card.map((p) => p.from), ...packagePrices]);
const prose = [
  ["src/data/pricing.ts", pricing],
  ["src/lib/seo.ts", read("src/lib/seo.ts")],
  ["src/data/content.ts", content],
];
for (const [where, text] of prose) {
  for (const m of text.matchAll(/aed\((\d+)\)/g)) {
    const n = Number(m[1]);
    check(
      amounts.has(n) || amounts.has(n * 2),
      `${where} writes aed(${n}), which is not a published price or half of one`,
    );
  }
  for (const m of text.matchAll(/AED ([\d,]{3,})/g)) {
    const n = Number(m[1].replace(/,/g, ""));
    check(
      amounts.has(n) || amounts.has(n * 2),
      `${where} writes "AED ${m[1]}", which is not a published price or half of one`,
    );
  }
}

/* ---------------------------------------------------------------------------
 * The same class of bug, one file over: a join between two data files that
 * fails silently.
 *
 * `ServicePageData.caseStudyClient` has to match a `CASE_STUDIES` client name
 * exactly, and `ServicePage` resolves it with `.find()`. A name that matches
 * nothing yields `undefined`, and the page simply renders no proof block —
 * looking, in the source, exactly like a page that has proof.
 * `/ecommerce-development-dubai` named "Gilani Mobility", a portfolio client
 * with no case study, and shipped that way.
 *
 * Checked here rather than in the type system because every type-level version
 * costs more than it is worth: a `: CaseStudy[]` annotation widens `client` to
 * `string`, `satisfies` alone does not stop that widening, and `as const` turns
 * the array into a tuple whose members no longer share the optional `scope` and
 * `stats` fields `ServicePage` reads.
 * ------------------------------------------------------------------------- */
{
  const content = read("src/data/content.ts");
  const services = read("src/data/servicePages.ts");
  const clients = new Set([...content.matchAll(/^    client: "([^"]+)"/gm)].map((m) => m[1]));
  const referenced = [...services.matchAll(/caseStudyClient: "([^"]+)"/g)].map((m) => m[1]);
  check(clients.size > 0, "no CASE_STUDIES clients found — has content.ts moved?");
  for (const name of referenced) {
    check(
      clients.has(name),
      `a service page names caseStudyClient "${name}", which is not a CASE_STUDIES client — that page will render no proof`,
    );
  }
  var caseStudyJoins = referenced.length;
}

if (fail.length) {
  console.error(`Data check failed (${fail.length}):`);
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `  pricing ok: ${card.length} services + ${packageMatches.length} packages, all joined, charity rate ${rate * 100}%; ${caseStudyJoins} case-study reference(s) resolve`,
);
