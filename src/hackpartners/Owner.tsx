import { useCallback, useEffect, useState, type ReactNode } from "react";
import { greetName } from "./greet";

/**
 * The Champions' panel: one personal link per partner.
 *
 *   /hp                 the owner, signed in with the /letters login (the cookie
 *                       is per host, and both live on ministry.xerxesduane.com).
 *                       Sees every link and who made it.
 *   /hp/team/<secret>   a co-Champion's own panel (see api/hack-partners/_lib.ts).
 *                       Sees and manages only the links they made.
 */

type Row = {
  code: string;
  name: string;
  createdAt: number;
  openedAt: number | null;
  by: string;
  link: string;
  devices: number;
  countries: string[];
  /** What the partner tapped on their page, if anything. */
  response?: { kind: "in" | "share" | "pray" | "notnow"; at: number };
};
type List = {
  invites: Row[];
  places: { taken: number; total: number };
  expiresAt: number;
  me: { role: "owner" | "champion"; name: string };
};

const INK = "#131313";
const Y = "#EFE974";

const when = (t: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dubai" }).format(new Date(t));

/**
 * What goes to the partner, in the sender's own words. It says nothing about
 * #HACK or money, in case the chat is ever seen: the page explains everything.
 */
const message = (name: string, link: string, from: string) =>
  [
    `Hi ${greetName(name)}! 😊`,
    "",
    "I've been praying about who to ask to stand with us in something close to my heart these coming weeks, and you came to mind.",
    "",
    "I made a short private page just for you that explains it all:",
    link,
    "",
    "Please read it when you have a quiet moment. It opens only for you, so please don't forward it. No pressure at all, and if you have any questions, just message me here.",
    "",
    "Thank you, friend. 🙏",
    from,
  ].join("\n");

const btn = "rounded-full px-3 py-1.5 text-[0.8rem] font-semibold transition hover:-translate-y-0.5 disabled:opacity-50";

/** A soft follow-up with the same link. No deadline, no pressure. */
const reminder = (name: string, link: string, from: string) =>
  [
    `Hi ${greetName(name)}! 😊 Just a gentle follow-up on the private page I sent. No rush and no pressure at all, read it when you have a quiet moment:`,
    link,
    "",
    "If you have any questions, I'm here. Thank you, friend 🙏",
    from,
  ].join("\n");

/** Where each link stands: the partner's answer if they gave one, otherwise whether they opened it. */
type Status = "in" | "share" | "pray" | "notnow" | "opened" | "unopened";
const STATUS: Record<Status, { label: string; style: { background: string; color: string } }> = {
  in: { label: "In", style: { background: "#16a34a", color: "#fff" } },
  share: { label: "Sharing a place", style: { background: "#86efac", color: "#14532d" } },
  pray: { label: "Praying", style: { background: "#dbeafe", color: "#1e3a8a" } },
  notnow: { label: "Not this time", style: { background: "#e5e5e5", color: "#404040" } },
  opened: { label: "Opened, no answer yet", style: { background: "#FBF6C9", color: "#713f12" } },
  unopened: { label: "Not opened yet", style: { background: "#fee2e2", color: "#7f1d1d" } },
};
const status = (r: Row): Status => r.response?.kind ?? (r.openedAt ? "opened" : "unopened");

export default function Owner({ team }: { team?: string }) {
  const [state, setState] = useState<"loading" | "login" | "off" | "error" | "ready">("loading");
  const [list, setList] = useState<List | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const call = useCallback(
    async <T,>(method: "GET" | "POST", body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> => {
      const headers: Record<string, string> = {};
      if (body) headers["content-type"] = "application/json";
      if (team) headers["x-hp-champion"] = team;
      const res = await fetch("/api/hack-partners/invites", {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as T & { error?: string };
      return { ok: res.ok, status: res.status, data };
    },
    [team],
  );

  const load = useCallback(async () => {
    const r = await call<List>("GET");
    if (r.status === 401) {
      if (team) setNote(r.data.error ?? "This panel link isn't valid any more.");
      return setState(team ? "error" : "login");
    }
    if (r.status === 503) return setState("off");
    if (r.ok) {
      setList(r.data);
      setState("ready");
      document.title = r.data.me.role === "champion" ? `Partner links · ${r.data.me.name}` : "Partner links";
    } else {
      setNote(r.data.error ?? "Couldn't load the links. Reload to try again.");
      setState("error");
    }
  }, [call, team]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only init; intentional SSR-safe pattern
    load();
  }, [load]);

  const from = list?.me.name ?? "Xerxes";
  const owner = list?.me.role === "owner";

  const act = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    setNote("");
    const r = await call<{ invite?: Row }>("POST", body);
    setBusy(false);
    if (!r.ok) return setNote(r.data.error ?? "That didn't work. Try again.");
    setNote(done);
    if (body.action === "create" && r.data.invite) {
      try {
        await navigator.clipboard.writeText(message(r.data.invite.name, r.data.invite.link, from));
        setNote(`Link for ${r.data.invite.name} made, and the message is copied. Paste it into WhatsApp.`);
      } catch {
        /* the WhatsApp button on the row still works */
      }
    }
    load();
  };

  if (state === "loading") return <Shell><p className="text-white/70">Loading…</p></Shell>;
  if (state === "error") return <Shell><p className="text-white/80">{note}</p></Shell>;
  if (state === "off") return <Shell><p className="text-white/80">The owner login isn't set up on this site yet.</p></Shell>;
  if (state === "login")
    return (
      <Shell>
        <h1 className="font-display text-[1.4rem] font-bold text-white">Partner links</h1>
        <p className="mt-2 text-white/75">
          Sign in on{" "}
          <a href="/letters" className="underline" style={{ color: Y }}>
            the letters desk
          </a>{" "}
          with your owner login, then come back here.
        </p>
        <p className="mt-6 text-[0.85rem] text-white/50">If you were sent a personal link, open that link instead. This address shows nothing on its own.</p>
      </Shell>
    );

  const expires = list ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Asia/Dubai" }).format(new Date(list.expiresAt)) : "";

  return (
    <Shell wide>
      <h1 className="font-display text-[1.5rem] font-bold text-white">
        #HACK2026 Dubai partner links{owner ? "" : ` · ${from}`}
      </h1>
      <p className="mt-1 text-[0.9rem] text-white/70">
        One private link per person. Each opens on up to two devices and stops working after {expires}.{" "}
        {owner
          ? "You get an email when a link is first opened, and when it's tried on a third device."
          : "You see only the links you make here. Xerxes is told when a link is first opened."}
      </p>
      {!owner && (
        <p className="mt-2 rounded-xl border border-white/15 px-3 py-2 text-[0.8rem] text-white/60">
          🔒 This panel is just for you. Keep its address private: anyone who has it can make links in your name.
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
          className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2"
        />
        <button type="submit" disabled={busy || !name.trim()} className={btn} style={{ background: Y, color: INK }}>
          Make a link
        </button>
      </form>

      {list && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-white">
          <span className="text-[0.9rem]">
            Places taken: <strong>{list.places.taken}</strong> of {list.places.total}
          </span>
          <button type="button" className={`${btn} border border-white/30`} disabled={busy || list.places.taken <= 0} onClick={() => act({ action: "places", taken: list.places.taken - 1 }, "Updated.")}>
            −
          </button>
          <button type="button" className={`${btn} border border-white/30`} disabled={busy || list.places.taken >= list.places.total} onClick={() => act({ action: "places", taken: list.places.taken + 1 }, "Updated.")}>
            +
          </button>
          <span className="text-[0.78rem] text-white/50">Shared between the Champions. Partners see it on their page.</span>
        </div>
      )}

      {list && list.invites.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-1.5 text-[0.8rem]">
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

      {note && <p className="mt-3 text-[0.88rem]" style={{ color: Y }} aria-live="polite">{note}</p>}

      <ul className="mt-4 space-y-2">
        {list?.invites.length === 0 && <li className="text-white/60">No links yet. Make the first one above.</li>}
        {list?.invites.map((r) => (
          <li key={r.code} className="rounded-2xl bg-white p-4 text-[#131313]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-[1.05rem] font-bold">
                {r.name}
                {owner && r.by !== "Xerxes" && <span className="ml-2 text-[0.75rem] font-semibold text-[#9A3412]">via {r.by}</span>}
              </p>
              <p className="text-[0.78rem] text-[#6a6a6a]">
                {r.openedAt ? `Opened ${when(r.openedAt)}` : "Not opened yet"} · {r.devices} of 2 devices
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
              {/* Before an answer, the nudge; after one, nothing to chase. The first send is still there either way. */}
              {!r.response && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(reminder(r.name, r.link, from))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btn}
                  style={{ background: Y, color: INK }}
                >
                  Send a gentle reminder
                </a>
              )}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message(r.name, r.link, from))}`}
                target="_blank"
                rel="noopener noreferrer"
                className={btn}
                style={{ background: "#1FA855", color: "#fff" }}
              >
                Send on WhatsApp
              </a>
              <button type="button" className={`${btn} border border-[#ccc]`} onClick={() => navigator.clipboard?.writeText(message(r.name, r.link, from)).then(() => setNote(`Message for ${r.name} copied.`))}>
                Copy message
              </button>
              {/* Only the signed-in owner can preview without using one of the partner's two device slots. */}
              {owner && (
                <a href={r.link} target="_blank" rel="noopener noreferrer" className={`${btn} border border-[#ccc]`}>
                  Preview
                </a>
              )}
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
      <p className="mt-6 text-[0.8rem] text-white/45">
        {owner
          ? "Previewing while signed in doesn't use a device slot or send you an \"opened\" email."
          : "Don't open a partner's link yourself: it would use one of their two device slots."}
      </p>
    </Shell>
  );
}

function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <main className={`mx-auto min-h-dvh px-5 py-10 ${wide ? "max-w-3xl" : "max-w-md"}`}>{children}</main>;
}
