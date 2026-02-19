import { useState, useEffect, useMemo, useCallback } from "react";
import {
  fetchLocations,
  fetchCategories,
  fetchCatalog,
  getStoredLocationId,
  setStoredLocationId,
} from "./api";
import type { LocationResponse, CategorySummary, CatalogResponse, CategoryWithItems } from "./types";
import { LocationSelector } from "./components/LocationSelector";
import { CategoryTabs } from "./components/CategoryTabs";
import { MenuItemCard } from "./components/MenuItemCard";
import {
  LocationSkeleton,
  CategoryTabsSkeleton,
  MenuListSkeleton,
} from "./components/LoadingSkeleton";
import "./App.css";

type LoadState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [locationsLoad, setLocationsLoad] = useState<LoadState>("loading");
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const [locationId, setLocationId] = useState<string | null>(() => getStoredLocationId());

  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [catalogLoad, setCatalogLoad] = useState<LoadState>("idle");
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load locations on mount
  useEffect(() => {
    let cancelled = false;
    setLocationsLoad("loading");
    setLocationsError(null);
    fetchLocations()
      .then((data) => {
        if (!cancelled) {
          setLocations(data);
          setLocationsLoad("success");
          if (data.length > 0) {
            const stored = getStoredLocationId();
            if (stored && data.some((l) => l.id === stored)) {
              setLocationId(stored);
            } else if (!locationId) {
              setLocationId(data[0].id);
              setStoredLocationId(data[0].id);
            }
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLocationsError(err instanceof Error ? err.message : "Failed to load locations");
          setLocationsLoad("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // When locationId changes, fetch categories and catalog
  useEffect(() => {
    if (!locationId) {
      setCategories([]);
      setCatalog(null);
      setCatalogLoad("idle");
      setActiveCategory(null);
      return;
    }
    let cancelled = false;
    setCatalogLoad("loading");
    setCatalogError(null);
    Promise.all([fetchCategories(locationId), fetchCatalog(locationId)])
      .then(([cats, catData]) => {
        if (!cancelled) {
          setCategories(cats);
          setCatalog(catData);
          setCatalogLoad("success");
          setActiveCategory(cats[0]?.name ?? null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogError(err instanceof Error ? err.message : "Failed to load menu");
          setCatalogLoad("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  const handleLocationSelect = useCallback((id: string) => {
    setLocationId(id);
    setStoredLocationId(id);
  }, []);

  const handleCategorySelect = useCallback((name: string) => {
    setActiveCategory(name);
    const id = `category-${name.replace(/\s+/g, "-")}`;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  // Filter catalog by active category and search
  const filteredCategories = useMemo((): CategoryWithItems[] => {
    if (!catalog) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      if (!activeCategory) return catalog.categories;
      return catalog.categories.filter((c) => c.category_name === activeCategory);
    }
    const filtered: CategoryWithItems[] = [];
    for (const cat of catalog.categories) {
      const items = cat.items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description ?? "").toLowerCase().includes(q)
      );
      if (items.length > 0) filtered.push({ ...cat, items });
    }
    return filtered;
  }, [catalog, activeCategory, searchQuery]);

  const hasCatalogContent = catalog?.categories.some((c) => c.items.length > 0) ?? false;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Menu</h1>
        {locationsLoad === "loading" && <LocationSkeleton />}
        {locationsLoad === "error" && (
          <div className="error-block" role="alert">
            <p>{locationsError}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        )}
        {locationsLoad === "success" && (
          <LocationSelector
            locations={locations}
            selectedId={locationId}
            onSelect={handleLocationSelect}
          />
        )}
      </header>

      {locationId && (
        <>
          {catalogLoad === "loading" && (
            <>
              <CategoryTabsSkeleton />
              <MenuListSkeleton />
            </>
          )}
          {catalogLoad === "error" && (
            <div className="error-block" role="alert">
              <p>{catalogError}</p>
              <button
                type="button"
                onClick={() => {
                  setCatalogLoad("loading");
                  Promise.all([fetchCategories(locationId), fetchCatalog(locationId)])
                    .then(([cats, catData]) => {
                      setCategories(cats);
                      setCatalog(catData);
                      setCatalogLoad("success");
                      setActiveCategory(cats[0]?.name ?? null);
                    })
                    .catch((err) => {
                      setCatalogError(err instanceof Error ? err.message : "Failed to load menu");
                      setCatalogLoad("error");
                    });
                }}
              >
                Retry
              </button>
            </div>
          )}
          {catalogLoad === "success" && (
            <>
              {categories.length > 0 && (
                <CategoryTabs
                  categories={categories}
                  activeName={activeCategory}
                  onSelect={handleCategorySelect}
                />
              )}
              {hasCatalogContent && (
                <div className="search-wrap">
                  <input
                    type="search"
                    placeholder="Search menu…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                    aria-label="Search menu items"
                  />
                </div>
              )}
              {catalogLoad === "success" && !hasCatalogContent && (
                <div className="empty-state" role="status">
                  <p>No items found for this location.</p>
                </div>
              )}
              {catalogLoad === "success" && hasCatalogContent && filteredCategories.length === 0 && (
                <div className="empty-state" role="status">
                  <p>No items match your search.</p>
                </div>
              )}
              {catalogLoad === "success" && filteredCategories.length > 0 && (
                <main className="menu-list-wrap">
                  {filteredCategories.map((cat) => (
                    <section
                      key={cat.category_id || cat.category_name}
                      id={`category-${cat.category_name.replace(/\s+/g, "-")}`}
                      className="menu-category"
                      aria-labelledby={`category-heading-${cat.category_name.replace(/\s+/g, "-")}`}
                    >
                      <h2 id={`category-heading-${cat.category_name.replace(/\s+/g, "-")}`} className="category-heading">
                        {cat.category_name}
                      </h2>
                      <ul className="menu-list" role="list">
                        {cat.items.map((item) => (
                          <li key={item.id}>
                            <MenuItemCard item={item} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </main>
              )}
            </>
          )}
        </>
      )}

      {locationsLoad === "success" && locations.length === 0 && (
        <div className="empty-state" role="status">
          <p>No locations available.</p>
        </div>
      )}
    </div>
  );
}
