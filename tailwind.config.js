/**
 * Design tokens — light-first, theme-aware.
 *
 * Every colour resolves to a CSS custom property defined in index.css, as an
 * `R G B` triplet so Tailwind's opacity modifiers (`bg-panel/60`) still work.
 * Flipping `data-theme` on <html> reassigns the triplets, so a single class
 * set renders correctly in both themes — no `dark:` variant needed for colour.
 *
 * Legacy names (ink / cream / gold / muted / olive / sage) are kept and
 * repointed at the new semantics so the pre-existing pages move to the new
 * palette instead of losing their styles.
 */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./work.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        /* ---- surfaces ---- */
        canvas: {
          DEFAULT: token("--c-canvas"),
          sunk: token("--c-canvas-sunk"),
        },
        panel: {
          DEFAULT: token("--c-panel"),
          alt: token("--c-panel-alt"),
        },
        /** Pale-blue wash behind the bento container. */
        wash: {
          DEFAULT: token("--c-wash"),
          strong: token("--c-wash-strong"),
        },

        /* ---- foreground ---- */
        fg: {
          DEFAULT: token("--c-fg"),
          soft: token("--c-fg-soft"),
          faint: token("--c-fg-faint"),
          onSolid: token("--c-fg-on-solid"),
        },

        /* ---- lines ---- */
        line: {
          DEFAULT: token("--c-line"),
          soft: token("--c-line-soft"),
        },

        /* ---- accent ---- */
        accent: {
          DEFAULT: token("--c-accent"),
          soft: token("--c-accent-soft"),
          deep: token("--c-accent-deep"),
          hover: token("--c-accent-hover"),
          ink: token("--c-accent-ink"),
        },

        /** Light ground for third-party logos, in both themes. */
        plate: {
          DEFAULT: token("--c-plate"),
          ink: token("--c-plate-ink"),
        },

        /** Solid navy for primary buttons — stays navy in both themes. */
        navy: {
          DEFAULT: token("--c-navy"),
          hover: token("--c-navy-hover"),
        },

        /* ---- legacy aliases, repointed ---- */
        ink: {
          deep: token("--c-canvas"),
          DEFAULT: token("--c-canvas-sunk"),
          surface: token("--c-panel"),
          raised: token("--c-panel-alt"),
        },
        cream: {
          DEFAULT: token("--c-fg"),
          dim: token("--c-fg-soft"),
        },
        /* Legacy `gold` is the accent seen as *text* on the pre-existing
           pages, so it resolves to the readable orange; `gold-soft` (only
           ever used as a hover) resolves to the bright fill orange. */
        gold: {
          DEFAULT: token("--c-accent-deep"),
          /* `gold-soft` only ever appears as a hover, so it resolves to the
             darker hover orange — a *lighter* hover would drop the label
             below AA on a cream page. */
          soft: token("--c-accent-hover"),
          deep: token("--c-accent-deep"),
        },
        muted: {
          DEFAULT: token("--c-fg-soft"),
          dark: token("--c-fg-faint"),
        },
        olive: {
          DEFAULT: token("--c-navy"),
          light: token("--c-fg-soft"),
          dim: token("--c-navy-hover"),
        },
        sage: token("--c-panel-alt"),
      },

      fontFamily: {
        /* One voice across the site: Plus Jakarta Sans, a rounded geometric
           sans that holds an oversized headline and still sets a 12px label
           cleanly. Inter stays as the metric-compatible fallback. */
        display: ['"Plus Jakarta Sans"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ['"Plus Jakarta Sans"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        /* Eyebrows, counters and small labels — same family, tracked out. */
        technical: ['"Plus Jakarta Sans"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        /* Genuinely monospaced contexts only (code, tabular demo output). */
        mono: ['"JetBrains Mono"', '"Space Mono"', "ui-monospace", "monospace"],
        /* Brand moments (wordmark, logo lockups). */
        mondwest: ['"PP Mondwest"', "Georgia", "serif"],
        pixel: ['"PP NeueBit"', '"Space Mono"', "ui-monospace", "monospace"],
      },

      fontSize: {
        /* Oversized hero headline — clamps so it never overflows the shell. */
        hero: ["clamp(2.15rem, 3.7vw, 3.5rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
        "hero-sm": ["clamp(2rem, 3.2vw, 3rem)", { lineHeight: "1.06", letterSpacing: "-0.025em" }],
        /* Bento card heading — uppercase, set solid. */
        card: ["1.06rem", { lineHeight: "1.15", letterSpacing: "0.005em" }],
        eyebrow: ["0.75rem", { lineHeight: "1", letterSpacing: "0.16em" }],
      },

      maxWidth: {
        content: "1200px",
        shell: "1880px",
        prose: "68ch",
      },

      spacing: {
        rail: "20rem",
      },

      screens: {
        /* The width at which the bento board can carry four real columns. */
        board: "1180px",
      },

      borderRadius: {
        card: "1.25rem",
        panel: "1.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },

      boxShadow: {
        /* Restrained, and theme-aware — the reference leans on borders. */
        card: "var(--panel-shadow)",
        "card-hover": "var(--panel-shadow-lift)",
        pill: "var(--panel-shadow)",
        solid: "var(--panel-shadow-lift)",
      },

      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        /* Magic UI Marquee semantics: each repeated copy travels its own
           width plus one gap, which is what makes N copies loop seamlessly. */
        marqueeX: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        marqueeY: {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
        floatBlob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(4%, -6%) scale(1.08)" },
          "66%": { transform: "translate(-5%, 4%) scale(0.95)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.9" },
        },
        scrollCue: {
          "0%": { transform: "translateY(0)", opacity: "0" },
          "40%": { opacity: "1" },
          "100%": { transform: "translateY(10px)", opacity: "0" },
        },
      },

      animation: {
        marquee: "marquee 38s linear infinite",
        "marquee-x": "marqueeX var(--duration) linear infinite",
        "marquee-y": "marqueeY var(--duration) linear infinite",
        "marquee-slow": "marquee 60s linear infinite",
        "float-blob": "floatBlob 22s ease-in-out infinite",
        "float-blob-slow": "floatBlob 30s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
        "pulse-glow": "pulseGlow 5s ease-in-out infinite",
        "scroll-cue": "scrollCue 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
