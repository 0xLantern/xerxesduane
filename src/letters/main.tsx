/**
 * ministry.xerxesduane.com partner letters (see api/letters/_lib.ts).
 *
 *   /letters      the writer's desk: letters, partners, settings
 *   /l/<copyId>   a partner's private copy; the key is in the # fragment
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import Desk from "./Desk";
import Reader from "./Reader";

const copy = /^\/l\/([A-Za-z0-9_-]{8,40})\/?$/.exec(window.location.pathname);

createRoot(document.getElementById("letters-root")!).render(
  <StrictMode>{copy ? <Reader copyId={copy[1]} /> : <Desk />}</StrictMode>,
);
