import { Client, Environment } from "square";
import type { CatalogObject } from "square";

let squareClient: Client | null = null;

export function getSquareClient(): Client {
  if (!squareClient) {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const env = process.env.SQUARE_ENVIRONMENT === "production" ? Environment.Production : Environment.Sandbox;
    if (!accessToken) throw new Error("SQUARE_ACCESS_TOKEN is required");
    squareClient = new Client({ accessToken, environment: env });
  }
  return squareClient;
}

export function isPresentAtLocation(obj: CatalogObject, locationId: string): boolean {
  const presentAll = obj.presentAtAllLocations ?? true;
  const presentIds = obj.presentAtLocationIds ?? [];
  const absentIds = obj.absentAtLocationIds ?? [];
  if (absentIds.includes(locationId)) return false;
  if (presentAll) return true;
  return presentIds.includes(locationId);
}
