import type { Branch } from "@repo/api-client";

export interface WebLocation {
  id: string;
  name: string;
  address: string;
  region: string;
  hours: string;
  lat: number;
  lng: number;
}

const DEFAULT_HOURS = "Mon–Sun 7:00–22:00";

function regionFromAddress(address: string, fallback?: string) {
  if (address.includes("Quận 1")) return "District 1";
  if (address.includes("Quận 7")) return "District 7";
  if (address.includes("Thủ Đức")) return "Thủ Đức";
  if (address.includes("Hoàn Kiếm")) return "Hà Nội";
  if (fallback === "north") return "Hà Nội";
  if (fallback === "central") return "Central";
  return "Saigon";
}

export function toWebLocations(branches: Branch[]): WebLocation[] {
  return branches
    .filter((branch) => branch.status !== "inactive")
    .map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      region: regionFromAddress(branch.address, branch.region),
      hours: DEFAULT_HOURS,
      lat: typeof branch.lat === "number" ? branch.lat : 10.7769,
      lng: typeof branch.lng === "number" ? branch.lng : 106.7009,
    }));
}

export function locationRegions(locations: WebLocation[]) {
  return ["All", ...Array.from(new Set(locations.map((location) => location.region)))] as const;
}
