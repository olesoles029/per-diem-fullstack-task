import { Router, Request, Response } from "express";
import { getSquareClient } from "../squareClient.js";
import { get, set } from "../cache.js";
import type { LocationResponse, ApiErrorResponse } from "../types.js";

const CACHE_KEY = "locations";
const CACHE_TTL_MS = 5 * 60 * 1000;

const router = Router();

function formatAddress(loc: { address?: { addressLine1?: string | null; locality?: string | null; administrativeDistrictLevel1?: string | null; postalCode?: string | null } | null }): string {
  const a = loc.address;
  if (!a) return "";
  const parts = [a.addressLine1, a.locality, a.administrativeDistrictLevel1, a.postalCode].filter(Boolean) as string[];
  return parts.join(", ");
}

router.get("/", async (_req: Request, res: Response<LocationResponse[] | ApiErrorResponse>): Promise<void> => {
  try {
    const cached = get<LocationResponse[]>(CACHE_KEY);
    if (cached) {
      res.json(cached);
      return;
    }

    const client = getSquareClient();
    const { result } = await client.locationsApi.listLocations();
    if (result.errors && result.errors.length > 0) {
      res.status(502).json({
        error: "Square API error",
        code: result.errors[0].code,
        details: result.errors,
      });
      return;
    }

    const locations: LocationResponse[] = (result.locations ?? [])
      .filter((loc) => loc.status === "ACTIVE")
      .map((loc) => ({
        id: loc.id ?? "",
        name: loc.name ?? "Unnamed",
        address: formatAddress(loc),
        timezone: loc.timezone ?? "",
        status: (loc.status ?? "ACTIVE") as "ACTIVE" | "INACTIVE",
      }));

    set(CACHE_KEY, locations, CACHE_TTL_MS);
    res.json(locations);
  } catch (err) {
    console.error("GET /api/locations", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to fetch locations",
    });
  }
});

export default router;
