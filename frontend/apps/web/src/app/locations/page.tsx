import type { Metadata } from "next";
import LocationsContent from "./LocationsContent";
import LocationsHeader from "./LocationsHeader";

export const metadata: Metadata = {
  title: "Locations — Atlas",
  description: "Find Bakerio shops across Saigon, updated from live branch availability.",
};

export default function LocationsPage() {
  return (
    <div className="bg-cream text-espresso">
      <LocationsHeader />
      <LocationsContent />
    </div>
  );
}
