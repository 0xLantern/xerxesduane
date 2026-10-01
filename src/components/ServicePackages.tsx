import { ArrowUpRight, Check } from "lucide-react";
import type { ServicePageData } from "../data/servicePages";
import Reveal from "./ui/Reveal";

export default function ServicePackages({ page }: { page: ServicePageData }) {
  const packages = [
    {
      name: "Focused",
      note: "Start with the clearest priority",
      items: ["One defined outcome", "Fixed scope and quote", "Launch-ready delivery"],
    },
    {
      name: "Connected",
      note: "Build the service into your wider operation",
      items: ["Multiple connected workflows", "Integrations and automation", "Team handover and support"],
      featured: true,
    },
    {
      name: "Ongoing",
      note: "Keep improving after launch",
      items: ["Monthly improvements", "Priority support", "Reporting and next-step roadmap"],
    },
  ];

  return (
    <section className="py-16 sm:py-24" aria-label={`${page.navLabel} scope options`}>
      <div className="container-bl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-wider text-gold">Typical ways to start</span>
          <h2 className="mt-4 text-3xl sm:text-4xl">Choose the size of the problem, not a generic package.</h2>
          <p className="mt-4 text-muted">These are starting shapes, not rigid boxes, and none of them has a price on it. The audit settles the scope; the proposal that follows carries the fixed price.</p>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {packages.map((item) => (
            <article key={item.name} className={`flex flex-col rounded-2xl border p-6 ${item.featured ? "panel-invert border-gold/30 bg-cream text-ink" : "glass border-cream/10"}`}>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${item.featured ? "text-gold-deep" : "text-gold"}`}>{item.note}</span>
              <h3 className={`mt-4 text-2xl ${item.featured ? "!text-ink" : "text-cream"}`}>{item.name}</h3>
              <ul className="mt-6 space-y-3">
                {item.items.map((line) => (
                  <li key={line} className={`flex items-start gap-2.5 text-sm ${item.featured ? "text-ink/70" : "text-cream-dim"}`}>
                    <Check size={15} className={`mt-0.5 shrink-0 ${item.featured ? "text-gold-deep" : "text-gold"}`} />
                    {line}
                  </li>
                ))}
              </ul>
              <a href="/contact" className={`mt-7 inline-flex items-center gap-2 rounded py-1 text-sm font-semibold ${item.featured ? "text-ink" : "text-gold"}`}>
                Discuss this scope <ArrowUpRight size={14} />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
