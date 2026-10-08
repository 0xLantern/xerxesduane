/**
 * The brand-coloured mesh gradient behind every page, as a still image.
 *
 * It used to be a WebGL shader (Paper Shaders) frozen on one frame. Because
 * the shader was heavy, it was loaded two seconds after `load` and faded in
 * over 1.2s, so the background arrived 3–4s after the page did. The frame it
 * drew never changed, so it is now that exact frame, captured per theme and
 * per orientation (the shader laid itself out differently on a portrait
 * screen) and saved as ~5 KB WebPs in /brand/bg. The captures match the shader
 * output to within one shade on average.
 *
 * It renders on the server and is styled in index.css (`.mesh-bg`), keyed off
 * the `data-theme` attribute the inline script in index.html sets before first
 * paint, so it appears with the page in the right theme, with no JavaScript,
 * no WebGL and no fade.
 *
 * The colours are the ones the contrast work was measured against: fg-faint,
 * fg-soft and the accent eyebrow stay at 4.5:1 or better on it in both themes.
 * Re-capture and re-measure before changing them.
 */
export default function MeshBackground() {
  return <div aria-hidden className="mesh-bg pointer-events-none fixed inset-0 -z-20" />;
}
