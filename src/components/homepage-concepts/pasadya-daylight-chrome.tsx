import Link from "next/link";
import { Search, UserRound } from "lucide-react";

import styles from "@/components/homepage-concepts/pasadya-daylight.module.css";
import { BRAND_NAME } from "@/lib/brand";

export function DaylightHeader() {
  return (
    <header className={styles.header}>
      <nav aria-label="Main navigation" className={styles.headerInner}>
        <DaylightBrand />
        <div className={styles.desktopNav}>
          <Link href="/search">Search</Link>
          <Link href="/search">Places</Link>
          <Link href="/#plan">Plan</Link>
          <Link href="/transport">Guide & Routes</Link>
          <Link href="/portal/claims/new">For Owners</Link>
          <Link className={styles.accountLink} href="/account">
            <UserRound aria-hidden="true" />
            Account
          </Link>
        </div>
        <div className={styles.mobileHeaderActions}>
          <Link aria-label="Search places" href="/search">
            <Search aria-hidden="true" />
          </Link>
          <Link aria-label="Open your Pasadya account" href="/account">
            <UserRound aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function DaylightFooter({
  claimHref = "/portal/claims/new",
  isConcept = false,
}: {
  claimHref?: string;
  isConcept?: boolean;
}) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <DaylightBrand />
          <p>
            Local discovery, booking options, and practical routes for Davao and
            Samal.
          </p>
        </div>
        <nav aria-label="Footer navigation" className={styles.footerNav}>
          <Link href="/search">Search</Link>
          <Link href="/transport">Transport</Link>
          <Link href={claimHref}>Claim a Listing</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/transport-disclaimer">Transport notice</Link>
          <Link href="/legal/cancellation-policy">Cancellation policy</Link>
        </nav>
      </div>
      <div className={styles.footerMeta}>
        <p>
          {isConcept
            ? "Pasadya Daylight · Private homepage concept"
            : "Pasadya · Local discovery, booking options, and practical routes for Davao and Samal."}
        </p>
        {isConcept ? (
          <Link href="/homepage-concepts">Concept Gallery</Link>
        ) : null}
      </div>
    </footer>
  );
}

function DaylightBrand() {
  return (
    <Link className={styles.brand} href="/" translate="no">
      <span aria-hidden="true" className={styles.brandMark}>
        <span />
        <span />
        <span />
      </span>
      <span>{BRAND_NAME}</span>
    </Link>
  );
}
