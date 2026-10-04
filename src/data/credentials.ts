/**
 * Certifications, partner badges and qualifications — real ones only.
 *
 * EMPTY ON PURPOSE. The Credentials tile on the homepage renders only when
 * this array has entries, and the board rebalances around it when it doesn't,
 * so an unfilled list costs nothing and claims nothing. A certification is the
 * kind of thing a prospect checks, so an invented one is worse than a missing
 * one.
 *
 * To add one:
 *
 *   { name: "Odoo Certified v17", issuer: "Odoo", year: 2025,
 *     href: "https://…verification-url" }
 *
 * `href` should point at something a stranger can verify — the issuer's
 * directory entry or a credential page. Leave it off rather than linking
 * somewhere that doesn't prove anything. Drop a square logo into
 * /public/brand/credentials/ and name it in `logo` if the issuer has one.
 */
export interface Credential {
  /** The certification as the issuer words it. */
  name: string;
  /** Who awarded it. */
  issuer: string;
  /** Year awarded, or omitted if it isn't dated. */
  year?: number;
  /** A public page a stranger could check it against. */
  href?: string;
  /** Path under /public, e.g. "/brand/credentials/odoo.png". */
  logo?: string;
}

export const CREDENTIALS: Credential[] = [
  {
    // Certification code 1e510fd37d8040da89102e0710922cab, valid to Oct 31 2028.
    name: "Social Media Certified",
    issuer: "HubSpot Academy",
    year: 2026,
    href: "/brand/credentials/hubspot-social-media.png",
    logo: "/brand/credentials/hubspot-logo.png",
  },
  {
    // Certificate 10113cefe8 (Exam id-35), expires 02.10.2027.
    name: "Master Your Brand Voice",
    issuer: "Semrush Academy",
    year: 2026,
    href: "/brand/credentials/semrush-brand-voice.pdf",
    logo: "/brand/credentials/semrush-logo.png",
  },
];
