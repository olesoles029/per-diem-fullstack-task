import type { LocationResponse } from "../types";

interface Props {
  locations: LocationResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function LocationSelector({ locations, selectedId, onSelect, disabled }: Props) {
  return (
    <div className="location-selector">
      <label htmlFor="location-select" className="location-label">
        Location
      </label>
      <select
        id="location-select"
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        aria-label="Select location"
      >
        <option value="">Select a location…</option>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
    </div>
  );
}
