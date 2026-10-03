/**
 * ministry.xerxesduane.com partner letters (see api/letters/_lib.ts).
 *
 *   /letters        the owner's desk: publish a PDF letter, partners, settings, prayer requests
 *   /l/<copyId>     a partner's private copy; the key is in the # fragment
 *   /pray/<token>   the prayer team's page: open requests, and the answered ones
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import Desk from "./Desk";
import Prayer from "./Prayer";
import Reader from "./Reader";

const copy = /^\/l\/([^/]*)\/?$/.exec(window.location.pathname);
const pray = /^\/pray\/([^/]*)\/?$/.exec(window.location.pathname);
if (!copy) document.title = pray ? "Prayer requests" : "Partner letters";

createRoot(document.getElementById("letters-root")!).render(
  <StrictMode>{copy ? <Reader copyId={copy[1]} /> : pray ? <Prayer token={pray[1]} /> : <Desk />}</StrictMode>,
);
