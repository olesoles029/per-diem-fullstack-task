import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { invalidate } from "./cache.js";
import { app } from "./app.js";

const LOC_ID = "loc_integration_test";

const mockLocations = [
  {
    id: "loc1",
    name: "Main Street",
    address: {
      addressLine1: "123 Main St",
      locality: "City",
      administrativeDistrictLevel1: "ST",
      postalCode: "12345",
    },
    timezone: "America/New_York",
    status: "ACTIVE",
  },
];

const mockCategory = {
  id: "cat1",
  type: "CATEGORY",
  categoryData: { name: "Drinks" },
};

const mockItem = {
  id: "item1",
  type: "ITEM",
  presentAtAllLocations: true,
  itemData: {
    name: "House Coffee",
    description: "Fresh brewed",
    categoryId: "cat1",
    variations: [
      {
        id: "var1",
        type: "ITEM_VARIATION",
        itemVariationData: {
          name: "Regular",
          priceMoney: { amount: 350n, currency: "USD" },
        },
      },
    ],
  },
};

vi.mock("./squareClient.js", () => ({
  getSquareClient: vi.fn(() => ({
    locationsApi: {
      listLocations: vi.fn().mockResolvedValue({
        result: { locations: mockLocations },
      }),
    },
    catalogApi: {
      searchCatalogObjects: vi.fn().mockResolvedValue({
        result: {
          objects: [mockItem],
          relatedObjects: [mockCategory],
          cursor: undefined,
        },
      }),
    },
  })),
  isPresentAtLocation: (obj: { presentAtAllLocations?: boolean; presentAtLocationIds?: string[]; absentAtLocationIds?: string[] }, locationId: string) => {
    const presentAll = obj.presentAtAllLocations ?? true;
    const absentIds = obj.absentAtLocationIds ?? [];
    const presentIds = obj.presentAtLocationIds ?? [];
    if (absentIds.includes(locationId)) return false;
    if (presentAll) return true;
    return presentIds.includes(locationId);
  },
}));

describe("API integration", () => {
  beforeEach(() => {
    invalidate();
  });

  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("GET /api/locations returns ACTIVE locations with simplified shape", async () => {
    const res = await request(app).get("/api/locations");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: "loc1",
      name: "Main Street",
      address: "123 Main St, City, ST, 12345",
      timezone: "America/New_York",
      status: "ACTIVE",
    });
  });

  it("GET /api/catalog?location_id= returns catalog grouped by category", async () => {
    const res = await request(app).get("/api/catalog").query({ location_id: LOC_ID });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("categories");
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories.length).toBeGreaterThanOrEqual(1);
    const cat = res.body.categories.find((c: { category_name: string }) => c.category_name === "Drinks");
    expect(cat).toBeDefined();
    expect(cat.items).toHaveLength(1);
    expect(cat.items[0]).toMatchObject({
      id: "item1",
      name: "House Coffee",
      description: "Fresh brewed",
      category: "Drinks",
      variations: [{ name: "Regular", price: "$3.50" }],
    });
  });

  it("GET /api/catalog/categories?location_id= returns categories with item_count", async () => {
    const res = await request(app).get("/api/catalog/categories").query({ location_id: LOC_ID });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const drinks = res.body.find((c: { name: string }) => c.name === "Drinks");
    expect(drinks).toMatchObject({ id: "cat1", name: "Drinks", item_count: 1 });
  });

  it("GET /api/catalog without location_id returns 400", async () => {
    const res = await request(app).get("/api/catalog");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/catalog/categories without location_id returns 400", async () => {
    const res = await request(app).get("/api/catalog/categories");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
