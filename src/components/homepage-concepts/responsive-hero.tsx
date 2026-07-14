import { getImageProps } from "next/image";

import { cn } from "@/lib/utils";

export function ResponsiveHeroArt({
  desktopSrc,
  mobileSrc,
  className,
  desktopMedia = "(min-width: 768px)",
  desktopSizes = "100vw",
  mobileSizes = "100vw",
}: {
  desktopSrc: string;
  mobileSrc: string;
  className?: string;
  desktopMedia?: string;
  desktopSizes?: string;
  mobileSizes?: string;
}) {
  const {
    props: { srcSet: desktopSrcSet, sizes: resolvedDesktopSizes },
  } = getImageProps({
    alt: "",
    fetchPriority: "high",
    height: 941,
    loading: "eager",
    quality: 75,
    sizes: desktopSizes,
    src: desktopSrc,
    width: 1672,
  });
  const { props: mobileProps } = getImageProps({
    alt: "",
    fetchPriority: "high",
    height: 1536,
    loading: "eager",
    quality: 75,
    sizes: mobileSizes,
    src: mobileSrc,
    width: 1024,
  });

  return (
    <picture>
      <source
        media={desktopMedia}
        sizes={resolvedDesktopSizes}
        srcSet={desktopSrcSet}
      />
      <img
        {...mobileProps}
        alt=""
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
    </picture>
  );
}
