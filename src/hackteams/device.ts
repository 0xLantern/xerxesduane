/** The device lock and watermark shared by the participant and guest pages. */

/** This browser's id for the device lock: random, kept on the device. */
export function deviceId(): string {
  const KEY = "hackt-device";
  const make = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[b & 63]).join("");
  try {
    const have = localStorage.getItem(KEY);
    if (have && /^[A-Za-z0-9_-]{16,64}$/.test(have)) return have;
    const made = make();
    localStorage.setItem(KEY, made);
    return made;
  } catch {
    try {
      const s = sessionStorage.getItem(KEY) ?? make();
      sessionStorage.setItem(KEY, s);
      return s;
    } catch {
      return "";
    }
  }
}

/** A tiled "For <name> · <date> · private", so a screenshot that travels says whose page it was. */
export function watermark(name: string): string {
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Dubai" }).format(new Date());
  const text = `For ${name} · ${day} · private`.replace(/[<>&"']/g, "");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='180'><text x='10' y='100' transform='rotate(-24 170 90)' font-family='sans-serif' font-size='15' fill='#131313' fill-opacity='0.045'>${text}</text></svg>`;
  return `url("data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}")`;
}

