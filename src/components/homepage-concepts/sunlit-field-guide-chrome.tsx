import Link from "next/link";
import { Bookmark, ChevronRight, Compass, Menu, UserRound } from "lucide-react";

import styles from "@/components/homepage-concepts/sunlit-field-guide.module.css";
import { BRAND_NAME } from "@/lib/brand";

export function FieldGuideSiteHeader() {
  return (
    <header className={styles.header}>
      <nav aria-label="Primary navigation" className={styles.headerInner}>
        <Link
          aria-label={`${BRAND_NAME} home`}
          className={styles.brand}
          href="/"
          translate="no"
        >
          <span aria-hidden="true" className={styles.brandMark}>
            <Compass />
          </span>
          <span>{BRAND_NAME}</span>
          <small>Field guide</small>
        </Link>

        <div className={styles.desktopNav}>
          <Link href="/search">Explore</Link>
          <Link href="/#day-plan">Plan a day</Link>
          <Link href="/#field-notes">Local guides</Link>
          <Link href="/transport">Routes</Link>
        </div>

        <div className={styles.headerActions}>
          <Link className={styles.savedLink} href="/account">
            <Bookmark aria-hidden="true" />
            Saved
          </Link>
          <Link className={styles.headerCta} href="/account">
            Account
            <UserRound aria-hidden="true" />
          </Link>
        </div>

        <details className={styles.mobileMenu}>
          <summary aria-label="Open navigation">
            <Menu aria-hidden="true" />
          </summary>
          <nav aria-label="Mobile menu">
            <Link href="/search">
              Explore
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link href="/#day-plan">
              Plan a day
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link href="/#field-notes">
              Local guides
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link href="/transport">
              Routes
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link href="/account">
              Saved & account
              <ChevronRight aria-hidden="true" />
            </Link>
          </nav>
        </details>
      </nav>
    </header>
  );
}

export function FieldGuideSiteFooter({
  claimHref = "/portal/claims/new",
}: {
  claimHref?: string;
}) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <div className={styles.footerWordmark}>{BRAND_NAME}</div>
          <p>
            Madayaw. Find local places, honest details, and practical routes for
            days around Davao and Samal.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <div>
            <strong>Explore</strong>
            <Link href="/search">Find places</Link>
            <Link href="/#day-plan">Plan a day</Link>
            <Link href="/transport">Transport</Link>
          </div>
          <div>
            <strong>For owners</strong>
            <Link href={claimHref}>Claim a listing</Link>
            <Link href="/portal">Owner portal</Link>
          </div>
          <div>
            <strong>Information</strong>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
          </div>
        </nav>
      </div>
      <div className={styles.footerMeta}>
        <span>Sunlit Field Guide | Live homepage direction</span>
        <span>Made for bright days and practical plans.</span>
      </div>
    </footer>
  );
}
