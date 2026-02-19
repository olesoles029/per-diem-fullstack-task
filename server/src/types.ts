export interface LocationResponse {
  id: string;
  name: string;
  address: string;
  timezone: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface CategorySummary {
  id: string;
  name: string;
  item_count: number;
}

export interface VariationInfo {
  name: string;
  price: string;
}

export interface MenuItemResponse {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
  variations: VariationInfo[];
}

export interface CategoryWithItems {
  category_id: string;
  category_name: string;
  items: MenuItemResponse[];
}

export interface CatalogResponse {
  categories: CategoryWithItems[];
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}
