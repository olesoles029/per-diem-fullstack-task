export function LocationSkeleton() {
  return (
    <div className="location-selector">
      <div className="skeleton" style={{ width: 60, height: 14, marginBottom: 6 }} />
      <div className="skeleton" style={{ width: "100%", height: 44 }} />
    </div>
  );
}

export function CategoryTabsSkeleton() {
  return (
    <div className="category-tabs">
      <div className="category-tabs-scroll">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton category-tab-skeleton" />
        ))}
      </div>
    </div>
  );
}

export function MenuListSkeleton() {
  return (
    <div className="menu-list">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="menu-item-card skeleton-card">
          <div className="skeleton" style={{ aspectRatio: "16/10", borderRadius: 8 }} />
          <div style={{ padding: 12 }}>
            <div className="skeleton" style={{ height: 18, width: "70%", marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: "40%", marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 12, width: "100%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
