/**
 * A letter as a partner reads it. Used by the reader (decrypted copy) and by
 * the desk's preview, so what you preview is what they see.
 */
import type { Letter } from "./shared";

export const INK = "#2b1a14";
export const SOFT = "#6b5f55";
export const ACCENT = "#8a6a2e";

const fmt = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export default function LetterView({ letter, photo }: { letter: Letter; photo: (id: string) => string | undefined }) {
  return (
    <article className="mx-auto w-full max-w-[40rem]">
      <header className="text-center">
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
          A letter from {letter.sender}
        </p>
        <h1 className="mt-3 font-serif text-[2rem] font-bold leading-tight sm:text-[2.6rem]" style={{ color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}>
          {letter.title}
        </h1>
        <p className="mt-3 text-sm" style={{ color: SOFT }}>
          {fmt(letter.sentAt)}
        </p>
      </header>

      <div className="letter-body mt-10 space-y-10 text-[1.08rem] leading-[1.8]" style={{ color: "#2b2420", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        {letter.sections.map((s, i) => (
          <section key={i}>
            {s.heading && (
              <h2 className="mb-3 text-[1.4rem] font-bold" style={{ color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}>
                {s.heading}
              </h2>
            )}
            <div
              className="[&_a]:font-semibold [&_a]:underline [&_a]:decoration-[#c9bfae] [&_a]:underline-offset-4 [&_blockquote]:my-5 [&_blockquote]:border-l-[3px] [&_blockquote]:border-[#c9b48a] [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-[#5a4e45] [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[1.15rem] [&_h3]:font-bold [&_h4]:mb-1 [&_h4]:mt-4 [&_h4]:font-bold [&_li]:my-1 [&_li]:pl-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_strong]:font-bold [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul_li]:marker:text-[#8a6a2e]"
              dangerouslySetInnerHTML={{ __html: s.html }}
            />
            {/* Photos sit after the first section, where a story usually begins. */}
            {i === 0 && letter.images.length > 0 && <Photos letter={letter} photo={photo} />}
          </section>
        ))}
        {letter.sections.length === 0 && letter.images.length > 0 && <Photos letter={letter} photo={photo} />}

        {letter.prayer.length > 0 && (
          <section className="rounded-3xl px-6 py-6 sm:px-8" style={{ background: "#efe9df" }}>
            <h2 className="text-[1.25rem] font-bold" style={{ color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Please pray with us
            </h2>
            <ul className="mt-3 space-y-2.5">
              {letter.prayer.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {letter.giving && (
          <section className="text-center">
            <a
              href={letter.giving.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center rounded-full px-7 font-sans text-base font-bold text-white transition hover:opacity-90"
              style={{ background: INK }}
            >
              {letter.giving.label}
            </a>
          </section>
        )}
      </div>

      <footer className="mt-14 border-t pt-6 text-center text-sm" style={{ borderColor: "#e6dfd2", color: SOFT }}>
        This letter is private and just for you. It will be gone after {fmt(letter.expiresAt)}.
      </footer>
    </article>
  );
}

function Photos({ letter, photo }: { letter: Letter; photo: (id: string) => string | undefined }) {
  return (
    <div className={`mt-6 grid gap-3 ${letter.images.length > 1 ? "sm:grid-cols-2" : ""}`}>
      {letter.images.map((im, i) => (
        <figure key={im.id} className={letter.images.length === 3 && i === 0 ? "sm:col-span-2" : ""}>
          <div className="overflow-hidden rounded-2xl" style={{ background: "#e9e2d6", aspectRatio: "4 / 3" }}>
            {photo(im.id) && <img src={photo(im.id)} alt={im.caption} className="h-full w-full object-cover" />}
          </div>
          {im.caption && (
            <figcaption className="mt-1.5 text-center font-sans text-sm" style={{ color: SOFT }}>
              {im.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
