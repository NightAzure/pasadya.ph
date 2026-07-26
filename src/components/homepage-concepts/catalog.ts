export type HomepageConceptGeneration =
  "original" | "new" | "third" | "refined";

export type HomepageConceptDefinition = {
  id:
    | "gulf-lines"
    | "harvest-club"
    | "volcanic-quiet"
    | "lumen-coast"
    | "tripline-studio"
    | "afterglow-social"
    | "pearl-monsoon"
    | "kinabuhi-index"
    | "quiet-hours"
    | "pasadya-daylight"
    | "sunlit-field-guide";
  generation: HomepageConceptGeneration;
  href: `/homepage-concepts/${string}`;
  title: string;
  summary: string;
  palette: readonly string[];
  thumbnail: string;
  tags: readonly string[];
};

export const homepageConcepts = [
  {
    id: "sunlit-field-guide",
    generation: "refined",
    href: "/homepage-concepts/sunlit-field-guide",
    title: "Sunlit Field Guide",
    summary:
      "A paper-warm editorial homepage that turns discovery, saved places, and practical routes into one readable local field guide.",
    palette: ["#F7F0E4", "#0B2344", "#087F78", "#E66F50", "#F1C35B"],
    thumbnail:
      "/homepage-concepts/shared-photography/samal-dock-desktop.webp",
    tags: ["Editorial", "Responsive", "Journey-led"],
  },
  {
    id: "pasadya-daylight",
    generation: "refined",
    href: "/homepage-concepts/pasadya-daylight",
    title: "Pasadya Daylight",
    summary:
      "A search-first marketplace direction for comparing real local places, then planning how to get there.",
    palette: ["#FFF9EF", "#202231", "#315CFF", "#0F766E", "#FF7048"],
    thumbnail: "/homepage-concepts/shared-photography/samal-shore-desktop.webp",
    tags: ["Recommended", "Marketplace", "Plan-ready"],
  },
  {
    id: "gulf-lines",
    generation: "original",
    href: "/homepage-concepts/gulf-lines",
    title: "Gulf Lines",
    summary:
      "A map-and-motion concept built around the route from Davao City to Samal.",
    palette: ["#052D35", "#42DECA", "#F2E9D5", "#FF7858"],
    thumbnail: "/homepage-concepts/gulf-lines/hero-desktop.webp",
    tags: ["Map-first", "Marine", "Transport-led"],
  },
  {
    id: "harvest-club",
    generation: "original",
    href: "/homepage-concepts/harvest-club",
    title: "Harvest Club",
    summary:
      "A tropical-modern club house with local produce, paper texture, and bold utility.",
    palette: ["#FFF1D2", "#17483A", "#C8DA3B", "#F05E48"],
    thumbnail: "/homepage-concepts/harvest-club/hero-desktop.webp",
    tags: ["Tropical", "Editorial", "Neo-brutal"],
  },
  {
    id: "volcanic-quiet",
    generation: "original",
    href: "/homepage-concepts/volcanic-quiet",
    title: "Volcanic Quiet",
    summary:
      "A cinematic, slow-travel editorial with nocturnal coastal photography.",
    palette: ["#111310", "#F3EDE3", "#DFAF45", "#D94D86"],
    thumbnail: "/homepage-concepts/volcanic-quiet/hero-desktop.webp",
    tags: ["Cinematic", "Luxury", "Story-led"],
  },
  {
    id: "lumen-coast",
    generation: "new",
    href: "/homepage-concepts/lumen-coast",
    title: "Lumen Coast",
    summary:
      "A bright editorial index that lets people switch between the city and the island.",
    palette: ["#F7F3EA", "#2A1934", "#315CFF", "#FF6A4D", "#DDE8FF"],
    thumbnail: "/homepage-concepts/shared-photography/samal-shore-desktop.webp",
    tags: ["Daylight", "Refined", "Area lens"],
  },
  {
    id: "tripline-studio",
    generation: "new",
    href: "/homepage-concepts/tripline-studio",
    title: "Tripline Studio",
    summary:
      "A product-forward discovery workspace for filtering places and understanding the journey.",
    palette: ["#111827", "#EEF2FF", "#6D5DFB", "#A7F3D0", "#FF7A45"],
    thumbnail:
      "/homepage-concepts/shared-photography/davao-aerial-desktop.webp",
    tags: ["Interactive", "Systematic", "Task-first"],
  },
  {
    id: "afterglow-social",
    generation: "new",
    href: "/homepage-concepts/afterglow-social",
    title: "Afterglow Social",
    summary:
      "A vivid city-to-island ticket board with a user-controlled local story reel.",
    palette: ["#401421", "#FF574A", "#B8D9FF", "#F4F26A", "#FFF7ED"],
    thumbnail:
      "/homepage-concepts/shared-photography/davao-sunset-desktop.webp",
    tags: ["Expressive", "Social", "Kinetic"],
  },
  {
    id: "pearl-monsoon",
    generation: "third",
    href: "/homepage-concepts/pearl-monsoon",
    title: "Pearl Monsoon",
    summary:
      "A polished journey composer that connects city, ferry, island, and place in one calm flow.",
    palette: ["#F4F7FA", "#19324A", "#86B7C9", "#C79A62", "#30221D"],
    thumbnail: "/homepage-concepts/shared-photography/samal-shore-desktop.webp",
    tags: ["Transport-first", "Layered", "Concierge"],
  },
  {
    id: "kinabuhi-index",
    generation: "third",
    href: "/homepage-concepts/kinabuhi-index",
    title: "Kinabuhi Index",
    summary:
      "A living local index where stories, places, and culture become the navigation.",
    palette: ["#F3E9D8", "#17192B", "#E55A45", "#337565", "#D3A632"],
    thumbnail:
      "/homepage-concepts/shared-photography/davao-durian-desktop.webp",
    tags: ["Culture-led", "Tactile", "Editorial"],
  },
  {
    id: "quiet-hours",
    generation: "third",
    href: "/homepage-concepts/quiet-hours",
    title: "Quiet Hours",
    summary:
      "An adaptive daypart concierge that reshapes discovery from first light to after dark.",
    palette: ["#E7E3F4", "#234A91", "#FFF7E7", "#14233D", "#FF715B"],
    thumbnail:
      "/homepage-concepts/shared-photography/davao-sunset-desktop.webp",
    tags: ["Time-led", "Adaptive", "Low-motion"],
  },
] as const satisfies readonly HomepageConceptDefinition[];

export const originalHomepageConcepts = homepageConcepts.filter(
  (concept) => concept.generation === "original",
);

export const newHomepageConcepts = homepageConcepts.filter(
  (concept) => concept.generation === "new",
);

export const thirdHomepageConcepts = homepageConcepts.filter(
  (concept) => concept.generation === "third",
);

export const refinedHomepageConcepts = homepageConcepts.filter(
  (concept) => concept.generation === "refined",
);
