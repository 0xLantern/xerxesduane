/**
 * Private ministry briefing on ministry.xerxesduane.com (see api/join/_lib.ts).
 *
 *   /join          the owner's panel: make, track and revoke personal links
 *   /join/<code>   one person's private briefing
 *
 * This bundle holds no briefing content. It arrives sealed (public/jb/brief.dat)
 * and its key comes from the server only for a valid link, so reading the
 * JavaScript or the repository tells nobody anything.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "./brief.css";
import Owner from "./Owner";
import Reader from "./Reader";

const code = /^\/join\/([^/]+)\/?$/.exec(window.location.pathname)?.[1];
if (!code) document.title = "Briefing links";

createRoot(document.getElementById("join-root")!).render(<StrictMode>{code ? <Reader code={code} /> : <Owner />}</StrictMode>);
