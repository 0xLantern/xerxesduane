/**
 * #HACK2026 Dubai team pages on ministry.xerxesduane.com (see api/hack-teams/_lib.ts).
 *
 *   /ht                      the Champions' panel (owner login)
 *   /ht/champion/<secret>    a co-Champion's panel
 *   /ht/<code>               one participant's page: the challenge picker, then their team
 *
 * This bundle holds no brief. The full briefs arrive from the server only for
 * a member of that team, so reading the JavaScript tells nobody anything the
 * public /hack page doesn't already say.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import Member from "./Member";
import Panel from "./Panel";

const path = window.location.pathname;
const champion = /^\/ht\/champion\/([^/]+)\/?$/.exec(path)?.[1];
const code = champion ? undefined : /^\/ht\/([^/]+)\/?$/.exec(path)?.[1];
if (!code) document.title = "Team pages";

createRoot(document.getElementById("teams-root")!).render(
  <StrictMode>{code ? <Member code={code} /> : <Panel champion={champion} />}</StrictMode>,
);
