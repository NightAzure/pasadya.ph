import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Compass, Layers3, Sparkles } from "lucide-react";

import {
  newHomepageConcepts,
  originalHomepageConcepts,
  refinedHomepageConcepts,
  thirdHomepageConcepts,
  type HomepageConceptDefinition,
} from "@/components/homepage-concepts/catalog";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Homepage Concept Gallery",
  description: `Eleven distinct homepage directions for ${BRAND_NAME}.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomepageConceptGallery() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-[#F5F0E8]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0D1117]/90 backdrop-blur-xl">
        <nav
          aria-label="Concept gallery navigation"
          className="mx-auto flex min-h-16 max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-8"
        >
          <Link
            className="inline-flex min-h-11 items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8D9FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117]"
            href="/"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F4F26A] text-[#0D1117]">
              <Compass aria-hidden="true" className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-tight">
                {BRAND_NAME}
              </span>
              <span className="hidden text-[11px] text-white/55 sm:block">
                Homepage concept gallery
              </span>
            </span>
          </Link>
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold transition-colors hover:border-[#B8D9FF] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8D9FF]"
            href="/"
          >
            Current homepage
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <main id="main-content">
        <section className="mx-auto max-w-[1480px] px-4 pb-14 pt-16 sm:px-8 sm:pb-20 sm:pt-24">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_390px]">
            <div>
              <p className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[#B8D9FF] px-3 text-xs font-bold uppercase tracking-[0.18em] text-[#0D1117]">
                <Layers3 aria-hidden="true" className="h-3.5 w-3.5" />
                Eleven complete directions
              </p>
              <h1 className="mt-7 max-w-5xl text-[clamp(3.1rem,8vw,7.9rem)] font-black leading-[0.86] tracking-[-0.065em]">
                One local promise.
                <span className="block text-[#FF7A45]">
                  Eleven visual worlds.
                </span>
              </h1>
            </div>
            <div className="border-l border-white/15 pl-5 sm:pl-7">
              <p className="text-lg font-semibold text-[#F5F0E8]">
                Find the place. Know the way.
              </p>
              <p className="mt-3 leading-7 text-white/60">
                Every concept uses the same places, routes, and product goals.
                Compare the hierarchy, tone, interaction, and visual system—not
                placeholder content.
              </p>
            </div>
          </div>
        </section>

        <ConceptGroup
          concepts={refinedHomepageConcepts}
          description="The clearest product hierarchy from the exploration: discovery first, booking visible, planning close at hand, and transport in context."
          eyebrow="Refined recommendation"
          featured
          title="Pasadya, brought into focus"
        />
        <ConceptGroup
          concepts={thirdHomepageConcepts}
          description="Three premium systems shaped around the journey, local culture, and the rhythm of a day."
          eyebrow="Third exploration"
          title="The premium trio"
        />
        <ConceptGroup
          concepts={newHomepageConcepts}
          description="Three new systems that break the shared skeleton of the first exploration."
          eyebrow="Second exploration"
          muted
          title="The new trio"
        />
        <ConceptGroup
          concepts={originalHomepageConcepts}
          description="The original map-first, tropical-editorial, and cinematic directions remain intact for comparison."
          eyebrow="First exploration"
          title="The original trio"
        />

        <section className="mx-auto max-w-[1480px] px-4 pb-24 pt-8 sm:px-8 sm:pb-32">
          <div className="grid gap-6 border-t border-white/10 pt-10 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Sparkles aria-hidden="true" className="h-6 w-6 text-[#F4F26A]" />
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Preview, compare, then choose.
              </h2>
              <p className="mt-2 max-w-2xl text-white/55">
                These pages are private design studies and are not indexed by
                search engines.
              </p>
            </div>
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F4F26A] px-6 font-bold text-[#0D1117] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8D9FF] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0D1117]"
              href="/search"
            >
              Explore the product
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function ConceptGroup({
  concepts,
  description,
  eyebrow,
  featured = false,
  muted = false,
  title,
}: {
  concepts: readonly HomepageConceptDefinition[];
  description: string;
  eyebrow: string;
  featured?: boolean;
  muted?: boolean;
  title: string;
}) {
  return (
    <section
      aria-labelledby={`${concepts[0]?.generation ?? "concept"}-title`}
      className={muted ? "bg-[#111821]" : "bg-[#F5F0E8] text-[#0D1117]"}
    >
      <div className="mx-auto max-w-[1480px] px-4 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-5 border-b border-current/15 pb-8 md:grid-cols-[1fr_1fr] md:items-end">
          <div>
            <p
              className={`text-xs font-bold uppercase tracking-[0.2em] ${
                muted ? "text-[#B8D9FF]" : "text-[#315CFF]"
              }`}
            >
              {eyebrow}
            </p>
            <h2
              className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-6xl"
              id={`${concepts[0]?.generation ?? "concept"}-title`}
            >
              {title}
            </h2>
          </div>
          <p
            className={`max-w-2xl leading-7 md:justify-self-end ${
              muted ? "text-white/55" : "text-[#0D1117]/60"
            }`}
          >
            {description}
          </p>
        </div>

        <div
          className={`mt-8 grid gap-5 ${featured ? "lg:grid-cols-1" : "lg:grid-cols-3"}`}
        >
          {concepts.map((concept, index) => (
            <ConceptCard
              concept={concept}
              featured={featured}
              index={index}
              key={concept.id}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ConceptCard({
  concept,
  featured = false,
  index,
}: {
  concept: HomepageConceptDefinition;
  featured?: boolean;
  index: number;
}) {
  const isLatest =
    concept.generation === "third" || concept.generation === "refined";
  const badge =
    concept.generation === "refined"
      ? {
          className: "bg-[#B8D9FF] text-[#0D1117]",
          label: "Refined recommendation",
        }
      : concept.generation === "third"
        ? {
            className: "bg-[#FF7A45] text-[#0D1117]",
            label: "Latest direction",
          }
        : concept.generation === "new"
          ? {
              className: "bg-[#F4F26A] text-[#0D1117]",
              label: "Second wave",
            }
          : {
              className: "bg-[#0D1117]/75 text-white backdrop-blur",
              label: "Original",
            };

  return (
    <article className="group relative overflow-hidden rounded-[1.75rem] bg-[#0D1117] text-[#F5F0E8] shadow-[0_24px_70px_rgba(13,17,23,0.15)] ring-1 ring-white/10">
      <Link
        aria-label={`Open ${concept.title} homepage concept`}
        className={`${featured ? "grid lg:grid-cols-[1.25fr_.75fr]" : "block"} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B8D9FF] focus-visible:ring-inset`}
        href={concept.href}
      >
        <div
          className={`relative overflow-hidden bg-[#202833] ${featured ? "aspect-[4/3] lg:aspect-auto lg:min-h-[520px]" : "aspect-[4/3]"}`}
        >
          <Image
            alt=""
            className="object-cover transition duration-700 group-hover:scale-[1.035] group-focus-within:scale-[1.035] motion-reduce:transition-none"
            fill
            priority={isLatest && index === 0}
            sizes="(min-width: 1024px) 33vw, 100vw"
            src={concept.thumbnail}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117] via-transparent to-transparent" />
          <div className="absolute left-5 top-5 flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-xs font-black text-[#0D1117]">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div
          className={`p-6 sm:p-7 ${featured ? "flex flex-col justify-center lg:p-12" : ""}`}
        >
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-3xl font-black tracking-[-0.04em]">
              {concept.title}
            </h3>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 transition-colors group-hover:bg-white group-hover:text-[#0D1117]">
              <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 min-h-[4.5rem] leading-6 text-white/60">
            {concept.summary}
          </p>

          <ul
            aria-label="Color palette"
            className="mt-6 flex items-center gap-2"
          >
            {concept.palette.map((color) => (
              <li className="contents" key={color}>
                <span
                  aria-hidden="true"
                  className="h-6 flex-1 rounded-full border border-white/15"
                  style={{ backgroundColor: color }}
                />
                <span className="sr-only">{color}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Design traits">
            {concept.tags.map((tag) => (
              <li
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70"
                key={tag}
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      </Link>
    </article>
  );
}
