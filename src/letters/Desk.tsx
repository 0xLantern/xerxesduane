/**
 * The owner's desk at ministry.xerxesduane.com/letters.
 *
 * Each month's letter is a PDF made elsewhere (with Claude). Here it is
 * published: encrypted in this browser, uploaded, and given to each partner
 * as their own private copy, by email at once and by WhatsApp from the list
 * that follows. Signs in with the same owner login as the hours log.
 *
 *   Letters    publish, see who opened, send to more partners, withdraw
 *   Partners   names, email, WhatsApp, greeting
 *   Prayer     the month's prayer requests, and the prayer team's link
 *   Settings   sender, reply-to, the WhatsApp message, the download default
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, type LetterSummary, type Partner, type Settings } from "./api";
import LetterDetail, { type Fresh } from "./LetterDetail";
import { fmtShort, local, msg, statusOf } from "./local";
import Partners from "./Partners";
import PrayerTab from "./PrayerTab";
import Publish from "./Publish";
import SettingsTab from "./SettingsTab";
import { ACCENT, Box, Btn, Err, INK, PAPER, Pill, SERIF, SOFT, inputCls } from "./ui";
import { LIFESPAN_DAYS } from "./shared";

type Tab = "letters" | "partners" | "prayer" | "settings";
type View = { kind: "list" } | { kind: "publish" } | { kind: "letter"; id: string; fresh?: Fresh };

export default function Desk() {
  const [state, setState] = useState<"loading" | "login" | "ready" | "off">("loading");
  const check = useCallback(async () => {
    try {
      const s = await api.session();
      setState(!s.configured ? "off" : s.authed ? "ready" : "login");
    } catch {
      setState("login");
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the check sets state only once the network answers
    void check();
  }, [check]);

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: "#2b2420" }}>
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-[max(1.5rem,env(safe-area-inset-top))]">
        {state === "loading" && <p className="py-24 text-center" style={{ color: SOFT }}>Loading…</p>}
        {state === "off" && <Box>The letters desk isn't switched on: set WORK_PASSWORD in Vercel.</Box>}
        {state === "login" && <Login onIn={() => setState("ready")} />}
        {state === "ready" && <Workspace onOut={() => setState("login")} />}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

function Login({ onIn }: { onIn: () => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login(email, pw);
      onIn();
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box className="mx-auto mt-16 max-w-sm">
      <form onSubmit={submit} className="space-y-3">
        <h1 className="text-xl font-bold" style={{ color: INK, fontFamily: SERIF }}>
          Partner letters
        </h1>
        <p className="text-sm" style={{ color: SOFT }}>Sign in with your work log account.</p>
        <input className={inputCls} type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputCls} type="password" autoComplete="current-password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        <Err>{error}</Err>
        <Btn kind="primary" type="submit" disabled={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Btn>
      </form>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Workspace: tabs, and the partners and settings every tab works from
// ---------------------------------------------------------------------------

function Workspace({ onOut }: { onOut: () => void }) {
  const [tab, setTab] = useState<Tab>("letters");
  const [view, setView] = useState<View>({ kind: "list" });
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [defaults, setDefaults] = useState({ waTemplate: "" });
  const [error, setError] = useState("");

  const loadPartners = useCallback(() => api.partners().then((r) => setPartners(r.partners), (e) => setError(msg(e))), []);
  const loadSettings = useCallback(
    () =>
      api.settings().then(
        (r) => {
          setSettings(r.settings);
          setDefaults(r.defaults);
        },
        (e) => setError(msg(e)),
      ),
    [],
  );
  useEffect(() => {
    void loadPartners();
    void loadSettings();
  }, [loadPartners, loadSettings]);

  const go = (t: Tab) => {
    setTab(t);
    setView({ kind: "list" });
    window.scrollTo(0, 0);
  };
  const show = (v: View) => {
    setView(v);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
            ministry.xerxesduane.com
          </p>
          <h1 className="text-2xl font-bold" style={{ color: INK, fontFamily: SERIF }}>
            Partner letters
          </h1>
        </div>
        <Btn onClick={() => void api.logout().finally(onOut)}>Sign out</Btn>
      </header>
      <nav className="mt-5 flex gap-1 rounded-full bg-white p-1 shadow-sm">
        {(["letters", "partners", "prayer", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => go(t)}
            aria-current={tab === t ? "page" : undefined}
            className="min-h-11 flex-1 rounded-full text-[0.95rem] font-bold capitalize transition"
            style={tab === t ? { background: INK, color: "#fff" } : { color: SOFT }}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="mt-5">
        <Err>{error}</Err>
        {!partners || !settings ? (
          !error && <p style={{ color: SOFT }}>Loading…</p>
        ) : (
          <>
            {tab === "letters" && view.kind === "list" && <Letters onPublish={() => show({ kind: "publish" })} onOpen={(id) => show({ kind: "letter", id })} />}
            {tab === "letters" && view.kind === "publish" && (
              <Publish partners={partners} settings={settings} onCancel={() => show({ kind: "list" })} onDone={(id, fresh) => show({ kind: "letter", id, fresh })} />
            )}
            {tab === "letters" && view.kind === "letter" && (
              <LetterDetail key={view.id} id={view.id} fresh={view.fresh} partners={partners} settings={settings} onBack={() => show({ kind: "list" })} />
            )}
            {tab === "partners" && <Partners partners={partners} reload={loadPartners} />}
            {tab === "prayer" && <PrayerTab />}
            {tab === "settings" && <SettingsTab settings={settings} defaults={defaults} onSaved={setSettings} />}
          </>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Letters list
// ---------------------------------------------------------------------------

function Letters({ onPublish, onOpen }: { onPublish: () => void; onOpen: (id: string) => void }) {
  const [letters, setLetters] = useState<(LetterSummary & { here: boolean })[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.letters().then(
      (r) => {
        // Keys of letters that have expired or been withdrawn have no use left: drop them.
        local.prune(r.letters);
        setLetters(r.letters.map((l) => ({ ...l, here: !!local.get(l.id) })));
      },
      (e) => setError(msg(e)),
    );
  }, []);
  return (
    <div className="space-y-3">
      <Box className="space-y-3">
        <p className="text-[0.95rem]" style={{ color: SOFT }}>
          Publish the month's PDF letter. Each partner gets their own private, encrypted copy, open for {LIFESPAN_DAYS} days.
        </p>
        <Btn kind="primary" onClick={onPublish} className="w-full sm:w-auto">
          Publish a letter
        </Btn>
      </Box>
      <Err>{error}</Err>
      {!letters && !error && <p style={{ color: SOFT }}>Loading…</p>}
      {letters?.length === 0 && (
        <Box className="text-center">
          <p style={{ color: SOFT }}>No letters yet. Publish your first one.</p>
        </Box>
      )}
      {letters?.map((l) => {
        const st = statusOf(l);
        return (
          <button key={l.id} type="button" onClick={() => onOpen(l.id)} className="block w-full text-left">
            <Box className="transition hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-snug" style={{ color: INK, fontFamily: SERIF }}>
                    {l.title}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: SOFT }}>
                    Published {fmtShort(l.publishedAt)} · until {fmtShort(l.expiresAt)}
                  </p>
                  {l.status !== "uploading" && (
                    <p className="mt-0.5 text-sm font-semibold" style={{ color: INK }}>
                      Opened by {l.opened} of {l.copies}
                      {l.praying > 0 && <span style={{ color: "#8a6a2e" }}> · 🙏 {l.praying} praying</span>}
                      {l.here && l.status === "live" && <span className="font-normal" style={{ color: SOFT }}> · links on this device</span>}
                    </p>
                  )}
                </div>
                <Pill tone={st.tone}>{st.label}</Pill>
              </div>
            </Box>
          </button>
        );
      })}
    </div>
  );
}
