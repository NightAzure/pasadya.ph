import Image from "next/image";
import Link from "next/link";
import {
  BedDouble,
  Compass,
  ConciergeBell,
  House,
  Map,
  Search,
  Sparkles,
  UtensilsCrossed,
  UserRound,
  Waves,
} from "lucide-react";

import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { areaOptions } from "@/modules/listings/search";

export type ConceptVariant = "volcanic" | "harvest" | "gulf";

const categories = [
  { href: "/search?category=resort", label: "Resorts", icon: Waves },
  { href: "/search?category=room", label: "Rooms", icon: BedDouble },
  {
    href: "/search?category=restaurant",
    label: "Food",
    icon: UtensilsCrossed,
  },
  {
    href: "/search?category=activity",
    label: "Activities",
    icon: Sparkles,
  },
  {
    href: "/search?category=service",
    label: "Services",
    icon: ConciergeBell,
  },
] as const;

const theme = {
  volcanic: {
    brandMark: "ring-[#F3EDE3]/20",
    form: "border-[#F3EDE3]/30 bg-[#F3EDE3]/95 text-[#111310] shadow-[0_24px_80px_rgba(0,0,0,0.32)]",
    control:
      "border-[#111310]/15 bg-white/70 text-[#111310] placeholder:text-[#503328]/65 focus-visible:ring-[#D94D86]",
    button:
      "bg-[#D94D86] text-[#111310] hover:bg-[#E5669A] focus-visible:ring-[#DFAF45]",
    category:
      "border-[#503328]/25 bg-[#F3EDE3]/8 text-[#F3EDE3] hover:border-[#D94D86] hover:bg-[#D94D86]/12 focus-visible:ring-[#DFAF45]",
    mobile: "border-[#F3EDE3]/15 bg-[#111310]/95 text-[#F3EDE3]",
    mobileActive: "text-[#DFAF45]",
  },
  harvest: {
    brandMark: "ring-[#17483A]/15",
    form: "border-[#17483A] bg-[#17483A] text-[#FFF1D2] shadow-[8px_10px_0_#C8DA3B]",
    control:
      "border-[#FFF1D2]/25 bg-[#FFF1D2] text-[#17483A] placeholder:text-[#613B2D]/60 focus-visible:ring-[#C8DA3B]",
    button:
      "bg-[#C8DA3B] text-[#17483A] hover:bg-[#D8E866] focus-visible:ring-[#FFF1D2]",
    category:
      "border-[#17483A] bg-[#FFF1D2] text-[#17483A] shadow-[4px_4px_0_#17483A] hover:-translate-y-0.5 hover:bg-[#C8DA3B] focus-visible:ring-[#F05E48]",
    mobile: "border-[#17483A] bg-[#FFF1D2]/95 text-[#17483A]",
    mobileActive: "bg-[#C8DA3B]/55 text-[#17483A]",
  },
  gulf: {
    brandMark: "ring-[#42DECA]/25",
    form: "border-[#42DECA]/25 bg-[#F2E9D5] text-[#052D35] shadow-[0_28px_90px_rgba(0,0,0,0.3)]",
    control:
      "border-[#052D35]/15 bg-white/65 text-[#052D35] placeholder:text-[#052D35]/55 focus-visible:ring-[#42DECA]",
    button:
      "bg-[#42DECA] text-[#052D35] hover:bg-[#70E9D9] focus-visible:ring-[#FF7858]",
    category:
      "border-[#42DECA]/30 bg-[#052D35]/60 text-[#F2E9D5] hover:border-[#42DECA] hover:bg-[#42DECA]/10 focus-visible:ring-[#FF7858]",
    mobile: "border-[#42DECA]/20 bg-[#052D35]/95 text-[#F2E9D5]",
    mobileActive: "text-[#42DECA]",
  },
} as const;

export function ConceptBrand({
  homeHref = "/",
  className,
  markClassName,
  wordClassName,
}: {
  homeHref?: string;
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-11 items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-4 focus-visible:ring-offset-transparent",
        className,
      )}
      href={homeHref}
    >
      <span
        className={cn(
          "relative h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1",
          markClassName,
        )}
      >
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="40px"
          src="/icon.svg"
          unoptimized
        />
      </span>
      <span
        className={cn("text-lg font-semibold tracking-tight", wordClassName)}
      >
        {BRAND_NAME}
      </span>
    </Link>
  );
}

export function ConceptSearchForm({
  variant,
  className,
  placeholder = "Try “beach day,” “airport stay,” or “seafood”…",
  buttonLabel = "Find Places",
}: {
  variant: ConceptVariant;
  className?: string;
  placeholder?: string;
  buttonLabel?: string;
}) {
  const styles = theme[variant];

  return (
    <form
      action="/search"
      className={cn(
        "grid gap-2 rounded-[1.75rem] border p-2 sm:grid-cols-[minmax(0,1fr)_190px_auto] sm:items-end",
        styles.form,
        className,
      )}
      method="get"
      role="search"
    >
      <label className="grid min-w-0 gap-1 px-1 text-xs font-semibold uppercase tracking-[0.14em]">
        Search
        <span className="relative block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70"
          />
          <input
            autoComplete="off"
            className={cn(
              "min-h-12 w-full rounded-2xl border py-3 pl-11 pr-4 text-base font-medium normal-case tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              styles.control,
            )}
            name="q"
            placeholder={placeholder}
            spellCheck={false}
            type="search"
          />
        </span>
      </label>
      <label className="grid gap-1 px-1 text-xs font-semibold uppercase tracking-[0.14em]">
        Area
        <select
          className={cn(
            "min-h-12 w-full rounded-2xl border px-4 text-base font-medium normal-case tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            styles.control,
          )}
          defaultValue=""
          name="area"
        >
          <option value="">All Areas</option>
          {Object.entries(areaOptions).map(([slug, area]) => (
            <option key={slug} value={slug}>
              {area.label}
            </option>
          ))}
        </select>
      </label>
      <button
        className={cn(
          "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition-[background-color,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-0",
          styles.button,
        )}
        type="submit"
      >
        <Compass aria-hidden="true" className="h-4 w-4" />
        {buttonLabel}
      </button>
    </form>
  );
}

export function ConceptCategoryLinks({
  variant,
  className,
  linkClassName,
}: {
  variant: ConceptVariant;
  className?: string;
  linkClassName?: string;
}) {
  return (
    <nav aria-label="Browse place categories" className={className}>
      <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => {
          const Icon = category.icon;

          return (
            <Link
              className={cn(
                "inline-flex min-h-12 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-[background-color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                theme[variant].category,
                linkClassName,
              )}
              href={category.href}
              key={category.label}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {category.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function ConceptMobileNav({
  homeHref,
  variant,
  className,
}: {
  homeHref: string;
  variant: ConceptVariant;
  className?: string;
}) {
  const items = [
    { href: homeHref, label: "Home", icon: House, active: true },
    { href: "/search", label: "Search", icon: Search, active: false },
    { href: "/transport", label: "Routes", icon: Map, active: false },
    { href: "/account", label: "Account", icon: UserRound, active: false },
  ] as const;

  return (
    <nav
      aria-label="Mobile navigation"
      className={cn(
        "fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-2xl border px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 shadow-2xl backdrop-blur-xl md:hidden",
        theme[variant].mobile,
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors hover:bg-current/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
              item.active && theme[variant].mobileActive,
            )}
            href={item.href}
            key={item.label}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function formatConceptPrice(price: number | null) {
  return price ? pesoFormatter.format(price / 100) : "Ask for Rates";
}
