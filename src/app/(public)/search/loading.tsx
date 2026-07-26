import styles from "@/components/discovery/search-workspace.module.css";
import { cn } from "@/lib/utils";

export default function SearchLoading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto w-full max-w-[1600px] px-3 pb-20 pt-3 sm:px-4 lg:px-5 lg:pb-8"
      role="status"
    >
      <span className="sr-only">Loading places</span>
      <div className={styles.toolbar}>
        <div className={styles.toolbarContent}>
          <div
            aria-hidden="true"
            className={cn(
              "h-12 rounded-[14px_14px_30px_14px]",
              styles.skeletonBlock,
            )}
          />
          <div aria-hidden="true" className={styles.quickRail}>
            {[72, 108, 148, 164, 112].map((width) => (
              <span
                className={cn(
                  "h-[42px] shrink-0 rounded-full",
                  styles.skeletonBlock,
                )}
                key={width}
                style={{ width }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.summaryRow}>
        <div className="space-y-2">
          <div
            aria-hidden="true"
            className={cn("h-5 w-36 rounded", styles.skeletonBlock)}
          />
          <div
            aria-hidden="true"
            className={cn("h-3 w-56 max-w-full rounded", styles.skeletonBlock)}
          />
        </div>
        <div
          aria-hidden="true"
          className={cn("h-[42px] w-32 rounded-full", styles.skeletonBlock)}
        />
      </div>

      <div className={cn(styles.split, styles.splitWithMap)}>
        <div className={styles.resultsList}>
          {Array.from({ length: 4 }, (_, index) => (
            <div aria-hidden="true" className={styles.skeletonCard} key={index}>
              <div className="sm:grid sm:min-h-[168px] sm:grid-cols-[42%_58%]">
                <div
                  className={cn(
                    "aspect-[16/10] sm:aspect-auto",
                    styles.skeletonBlock,
                  )}
                />
                <div className="space-y-3 p-4">
                  <div
                    className={cn("h-5 w-2/3 rounded", styles.skeletonBlock)}
                  />
                  <div
                    className={cn("h-3 w-1/2 rounded", styles.skeletonBlock)}
                  />
                  <div
                    className={cn(
                      "h-6 w-20 rounded-full",
                      styles.skeletonBlock,
                    )}
                  />
                  <div
                    className={cn("h-10 w-full rounded", styles.skeletonBlock)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.mapDesktopHost}>
          <div
            aria-hidden="true"
            className={cn(styles.mapFrame, styles.skeletonBlock)}
          />
        </div>
      </div>
    </div>
  );
}
