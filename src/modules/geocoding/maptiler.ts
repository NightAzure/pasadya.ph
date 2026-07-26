import { z } from "zod";

import {
  isLaunchCoordinate,
  launchRegionBbox,
  LAUNCH_REGION,
} from "@/lib/launch-region";
import type {
  GeocodeSearchResult,
  GeocodeSuggestion,
} from "@/modules/geocoding/types";

export type { GeocodeSearchResult, GeocodeSuggestion };

const searchQuerySchema = z
  .string()
  .trim()
  .min(3, "Type at least 3 characters to search.")
  .max(180);

const featureSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  place_name: z.string(),
  center: z.tuple([z.number(), z.number()]).optional(),
  geometry: z
    .object({
      type: z.string(),
      coordinates: z.array(z.number()).optional(),
    })
    .optional(),
  address: z.string().optional(),
  place_type: z.array(z.string()).optional(),
  context: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
      }),
    )
    .optional(),
});

const responseSchema = z.object({
  features: z.array(featureSchema).default([]),
  attribution: z.string().optional(),
});

const DEVELOPMENT_PLACES: Array<{
  id: string;
  label: string;
  placeName: string;
  latitude: number;
  longitude: number;
  street: string | null;
  barangay: string | null;
  municipality: string;
  province: string;
}> = [
  {
    id: "dev.babak-wharf",
    label: "Babak Wharf",
    placeName: "Babak Wharf, Island Garden City of Samal, Davao del Norte",
    latitude: 7.1285,
    longitude: 125.6872,
    street: "Babak Wharf Road",
    barangay: "Babak",
    municipality: "Island Garden City of Samal",
    province: "Davao del Norte",
  },
  {
    id: "dev.kaputian",
    label: "Kaputian",
    placeName: "Kaputian, Island Garden City of Samal, Davao del Norte",
    latitude: 6.982,
    longitude: 125.718,
    street: null,
    barangay: "Kaputian",
    municipality: "Island Garden City of Samal",
    province: "Davao del Norte",
  },
  {
    id: "dev.penaplata",
    label: "Peñaplata",
    placeName: "Peñaplata, Island Garden City of Samal, Davao del Norte",
    latitude: 7.0745,
    longitude: 125.7088,
    street: null,
    barangay: "Peñaplata",
    municipality: "Island Garden City of Samal",
    province: "Davao del Norte",
  },
  {
    id: "dev.davao-centre",
    label: "Davao City centre",
    placeName: "Davao City, Davao del Sur",
    latitude: LAUNCH_REGION.defaultPoint.latitude,
    longitude: LAUNCH_REGION.defaultPoint.longitude,
    street: null,
    barangay: null,
    municipality: "Davao City",
    province: "Davao del Sur",
  },
  {
    id: "dev.santa-ana",
    label: "Santa Ana Wharf",
    placeName: "Santa Ana Wharf, Davao City, Davao del Sur",
    latitude: 7.0738,
    longitude: 125.6275,
    street: "Santa Ana Avenue",
    barangay: "Centro",
    municipality: "Davao City",
    province: "Davao del Sur",
  },
];

function configuredMaptilerKey() {
  return (
    process.env.MAPTILER_API_KEY ?? process.env.NEXT_PUBLIC_MAPTILER_API_KEY
  );
}

function isDevelopmentMaptiler() {
  const key = configuredMaptilerKey();
  return (
    process.env.NODE_ENV !== "production" &&
    (!key || key.startsWith("replace-with-"))
  );
}

function maptilerApiKey() {
  const key = configuredMaptilerKey();
  if (!key || key.startsWith("replace-with-")) {
    throw new Error(
      "NEXT_PUBLIC_MAPTILER_API_KEY (or MAPTILER_API_KEY) is required outside development.",
    );
  }
  return key;
}

function contextText(
  context: Array<{ id: string; text: string }> | undefined,
  prefixes: string[],
) {
  if (!context) return null;
  for (const prefix of prefixes) {
    const match = context.find((item) => item.id.startsWith(`${prefix}.`));
    if (match?.text) return match.text;
  }
  return null;
}

function toSuggestion(
  feature: z.infer<typeof featureSchema>,
  source: "maptiler" | "development",
): GeocodeSuggestion | null {
  const longitude =
    feature.center?.[0] ?? feature.geometry?.coordinates?.[0] ?? null;
  const latitude =
    feature.center?.[1] ?? feature.geometry?.coordinates?.[1] ?? null;
  if (longitude === null || latitude === null) return null;

  const streetParts = [feature.address, feature.text].filter(Boolean);
  const placeTypes = feature.place_type ?? [];
  const street =
    placeTypes.some((type) =>
      ["address", "street", "road", "poi"].includes(type),
    ) && streetParts.length > 0
      ? streetParts.join(" ")
      : (feature.address ?? null);

  return {
    id: feature.id,
    label: feature.text ?? feature.place_name,
    placeName: feature.place_name,
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    inLaunchRegion: isLaunchCoordinate(latitude, longitude),
    street,
    barangay: contextText(feature.context, [
      "locality",
      "neighborhood",
      "place",
    ]),
    municipality: contextText(feature.context, [
      "municipality",
      "city",
      "place",
    ]),
    province: contextText(feature.context, ["region", "province", "subregion"]),
    source,
  };
}

function searchDevelopmentPlaces(query: string): GeocodeSearchResult {
  const normalized = query.toLowerCase();
  const suggestions = DEVELOPMENT_PLACES.filter((place) =>
    `${place.label} ${place.placeName}`.toLowerCase().includes(normalized),
  )
    .slice(0, 5)
    .map((place): GeocodeSuggestion => ({
      id: place.id,
      label: place.label,
      placeName: place.placeName,
      latitude: place.latitude,
      longitude: place.longitude,
      inLaunchRegion: isLaunchCoordinate(place.latitude, place.longitude),
      street: place.street,
      barangay: place.barangay,
      municipality: place.municipality,
      province: place.province,
      source: "development",
    }));

  return {
    query,
    suggestions,
    attribution: "Development geocoder fixtures for Samal and Davao City.",
    source: "development",
  };
}

export async function searchLaunchAddresses(
  rawQuery: string,
  options?: { fetchImpl?: typeof fetch },
): Promise<GeocodeSearchResult> {
  const query = searchQuerySchema.parse(rawQuery);

  if (isDevelopmentMaptiler()) {
    return searchDevelopmentPlaces(query);
  }

  const key = maptilerApiKey();
  const bbox = launchRegionBbox().join(",");
  const proximity = `${LAUNCH_REGION.defaultPoint.longitude},${LAUNCH_REGION.defaultPoint.latitude}`;
  const url = new URL(
    `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json`,
  );
  url.searchParams.set("key", key);
  url.searchParams.set("bbox", bbox);
  url.searchParams.set("proximity", proximity);
  url.searchParams.set("country", "ph");
  url.searchParams.set("language", "en");
  url.searchParams.set("limit", "5");
  url.searchParams.set("autocomplete", "true");

  const fetchImpl = options?.fetchImpl ?? fetch;
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(
      `MapTiler geocoding failed with status ${response.status}.`,
    );
  }

  const payload = responseSchema.parse(await response.json());
  const suggestions = payload.features
    .map((feature) => toSuggestion(feature, "maptiler"))
    .filter((item): item is GeocodeSuggestion => item !== null)
    .filter((item) => item.inLaunchRegion)
    .slice(0, 5);

  return {
    query,
    suggestions,
    attribution:
      payload.attribution ?? "© MapTiler © OpenStreetMap contributors",
    source: "maptiler",
  };
}

export function parseGeocodeQuery(rawQuery: string) {
  return searchQuerySchema.parse(rawQuery);
}
