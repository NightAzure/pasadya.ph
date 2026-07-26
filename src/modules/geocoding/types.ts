export type GeocodeSuggestion = {
  id: string;
  label: string;
  placeName: string;
  latitude: number;
  longitude: number;
  inLaunchRegion: boolean;
  street: string | null;
  barangay: string | null;
  municipality: string | null;
  province: string | null;
  source: "maptiler" | "development";
};

export type GeocodeSearchResult = {
  query: string;
  suggestions: GeocodeSuggestion[];
  attribution: string;
  source: "maptiler" | "development";
};
