// The start/stop timer. Stopping turns the running time into an entry.
import {
  LIMITS,
  cleanEntry,
  errorResponse,
  getTimer,
  handle,
  json,
  newId,
  readJson,
  requireOwner,
  saveEntry,
  setTimer,
  takeTimer,
} from "./_lib";

export const config = { runtime: "edge" };

/** Under this, a stop is treated as a slip of the thumb and nothing is saved. */
const MIN_MS = 60 * 1000;

function text(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

export default handle(async (req) => {
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const denied = await requireOwner(req, true);
  if (denied) return denied;
  const body = await readJson(req);
  const action = String(body.action ?? "");
  const timer = await getTimer();

  if (action === "start") {
    if (timer) return errorResponse("The timer is already running.", 409);
    const started = {
      start: Date.now(),
      task: text(body.task, LIMITS.task),
      notes: text(body.notes, LIMITS.notes),
      link: text(body.link, LIMITS.link),
    };
    await setTimer(started);
    return json({ timer: started });
  }

  if (!timer) return errorResponse("The timer isn't running.", 409);

  if (action === "update") {
    const next = {
      ...timer,
      task: text(body.task, LIMITS.task),
      notes: text(body.notes, LIMITS.notes),
      link: text(body.link, LIMITS.link),
    };
    await setTimer(next);
    return json({ timer: next });
  }

  if (action === "discard") {
    await setTimer(null);
    return json({ timer: null });
  }

  if (action === "stop") {
    // A stop can name an earlier end, for the day the timer was left running.
    const end = body.end === undefined ? Date.now() : Number(body.end);
    if (Number.isFinite(end) && end - timer.start < MIN_MS) {
      await setTimer(null);
      return json({ timer: null, entry: null, note: "Under a minute, so nothing was saved." });
    }
    const clean = cleanEntry({
      start: timer.start,
      end,
      task: body.task ?? timer.task,
      notes: body.notes ?? timer.notes,
      link: body.link ?? timer.link,
    });
    if (typeof clean === "string") return errorResponse(clean);
    // Claim the timer first: if another stop already took it, this one saves nothing.
    const claimed = await takeTimer();
    if (!claimed || claimed.start !== timer.start) return errorResponse("The timer was already stopped. Refresh the page.", 409);
    try {
      const entry = await saveEntry({ id: newId(clean.start, `t${timer.start}`), ...clean });
      return json({ timer: null, entry });
    } catch (err) {
      await setTimer(claimed).catch(() => undefined);
      throw err;
    }
  }

  return errorResponse("Unknown timer action.");
});
