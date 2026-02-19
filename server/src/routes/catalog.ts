import { Router, Request, Response } from "express";
import { getSquareClient, isPresentAtLocation } from "../squareClient.js";
import { get, set } from "../cache.js";
import type {
  CatalogResponse,
  CategorySummary,
  CategoryWithItems,
  MenuItemResponse,
  VariationInfo,
  ApiErrorResponse,
} from "../types.js";
import type { CatalogObject } from "square";

const CACHE_TTL_MS = 5 * 60 * 1000;
const PAGE_LIMIT = 100;

const router = Router();

function rawCatalogCacheKey(locationId: string): string {
  return `catalog_raw:${locationId}`;
}

function getImageUrl(relatedMap: Map<string, CatalogObject>, imageId: string | null | undefined): string | null {
  if (!imageId) return null;
  const img = relatedMap.get(imageId);
  if (!img?.imageData?.url) return null;
  return img.imageData.url;
}

function getCategoryName(relatedMap: Map<string, CatalogObject>, categoryId: string | null | undefined): string {
  if (!categoryId) return "Uncategorized";
  const cat = relatedMap.get(categoryId);
  return (cat?.categoryData?.name as string) ?? "Uncategorized";
}

function formatPrice(money: { amount?: bigint | null; currency?: string } | null | undefined): string {
  if (!money || money.amount == null) return "$0.00";
  const cents = Number(money.amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (money.currency as string) ?? "USD",
  }).format(cents / 100);
}

function relatedMap(related: CatalogObject[] | null | undefined): Map<string, CatalogObject> {
  const map = new Map<string, CatalogObject>();
  for (const obj of related ?? []) {
    if (obj.id) map.set(obj.id, obj);
  }
  return map;
}

async function fetchAllCatalogItems(locationId: string): Promise<{
  items: CatalogObject[];
  related: Map<string, CatalogObject>;
}> {
  const client = getSquareClient();
  const items: CatalogObject[] = [];
  const allRelated: CatalogObject[] = [];
  let cursor: string | undefined;

  do {
    const body = {
      objectTypes: ["ITEM"],
      includeRelatedObjects: true,
      limit: PAGE_LIMIT,
      ...(cursor && { cursor }),
    };
    const { result } = await client.catalogApi.searchCatalogObjects(body);

    if (result.errors?.length) {
      throw new Error(result.errors[0].detail ?? "Square catalog error");
    }

    const batch = (result.objects ?? []).filter((obj) => obj.type === "ITEM" && isPresentAtLocation(obj, locationId));
    items.push(...batch);
    if (result.relatedObjects) allRelated.push(...result.relatedObjects);
    cursor = result.cursor ?? undefined;
  } while (cursor);

  return { items, related: relatedMap(allRelated) };
}

function getItemCategoryId(data: CatalogObject["itemData"]): string | null | undefined {
  if (!data) return null;
  if (data.categoryId) return data.categoryId;
  const cats = data.categories as { id?: string }[] | undefined;
  return cats?.[0]?.id ?? null;
}

function toMenuItemResponse(obj: CatalogObject, related: Map<string, CatalogObject>): MenuItemResponse {
  const data = obj.itemData;
  const categoryId = getItemCategoryId(data);
  const categoryName = getCategoryName(related, categoryId);
  const imageId = data?.imageIds?.[0] ?? (data?.variations as { imageIds?: string[] }[] | undefined)?.[0]?.imageIds?.[0];
  const imageUrl = getImageUrl(related, imageId);

  const variations: VariationInfo[] = (data?.variations ?? []).map((v: CatalogObject) => {
    const vdata = v.itemVariationData;
    return {
      name: (vdata?.name as string) ?? "Default",
      price: formatPrice(vdata?.priceMoney),
    };
  });

  return {
    id: obj.id ?? "",
    name: (data?.name as string) ?? "Unnamed",
    description: (data?.description as string) ?? (data?.descriptionHtml as string) ?? null,
    category: categoryName,
    image_url: imageUrl,
    variations,
  };
}

function buildCatalogResponse(items: CatalogObject[], related: Map<string, CatalogObject>): CatalogResponse {
  const byCategory = new Map<string, { items: MenuItemResponse[]; categoryId: string }>();
  for (const obj of items) {
    const item = toMenuItemResponse(obj, related);
    const data = obj.itemData;
    const categoryId = getItemCategoryId(data) ?? "";
    const key = item.category;
    if (!byCategory.has(key)) byCategory.set(key, { items: [], categoryId });
    byCategory.get(key)!.items.push(item);
  }
  const categoryOrder = new Map<string, number>();
  let idx = 0;
  for (const obj of items) {
    const data = obj.itemData;
    const categoryId = getItemCategoryId(data);
    const name = getCategoryName(related, categoryId);
    if (!categoryOrder.has(name)) categoryOrder.set(name, idx++);
  }
  const sortedNames = [...byCategory.keys()].sort((a, b) => (categoryOrder.get(a) ?? 999) - (categoryOrder.get(b) ?? 999));
  const categories: CategoryWithItems[] = sortedNames.map((name) => {
    const { items: itemsList, categoryId } = byCategory.get(name)!;
    return { category_id: categoryId, category_name: name, items: itemsList };
  });
  return { categories };
}

function buildCategoriesSummary(items: CatalogObject[], related: Map<string, CatalogObject>): CategorySummary[] {
  const countByCategory = new Map<string, { id: string; name: string; count: number }>();
  for (const obj of items) {
    const data = obj.itemData;
    const categoryId = getItemCategoryId(data) ?? "__uncategorized";
    const name = getCategoryName(related, categoryId === "__uncategorized" ? null : categoryId);
    const entry = countByCategory.get(name);
    if (entry) entry.count += 1;
    else countByCategory.set(name, { id: categoryId, name, count: 1 });
  }
  return [...countByCategory.values()].map(({ id, name, count }) => ({ id, name, item_count: count }));
}

async function getRawCatalog(locationId: string): Promise<{ items: CatalogObject[]; related: Map<string, CatalogObject> }> {
  const key = rawCatalogCacheKey(locationId);
  const cached = get<{ items: CatalogObject[]; related: CatalogObject[] }>(key);
  if (cached) {
    return { items: cached.items, related: relatedMap(cached.related) };
  }
  const result = await fetchAllCatalogItems(locationId);
  const relatedArr = Array.from(result.related.values());
  set(key, { items: result.items, related: relatedArr }, CACHE_TTL_MS);
  return result;
}

router.get("/", async (req: Request, res: Response<CatalogResponse | ApiErrorResponse>): Promise<void> => {
  const locationId = req.query.location_id as string;
  if (!locationId) {
    res.status(400).json({ error: "location_id is required" });
    return;
  }
  try {
    const { items, related } = await getRawCatalog(locationId);
    const response = buildCatalogResponse(items, related);
    res.json(response);
  } catch (err) {
    console.error("GET /api/catalog", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "Failed to fetch catalog",
    });
  }
});

router.get("/categories", async (req: Request, res: Response<CategorySummary[] | ApiErrorResponse>): Promise<void> => {
  const locationId = req.query.location_id as string;
  if (!locationId) {
    res.status(400).json({ error: "location_id is required" });
    return;
  }
  try {
    const { items, related } = await getRawCatalog(locationId);
    const response = buildCategoriesSummary(items, related);
    res.json(response);
  } catch (err) {
    console.error("GET /api/catalog/categories", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "Failed to fetch categories",
    });
  }
});

export default router;
