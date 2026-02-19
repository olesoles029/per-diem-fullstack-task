import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchLocations,
  fetchCategories,
  fetchCatalog,
  getStoredLocationId,
  setStoredLocationId,
} from "./api";

describe("api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    localStorage.clear();
  });

  it("fetchLocations returns data on 200", async () => {
    const data = [{ id: "1", name: "Main", address: "123 Main", timezone: "UTC", status: "ACTIVE" }];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(data),
    });
    const result = await fetchLocations();
    expect(result).toEqual(data);
    expect(fetch).toHaveBeenCalledWith("/api/locations");
  });

  it("fetchLocations throws on non-ok", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Server error" }),
    });
    await expect(fetchLocations()).rejects.toThrow("Server error");
  });

  it("fetchCategories calls with location_id", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: "c1", name: "Drinks", item_count: 5 }]),
    });
    await fetchCategories("loc-1");
    expect(fetch).toHaveBeenCalledWith("/api/catalog/categories?location_id=loc-1");
  });

  it("fetchCatalog calls with location_id", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ categories: [] }),
    });
    await fetchCatalog("loc-1");
    expect(fetch).toHaveBeenCalledWith("/api/catalog?location_id=loc-1");
  });

  it("getStoredLocationId / setStoredLocationId round-trip", () => {
    expect(getStoredLocationId()).toBeNull();
    setStoredLocationId("my-id");
    expect(getStoredLocationId()).toBe("my-id");
  });
});
