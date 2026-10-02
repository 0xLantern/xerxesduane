/**
 * ministry.xerxesduane.com partner letters (see api/letters/_lib.ts).
 *
 *   /letters      the owner's desk: publish a PDF letter, partners, settings
 *   /l/<copyId>   a partner's private copy; the key is in the # fragment
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import Desk from "./Desk";
import Reader from "./Reader";

const copy = /^\/l\/([^/]*)\/?$/.exec(window.location.pathname);
if (!copy) document.title = "Partner letters";

createRoot(document.getElementById("letters-root")!).render(
  <StrictMode>{copy ? <Reader copyId={copy[1]} /> : <Desk />}</StrictMode>,
);
