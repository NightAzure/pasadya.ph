/** Temporary Samal / Davao City launch envelope (PD-036 pending polygons). */
export const LAUNCH_REGION = {
  minLatitude: 6.9,
  maxLatitude: 7.566667,
  minLongitude: 125.233333,
  maxLongitude: 125.791111,
  defaultPoint: { latitude: 7.083, longitude: 125.62 },
  label: "Samal & Davao City launch area",
} as const;

export type LaunchPoint = {
  latitude: number;
  longitude: number;
};

export function isLaunchCoordinate(latitude: number, longitude: number) {
  return (
    latitude >= LAUNCH_REGION.minLatitude &&
    latitude <= LAUNCH_REGION.maxLatitude &&
    longitude >= LAUNCH_REGION.minLongitude &&
    longitude <= LAUNCH_REGION.maxLongitude
  );
}

/** MapTiler bbox order: west, south, east, north. */
export function launchRegionBbox() {
  return [
    LAUNCH_REGION.minLongitude,
    LAUNCH_REGION.minLatitude,
    LAUNCH_REGION.maxLongitude,
    LAUNCH_REGION.maxLatitude,
  ] as const;
}

export function clampToLaunchRegion(point: LaunchPoint): LaunchPoint {
  return {
    latitude: Number(
      Math.min(
        LAUNCH_REGION.maxLatitude,
        Math.max(LAUNCH_REGION.minLatitude, point.latitude),
      ).toFixed(6),
    ),
    longitude: Number(
      Math.min(
        LAUNCH_REGION.maxLongitude,
        Math.max(LAUNCH_REGION.minLongitude, point.longitude),
      ).toFixed(6),
    ),
  };
}

export function pinPercentInLaunchRegion(point: LaunchPoint) {
  const width =
    LAUNCH_REGION.maxLongitude - LAUNCH_REGION.minLongitude;
  const height = LAUNCH_REGION.maxLatitude - LAUNCH_REGION.minLatitude;
  return {
    left: ((point.longitude - LAUNCH_REGION.minLongitude) / width) * 100,
    top: ((LAUNCH_REGION.maxLatitude - point.latitude) / height) * 100,
  };
}
