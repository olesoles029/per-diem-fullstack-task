import type {
  LocationResponse,
  CategorySummary,
  CatalogResponse,
  ApiErrorResponse,
} from "./types";

const API = import.meta.env.VITE_API_URL ?? "/api";

async function handleRes<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as ApiErrorResponse;
    throw new Error(err.error ?? `Request failed ${res.status}`);
  }
  return data as T;
}

export async function fetchLocations(): Promise<LocationResponse[]> {
  const res = await fetch(`${API}/locations`);
  return handleRes<LocationResponse[]>(res);
}

export async function fetchCategories(locationId: string): Promise<CategorySummary[]> {
  const res = await fetch(`${API}/catalog/categories?location_id=${encodeURIComponent(locationId)}`);
  return handleRes<CategorySummary[]>(res);
}

export async function fetchCatalog(locationId: string): Promise<CatalogResponse> {
  const res = await fetch(`${API}/catalog?location_id=${encodeURIComponent(locationId)}`);
  return handleRes<CatalogResponse>(res);
}

const LOCATION_STORAGE_KEY = "perdiem_selected_location_id";

export function getStoredLocationId(): string | null {
  return localStorage.getItem(LOCATION_STORAGE_KEY);
}

export function setStoredLocationId(id: string): void {
  localStorage.setItem(LOCATION_STORAGE_KEY, id);
}
