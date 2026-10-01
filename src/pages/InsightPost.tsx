import { ArrowLeft, Check } from "lucide-react";
import { type InsightPost as Post, formatDate } from "../data/insights";
import { INSIGHTS } from "../data/insights";
import { getServicePage } from "../data/servicePages";
import PageHeader from "../components/page/PageHeader";
import { GhostAction, PrimaryAction } from "../components/page/PageActions";

function Body({ blocks }: { blocks: Post["body"] }) {
  return (
    <div className="space-y-6">
      {blocks.map((b, i) => {
        if (b.type === "h2") {
          return (
            <h2 key={i} className="pt-2 font-display text-2xl font-semibold text-fg sm:text-3xl">
              {b.text}
            </h2>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={i} className="space-y-2.5">
              {b.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[17px] leading-relaxed text-muted">
                  <Check size={18} className="mt-1 shrink-0 text-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === "quote") {
          return (
            <blockquote
              key={i}
              className="border-l-2 border-gold/50 pl-5 font-display text-xl italic text-cream-dim"
            >
              {b.text}
            </blockquote>
          );
        }
        return (
          <p key={i} className="text-[17px] leading-relaxed text-muted">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

export default function InsightPost({ post }: { post: Post }) {
  const others = INSIGHTS.filter((p) => p.slug !== post.slug).slice(0, 2);
  const related = (post.relatedServices ?? [])
    .map((slug) => getServicePage(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <>
      <article className="pb-12">
        <PageHeader
          eyebrow="Insights"
          title={post.title}
          meta={
            <>
              {/* The byline links to the page that actually describes the
                  author, which is the same entity the Article schema names by
                  @id. A name in plain text asserts authorship to a reader and
                  proves nothing to anyone. */}
              <a
                href="/about"
                rel="author"
                className="font-semibold text-accent-deep underline decoration-accent/40 underline-offset-4 transition hover:decoration-accent"
              >
                {post.author}
              </a>
              <span aria-hidden>·</span>
              {/* Machine-readable, so the date a crawler reads and the date a
                  person reads cannot drift apart. */}
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              {post.updated && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    Updated <time dateTime={post.updated}>{formatDate(post.updated)}</time>
                  </span>
                </>
              )}
              <span aria-hidden>·</span>
              <span>{post.readingMinutes} min read</span>
            </>
          }
          actions={
            <GhostAction
              href="/insights"
              icon={<ArrowLeft size={15} strokeWidth={2.2} aria-hidden />}
            >
              All insights
            </GhostAction>
          }
        />

        <div className="rounded-panel bg-gradient-to-r from-canvas-sunk/30 via-wash/40 to-wash-strong/60 p-3 sm:p-4">
          <div className="rounded-card border border-line bg-panel p-5 shadow-card sm:p-8">
            <div className="max-w-prose">
            

            <Body blocks={post.body} />

            <div className="mt-10 rounded-card border border-accent/25 bg-accent/[0.07] p-6">
              <p className="font-display text-xl font-semibold text-fg">
                Want this mapped for your business?
              </p>
              <div className="mt-4">
                <PrimaryAction href="/contact">Book your free audit</PrimaryAction>
              </div>
            </div>

            {post.sources && post.sources.length > 0 && (
              <div className="mt-14">
                <h2 className="font-technical text-[0.62rem] font-bold uppercase tracking-[0.16em] text-accent-deep">
                  Sources
                </h2>
                {/* Vendor documentation and pricing pages, so the third-party
                    claims above can be checked rather than taken on trust. */}
                <ul className="mt-4 space-y-3">
                  {post.sources.map((source) => {
                    const external = source.url.startsWith("http");
                    return (
                      <li key={source.url} className="text-[15px] leading-relaxed text-muted">
                        <a
                          href={source.url}
                          {...(external ? { target: "_blank", rel: "noopener" } : {})}
                          className="inline-block rounded py-0.5 font-semibold text-fg-soft underline decoration-accent/40 underline-offset-4 transition hover:text-accent-deep hover:decoration-accent"
                        >
                          {source.label}
                        </a>
                        {source.note && <span className="ml-2">{source.note}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {related.length > 0 && (
              <div className="mt-14">
                <h2 className="font-technical text-[0.62rem] font-bold uppercase tracking-[0.16em] text-accent-deep">
                  Related services
                </h2>
                <ul className="mt-4 space-y-3">
                  {related.map((s) => (
                    <li key={s.slug}>
                      <a
                        href={`/${s.slug}`}
                        className="inline-block rounded py-0.5 text-fg-soft transition-colors hover:text-accent-deep"
                      >
                        {s.navLabel} in Dubai
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {others.length > 0 && (
              <div className="mt-14">
                <h2 className="font-technical text-[0.62rem] font-bold uppercase tracking-[0.16em] text-accent-deep">
                  Keep reading
                </h2>
                <ul className="mt-4 space-y-3">
                  {others.map((p) => (
                    <li key={p.slug}>
                      <a
                        href={`/insights/${p.slug}`}
                        className="inline-block rounded py-0.5 text-fg-soft transition-colors hover:text-accent-deep"
                      >
                        {p.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            </div>
          </div>
        </div>
      </article>

    </>
  );
}
