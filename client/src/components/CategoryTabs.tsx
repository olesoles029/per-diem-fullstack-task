import type { CategorySummary } from "../types";

interface Props {
  categories: CategorySummary[];
  activeName: string | null;
  onSelect: (name: string) => void;
}

export function CategoryTabs({ categories, activeName, onSelect }: Props) {
  if (categories.length === 0) return null;
  return (
    <nav className="category-tabs" role="tablist" aria-label="Menu categories">
      <div className="category-tabs-scroll">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeName === cat.name}
            className={`category-tab ${activeName === cat.name ? "active" : ""}`}
            onClick={() => onSelect(cat.name)}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </nav>
  );
}
