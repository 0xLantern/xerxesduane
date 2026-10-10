import { useEffect, useRef, useState } from "react";

/**
 * A personal thank-you card on each participant's team page, from the
 * presentations on 21 November: their name, the challenge their team took on
 * and their role, drawn on a canvas so they can save it as an image.
 *
 * It names only what the public /hack page already says (the challenge
 * title), never who the work is for. The owner's preview shows it early, so
 * it can be checked before the night.
 */

const SHOW_FROM = Date.parse("2026-11-21T18:00:00+04:00");
const W = 1080;
const H = 1350;
const INK = "#131313";
const Y = "#EFE974";
const O = "#EF4E25";

/** Wraps text into lines that fit `max` pixels wide. */
function lines(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

function draw(canvas: HTMLCanvasElement, name: string, challenge: string, role: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const font = (weight: number, size: number) => `${weight} ${size}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  // The brand line, as on the posters.
  ctx.font = font(800, 54);
  ctx.fillStyle = "#fff";
  ctx.fillText("#HACK", 90, 150);
  const hackW = ctx.measureText("#HACK").width;
  ctx.fillStyle = O;
  ctx.fillText("2026", 90 + hackW, 150);
  const yearW = ctx.measureText("2026").width;
  ctx.fillRect(90 + hackW + yearW + 18, 108, 190, 54);
  ctx.font = font(700, 28);
  ctx.fillStyle = "#fff";
  ctx.fillText("D U B A I", 90 + hackW + yearW + 40, 146);

  ctx.font = font(700, 30);
  ctx.fillStyle = Y;
  ctx.fillText("17 OCTOBER – 21 NOVEMBER 2026", 90, 300);

  ctx.font = font(800, 120);
  ctx.fillStyle = "#fff";
  let y = 450;
  for (const l of lines(ctx, "Thank you,", W - 180)) {
    ctx.fillText(l, 90, y);
    y += 130;
  }
  ctx.fillStyle = Y;
  for (const l of lines(ctx, `${name}.`, W - 180)) {
    ctx.fillText(l, 90, y);
    y += 130;
  }

  y += 30;
  ctx.font = font(500, 44);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const said = role ? `You built ${challenge} with your team, as ${role}.` : `You built ${challenge} with your team.`;
  for (const l of lines(ctx, said, W - 180)) {
    ctx.fillText(l, 90, y);
    y += 60;
  }
  ctx.font = font(500, 40);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  y += 20;
  for (const l of lines(ctx, "Five weeks of building something good, and showing it working.", W - 180)) {
    ctx.fillText(l, 90, y);
    y += 56;
  }

  ctx.fillStyle = Y;
  ctx.fillRect(90, H - 230, 120, 8);
  ctx.font = font(700, 38);
  ctx.fillStyle = "#fff";
  ctx.fillText("With thanks, Xerxes and Abel", 90, H - 160);
  ctx.font = font(500, 30);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("#HACK Champions, Dubai", 90, H - 110);
}

export default function ThankYouCard({ name, challenge, role, preview }: { name: string; challenge: string; role: string; preview: boolean }) {
  const [now] = useState(() => Date.now());
  const ref = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");
  const show = preview || now >= SHOW_FROM;

  useEffect(() => {
    const canvas = ref.current;
    if (!show || !canvas) return;
    let live = true;
    // Draw once the page's font is ready, so the card isn't set in a fallback face.
    document.fonts.ready.then(() => {
      if (!live) return;
      draw(canvas, name, challenge, role);
      setUrl(canvas.toDataURL("image/png"));
    });
    return () => {
      live = false;
    };
  }, [show, name, challenge, role]);

  if (!show) return null;
  return (
    <section className="rounded-3xl bg-white p-5 text-[#131313] sm:p-6">
      <h2 className="font-display text-[1.2rem] font-bold">Your thank-you card</h2>
      {preview && <p className="mt-1 text-[0.8rem] font-semibold" style={{ color: O }}>Preview: participants see this from 21 November.</p>}
      <canvas ref={ref} width={W} height={H} className="mt-3 h-auto w-full max-w-sm rounded-2xl" aria-label={`Thank you, ${name}. You built ${challenge} with your team.`} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {url && (
          <a href={url} download="hack2026-dubai-thank-you.png" className="rounded-full px-5 py-2.5 font-display font-extrabold" style={{ background: Y, color: INK }}>
            Save the card
          </a>
        )}
        <span className="text-[0.8rem] text-[#6a6a6a]">It's yours to keep. Please keep it off public social media, like everything from #HACK.</span>
      </div>
    </section>
  );
}
