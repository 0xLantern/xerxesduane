import { useCallback, useEffect, useState, type ReactNode } from "react";
import { greetName } from "../hackpartners/greet";

/**
 * The owner's panel for the private briefing: one personal link per person.
 * Signed in with the /letters login (the cookie is per host, and both live on
 * ministry.xerxesduane.com). Same shape as the #HACK partner panel (/hp).
 */

type Kind = "join" | "talk" | "pray" | "notnow";
type Row = {
  code: string;
  name: string;
  createdAt: number;
  openedAt: number | null;
  link: string;
  devices: number;
  countries: string[];
  response?: { kind: Kind; at: number };
};
type List = { invites: Row[]; ready: boolean };

const INK = "#1c2a44";
const GOLD = "#b8862b";

const when = (t: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dubai" }).format(new Date(t));

/** What goes to the person. Plain on purpose, in case the chat is ever seen: the page explains everything. */
const message = (name: string, link: string) =>
  [
    `Hi ${greetName(name)}! 😊`,
    "",
    "I've been praying about who to invite into something close to my heart, and you came to mind.",
    "",
    "I made a short private page just for you that explains what we're doing and where you might fit:",
    link,
    "",
    "Please read it when you have a quiet moment. It opens only for you, so please don't forward it. No pressure at all, and if you have any questions, just message me here.",
    "",
    "Thank you, friend. 🙏",
    "Xerxes",
  ].join("\n");

const reminder = (name: string, link: string) =>
  [
    `Hi ${greetName(name)}! 😊 Just a gentle follow-up on the private page I sent. No rush and no pressure at all, read it when you have a quiet moment:`,
    link,
    "",
    "If you have any questions, I'm here. Thank you, friend 🙏",
    "Xerxes",
  ].join("\n");

type Status = Kind | "opened" | "unopened";
const STATUS: Record<Status, { label: string; style: { background: string; color: string } }> = {
  join: { label: "Wants to join", style: { background: "#16a34a", color: "#fff" } },
  talk: { label: "Wants to talk", style: { background: "#86efac", color: "#14532d" } },
  pray: { label: "Praying", style: { background: "#dbeafe", color: "#1e3a8a" } },
  notnow: { label: "Not right now", style: { background: "#e5e5e5", color: "#404040" } },
  opened: { label: "Opened, no answer yet", style: { background: "#fbf0d6", color: "#713f12" } },
  unopened: { label: "Not opened yet", style: { background: "#fee2e2", color: "#7f1d1d" } },
};
const status = (r: Row): Status => r.response?.kind ?? (r.openedAt ? "opened" : "unopened");

const btn = "rounded-full px-3 py-1.5 text-[0.8rem] font-semibold transition hover:-translate-y-0.5 disabled:opacity-50";

export default function Owner() {
  const [state, setState] = useState<"loading" | "login" | "off" | "error" | "ready">("loading");
  const [list, setList] = useState<List | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const call = useCallback(async <T,>(method: "GET" | "POST", body?: unknown) => {
    const res = await fetch("/api/join/invites", {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    return { ok: res.ok, status: res.status, data };
  }, []);

  const load = useCallback(async () => {
    const r = await call<List>("GET");
    if (r.status === 401) return setState("login");
    if (r.status === 503) return setState("off");
    if (r.ok) {
      setList(r.data);
      setState("ready");
    } else {
      setNote(r.data.error ?? "Couldn't load the links. Reload to try again.");
      setState("error");
    }
  }, [call]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only init
    load();
  }, [load]);

  const act = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    setNote("");
    const r = await call<{ invite?: Row }>("POST", body);
    setBusy(false);
    if (!r.ok) return setNote(r.data.error ?? "That didn't work. Try again.");
    setNote(done);
    if (body.action === "create" && r.data.invite) {
      try {
        await navigator.clipboard.writeText(message(r.data.invite.name, r.data.invite.link));
        setNote(`Link for ${r.data.invite.name} made, and the message is copied. Paste it into WhatsApp.`);
      } catch {
        /* the WhatsApp button on the row still works */
      }
    }
    load();
  };

  if (state === "loading") return <Shell><p className="text-[#4a5468]">Loading…</p></Shell>;
  if (state === "error") return <Shell><p className="text-[#4a5468]">{note}</p></Shell>;
  if (state === "off") return <Shell><p className="text-[#4a5468]">The owner login isn't set up on this site yet.</p></Shell>;
  if (state === "login")
    return (
      <Shell>
        <h1 className="font-display text-[1.4rem] font-bold" style={{ color: INK }}>Briefing links</h1>
        <p className="mt-2 text-[#4a5468]">
          Sign in on{" "}
          <a href="/letters" className="underline" style={{ color: GOLD }}>
            the letters desk
          </a>{" "}
          with your owner login, then come back here.
        </p>
        <p className="mt-6 text-[0.85rem] text-[#7a8296]">If you were sent a personal link, open that link instead. This address shows nothing on its own.</p>
      </Shell>
    );

  return (
    <Shell wide>
      <h1 className="font-display text-[1.5rem] font-bold" style={{ color: INK }}>Private briefing links</h1>
      <p className="mt-1 text-[0.9rem] text-[#4a5468]">
        One private link per person you'd like to invite onto the team. Each opens on one device only, the first one to open it, and works until you revoke it. You get an email when a link is first opened, when someone answers, and when a link is tried on another device.
      </p>
      {list && !list.ready && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[0.85rem] text-red-800">
          The briefing's key isn't set on Vercel yet (JOIN_BRIEF_KEY), so links will say "not ready". You can still make them now.
        </p>
      )}

      <form
        className="mt-5 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) act({ action: "create", name }, "Link made.").then(() => setName(""));
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Who is it for? e.g. Maria Santos"
          maxLength={60}
          className="min-w-0 flex-1 rounded-full border border-[#e6dfd2] bg-white px-4 py-2 text-[#1c2a44] placeholder:text-[#9aa1b0] focus:outline-none focus:ring-2"
        />
        <button type="submit" disabled={busy || !name.trim()} className={btn} style={{ background: INK, color: "#fff" }}>
          Make a link
        </button>
      </form>

      {list && list.invites.length > 0 && (
        <p className="mt-4 flex flex-wrap gap-1.5 text-[0.8rem]">
          {(Object.keys(STATUS) as Status[]).map((s) => {
            const n = list.invites.filter((r) => status(r) === s).length;
            return n ? (
              <span key={s} className="rounded-full px-2.5 py-0.5 font-bold" style={STATUS[s].style}>
                {STATUS[s].label}: {n}
              </span>
            ) : null;
          })}
        </p>
      )}

      {note && <p className="mt-3 text-[0.88rem] font-semibold" style={{ color: GOLD }} aria-live="polite">{note}</p>}

      <ul className="mt-4 space-y-2">
        {list?.invites.length === 0 && <li className="text-[#7a8296]">No links yet. Make the first one above.</li>}
        {list?.invites.map((r) => (
          <li key={r.code} className="rounded-2xl border border-[#e6dfd2] bg-white p-4 text-[#1c2a44]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-[1.05rem] font-bold">{r.name}</p>
              <p className="text-[0.78rem] text-[#6a6a6a]">
                {r.openedAt ? `Opened ${when(r.openedAt)}` : "Not opened yet"} · {r.devices ? "Device in use" : "No device yet"}
                {r.countries.length ? ` · ${r.countries.join(", ")}` : ""}
              </p>
            </div>
            <p className="mt-2">
              <span className="inline-block rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold" style={STATUS[status(r)].style}>
                {STATUS[status(r)].label}
              </span>
              {r.response && <span className="ml-2 text-[0.75rem] text-[#6a6a6a]">{when(r.response.at)}</span>}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!r.response && r.openedAt && (
                <a href={`https://wa.me/?text=${encodeURIComponent(reminder(r.name, r.link))}`} target="_blank" rel="noopener noreferrer" className={btn} style={{ background: "#fbf0d6", color: INK }}>
                  Send a gentle reminder
                </a>
              )}
              <a href={`https://wa.me/?text=${encodeURIComponent(message(r.name, r.link))}`} target="_blank" rel="noopener noreferrer" className={btn} style={{ background: "#1FA855", color: "#fff" }}>
                Send on WhatsApp
              </a>
              <button type="button" className={`${btn} border border-[#ccc]`} onClick={() => navigator.clipboard?.writeText(message(r.name, r.link)).then(() => setNote(`Message for ${r.name} copied.`))}>
                Copy message
              </button>
              <a href={r.link} target="_blank" rel="noopener noreferrer" className={`${btn} border border-[#ccc]`}>
                Preview
              </a>
              <button type="button" className={`${btn} border border-[#ccc]`} disabled={busy || r.devices === 0} onClick={() => act({ action: "reset", code: r.code }, `${r.name} can open the link on a new device now.`)}>
                Let a new device in
              </button>
              <button
                type="button"
                className={`${btn} border border-red-300 text-red-700`}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Revoke ${r.name}'s link? It stops working at once, on every device.`)) act({ action: "revoke", code: r.code }, `${r.name}'s link is revoked.`);
                }}
              >
                Revoke
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[0.8rem] text-[#7a8296]">Previewing while signed in doesn't use a device slot or send you an "opened" email.</p>
    </Shell>
  );
}

function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <main className={`mx-auto min-h-dvh px-5 py-10 ${wide ? "max-w-3xl" : "max-w-md"}`}>{children}</main>;
}
