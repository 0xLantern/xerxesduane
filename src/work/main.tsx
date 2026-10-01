/**
 * Entry point for work.xerxesduane.com, the hours log (see api/work/_lib.ts).
 *
 * A page of its own, built from work.html rather than the site's prerendered
 * shell: no navigation, no analytics, no consent banner, nothing indexed. It
 * shares the site's stylesheet so it looks like the same studio.
 *
 *   /           the owner's log (sign in, timer, entries)
 *   /r/<token>  the client's read-only view
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import Owner from "./Owner";
import Report from "./Report";

const path = window.location.pathname;
const share = /^\/r\/([A-Za-z0-9_-]{16,})\/?$/.exec(path);

createRoot(document.getElementById("work-root")!).render(
  <StrictMode>{share ? <Report token={share[1]} /> : <Owner />}</StrictMode>,
);
