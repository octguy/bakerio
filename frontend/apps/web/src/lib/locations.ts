import type { Branch } from "@repo/api-client";

export interface WebLocation {
  id: string;
  name: string;
  address: string;
  hours: string;
  lat: number;
  lng: number;
}

const DEFAULT_HOURS = "Mon–Sun 7:00–22:00";

export function toWebLocations(branches: Branch[]): WebLocation[] {
  return branches
    .filter((branch) => branch.status !== "inactive")
    .map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      hours: DEFAULT_HOURS,
      lat: typeof branch.lat === "number" ? branch.lat : 10.7769,
      lng: typeof branch.lng === "number" ? branch.lng : 106.7009,
    }));
}
