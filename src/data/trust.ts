/**
 * Trust / social-proof signals — single source of truth.
 *
 * Everything here is OFF until `enabled: true` and real values are filled in.
 * Do NOT publish invented numbers or a fake rating — Google penalises
 * self-serving review markup, and false claims erode the exact trust we want.
 *
 * To go live:
 *   1. Fill the real values below (see "HOW TO GET" notes).
 *   2. Set `enabled: true`.
 *   3. Deploy. The <GoogleRating /> badge then renders in the contact section.
 *   4. (Optional) Once you have genuine Google reviews, ask to add an
 *      `aggregateRating` node to the Organization JSON-LD in index.html.
 */
export interface TrustConfig {
  enabled: boolean;
  /** e.g. 40 — businesses helped. Count real, nameable clients. */
  clientCount: number | null;
  /** Founding year, already shown elsewhere as "since 2019". */
  since: number;
  /** Real Google Business Profile rating, or null to hide. */
  google: {
    rating: number; // e.g. 4.9  (HOW TO GET: your Google Business Profile)
    reviewCount: number; // e.g. 27
    url: string; // public reviews link (share.google/… already in schema)
  } | null;
  /** Client logo files placed in /public/brand/clients/. */
  logos: { name: string; src: string }[];
}

export const TRUST: TrustConfig = {
  // Logos are real files in /public/brand/clients/, so the logo wall is on.
  // Google rating is live only because it now points to a real public profile.
  enabled: true,
  clientCount: 50,
  since: 2019,
  google: {
    rating: 5,
    reviewCount: 6,
    url: "https://maps.app.goo.gl/PkEG4G2868SfcfGw8",
  },
  logos: [
    { name: "Gilani Mobility", src: "/brand/clients/gilani-mobility.png" },
    { name: "We Aspire", src: "/brand/clients/we-aspire.png" },
    { name: "AYA Home Spa", src: "/brand/clients/aya-home-spa.png" },
    { name: "Caronic", src: "/brand/clients/caronic.png" },
    { name: "Blocktec", src: "/brand/clients/blocktec.png" },
    { name: "Wellington Cash for Cars", src: "/brand/clients/wellington.png" },
    { name: "Gilani Motors", src: "/brand/clients/gilani-motors.png" },
    { name: "Al Mumtaz", src: "/brand/clients/al-mumtaz.png" },
  ],
};
