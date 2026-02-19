import { useState } from "react";
import type { MenuItemResponse } from "../types";

const DESC_PREVIEW_LEN = 120;

interface Props {
  item: MenuItemResponse;
}

export function MenuItemCard({ item }: Props) {
  const [expanded, setExpanded] = useState(false);
  const desc = item.description?.trim() ?? "";
  const showReadMore = desc.length > DESC_PREVIEW_LEN;
  const text = showReadMore && !expanded ? desc.slice(0, DESC_PREVIEW_LEN) + "…" : desc;
  const priceDisplay =
    item.variations.length === 0
      ? null
      : item.variations.length === 1
        ? item.variations[0].price
        : item.variations.map((v) => `${v.name} ${v.price}`).join(" · ");

  return (
    <article className="menu-item-card" data-item-id={item.id}>
      <div className="menu-item-media">
        {item.image_url ? (
          <img src={item.image_url} alt="" loading="lazy" />
        ) : (
          <div className="menu-item-placeholder" aria-hidden="true">
            <span>No image</span>
          </div>
        )}
      </div>
      <div className="menu-item-body">
        <h3 className="menu-item-name">{item.name}</h3>
        {priceDisplay && <p className="menu-item-price">{priceDisplay}</p>}
        {text ? (
          <p className="menu-item-desc">
            {text}
            {showReadMore && (
              <button
                type="button"
                className="read-more"
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
              >
                {expanded ? " Read less" : " Read more"}
              </button>
            )}
          </p>
        ) : null}
      </div>
    </article>
  );
}
