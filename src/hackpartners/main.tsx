/**
 * #HACK2026 Dubai partner page on ministry.xerxesduane.com (see api/hack-partners/_lib.ts).
 *
 *   /hp                  the owner's panel: make, track and revoke personal links
 *   /hp/team/<secret>    a co-Champion's own panel (their links only)
 *   /hp/<code>           one person's private page
 *
 * This bundle holds no partner content. The words arrive from the server only
 * for a valid link, so reading the JavaScript tells nobody anything.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import Owner from "./Owner";
import Reader from "./Reader";

const path = window.location.pathname;
const team = /^\/hp\/team\/([^/]+)\/?$/.exec(path)?.[1];
const code = team ? undefined : /^\/hp\/([^/]+)\/?$/.exec(path)?.[1];
if (!code) document.title = "Partner links";

createRoot(document.getElementById("partners-root")!).render(
  <StrictMode>{code ? <Reader code={code} /> : <Owner team={team} />}</StrictMode>,
);
