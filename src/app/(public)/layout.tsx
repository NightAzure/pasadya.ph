import {
  FieldGuideSiteFooter,
  FieldGuideSiteHeader,
} from "@/components/homepage-concepts/sunlit-field-guide-chrome";
import styles from "@/components/homepage-concepts/sunlit-field-guide.module.css";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <FieldGuideSiteHeader />
      <main id="main-content">{children}</main>
      <FieldGuideSiteFooter />
    </div>
  );
}
