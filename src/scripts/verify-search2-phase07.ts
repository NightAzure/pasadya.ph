import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition)
    throw new Error(`Search 2.0 Phase 7 verification failed: ${message}`);
}

function read(file: string) {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

function run() {
  const map = read("src/components/discovery/search-map.tsx");
  const canvas = read("src/components/discovery/search-map-canvas.tsx");
  const workspace = read("src/components/discovery/search-workspace.tsx");
  const env = read(".env.example");

  assert(map.includes("dynamic("), "MapLibre is not loaded as a client chunk");
  assert(
    canvas.includes('type: "geojson"'),
    "map does not use a GeoJSON source",
  );
  assert(
    canvas.includes("cluster: true"),
    "map does not cluster dense results",
  );
  assert(canvas.includes("id: clusterLayerId"), "cluster layer is missing");
  assert(canvas.includes("id: placeLayerId"), "place layer is missing");
  assert(
    canvas.includes("id: priceLayerId"),
    "verified-price pin layer is missing",
  );
  assert(
    canvas.includes("id: unpricedLayerId"),
    "neutral place pin layer is missing",
  );
  assert(
    canvas.includes("getCurrentPosition"),
    "locate-me control is missing",
  );
  assert(canvas.includes("© MapTiler"), "MapTiler attribution is missing");
  assert(
    canvas.includes("© OpenStreetMap contributors"),
    "OSM attribution is missing",
  );
  assert(canvas.includes("Return to list"), "mobile list fallback is missing");
  assert(workspace.includes("<SearchMap"), "workspace does not render the map");
  assert(
    workspace.includes("MapResultsSheet") || workspace.includes("mapSheet"),
    "mobile map results sheet is missing",
  );
  assert(
    workspace.includes("onSelectListing"),
    "pin-to-card selection is missing",
  );
  assert(
    workspace.includes("hoveredListingId"),
    "card hover/focus is not shared with pins",
  );
  assert(
    workspace.includes("sessionOrigin"),
    "current location is not retained in-memory",
  );
  assert(
    !workspace.includes(
      "sessionStorage.setItem(\n        `search-workspace:${window.location.search}`,\n        JSON.stringify({ sessionOrigin",
    ),
    "precise location leaked into session storage",
  );
  assert(
    env.includes("NEXT_PUBLIC_MAPTILER_API_KEY"),
    "browser MapTiler API key is undocumented",
  );
  console.log("Search 2.0 Phase 7 map verification passed");
}

run();
