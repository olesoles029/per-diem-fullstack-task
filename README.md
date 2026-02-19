# Per Diem – Menu Display (Full Stack Challenge)

A mobile-first web app that displays a restaurant’s Square catalog menu, filtered by location and category.

## Setup & Run

### Prerequisites

- Node.js 18+
- A [Square Developer](https://developer.squareup.com) account and a **Sandbox** access token

### 1. Environment

```bash
cp .env.example .env
```

Edit `.env` and set:

- `SQUARE_ACCESS_TOKEN` – Sandbox access token from Square Developer Dashboard  
- `SQUARE_ENVIRONMENT` – `sandbox` (or `production`)  
- `PORT` – Backend port (default `3001`)

### 2. Install dependencies

From the repo root:

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

(Or from root: `npm install && (cd server && npm install) && (cd client && npm install)`.)

### 3. Run (single command)

From the repo root:

```bash
npm run dev
```

This starts:

- **Backend** at `http://localhost:3001` (Express + Square API proxy)
- **Frontend** at `http://localhost:5173` (Vite dev server with proxy to `/api`)

Open **http://localhost:5173** in a browser. Pick a location; the menu and categories load for that location.

### 4. Run tests

```bash
npm run test
```

Runs both server (unit + integration) and client (unit) test suites.

**E2E tests** (Playwright; full app in browser). First time only, install browsers:

```bash
npx playwright install
```

Then run E2E:

```bash
npm run test:e2e
```

E2E starts the dev server automatically (or reuses it if already running). If the server fails to start in time, run `npm run dev` in another terminal first, then `npm run test:e2e`. Requires `.env` with a valid `SQUARE_ACCESS_TOKEN` so the app can load locations.

### Screenshots

| Location selector | Menu by category | Search |
|-------------------|------------------|--------|
| ![Location selector](docs/Screenshot%202026-02-19%20at%2010.27.24.png) | ![Menu](docs/Screenshot%202026-02-19%20at%2010.28.06.png) | ![Search](docs/Screenshot%202026-02-19%20at%2010.28.35.png) |

---

## Architecture & trade-offs

### Backend (`/server`)

- **Express** + **TypeScript**. REST API that proxies Square and never exposes the access token.
- **Endpoints**
  - `GET /api/locations` – ACTIVE locations only; id, name, address, timezone, status.
  - `GET /api/catalog?location_id=<id>` – Catalog items for that location, grouped by category (id, name, description, category, image_url, variations with name/price).
  - `GET /api/catalog/categories?location_id=<id>` – Categories that have at least one item at that location; id, name, item_count.
- **Square**
  - Locations: `listLocations`, then filter by `status === "ACTIVE"`.
  - Catalog: `searchCatalogObjects` with `object_types: ["ITEM"]`, `include_related_objects: true`, pagination by cursor until done. Items are filtered by `present_at_location_ids` / `present_at_all_locations` / `absent_at_location_ids` so only items available at the given location are returned. Categories and images are resolved from `related_objects`.
- **Caching** – In-memory cache keyed by location (and one shared “raw” catalog fetch per location for both catalog and categories). TTL 5 minutes. No Redis (optional bonus).
- **Errors** – Square errors are mapped to a simple `{ error, code?, details? }` JSON and appropriate HTTP status (e.g. 502 for upstream failure, 400 for missing `location_id`).
- **Logging** – Request logger middleware logs method, path, status code, and duration.

### Frontend (`/client`)

- **Vite + React + TypeScript**. Single-page app; all API calls go to `/api` (proxied to the backend in dev).
- **Flow**
  - Load locations → show location dropdown; persist selection in `localStorage`.
  - On location change → fetch categories and full catalog; show category tabs and menu sections.
  - Category tab scrolls to the corresponding section and filters the list.
  - Search bar filters items client-side by name/description.
- **UI**
  - Mobile-first (target ~375px), responsive.
  - Loading: skeletons for location, category tabs, and menu list.
  - Error: message + retry.
  - Empty: “No items for this location” / “No items match your search.”
  - Item cards: name, description (truncate + “Read more”), image or placeholder, price(s) from variations.

### Testing

- **Unit**
  - **Server**: `cache` (get/set/invalidate), `isPresentAtLocation` (Square location logic).
  - **Client**: `api` (fetch helpers + localStorage for selected location), with `fetch` mocked.
- **Integration** – `server/src/api.integration.test.ts`: API routes (locations, catalog, categories) with **mocked Square client**; no real Square calls. Uses `supertest` against the Express app.
- **E2E** – `e2e/menu.spec.ts` (Playwright): opens the app, waits for location selector, selects a location, and asserts that the menu (or empty state) appears. Demonstrates full stack in a real browser.

---

## Assumptions & limitations

- Only **ACTIVE** locations are returned.
- Item “category” comes from Square’s category relation; “Uncategorized” if none. Category order is preserved from the order items are returned.
- Image: first of item’s `imageIds` or first variation’s image, resolved from `related_objects`; no image → placeholder.
- Price: from each variation’s `priceMoney`, formatted as USD (or catalog currency). No modifier or tax in the displayed price.
- Search is **client-side** over the already-fetched catalog for the selected location.
- No auth/ACL; backend is a demo proxy. Token must be kept server-side only.

---

## Optional / bonus

- **Docker**: see `docker-compose.yml` (if added) to run server (and optionally frontend build) in containers.
- **Search**: implemented as client-side filter.
- **Dark mode / a11y**: not implemented; ARIA and semantic HTML used where relevant (labels, roles, section headings).

---

## Project layout

```
├── client/                 # Vite + React frontend
│   ├── src/
│   │   ├── api.ts           # API client + localStorage
│   │   ├── types.ts         # API types
│   │   ├── App.tsx / App.css
│   │   └── components/
│   └── ...
├── e2e/
│   └── menu.spec.ts         # Playwright E2E tests
├── server/                  # Express backend
│   ├── src/
│   │   ├── app.ts           # Express app (exported for integration tests)
│   │   ├── index.ts
│   │   ├── api.integration.test.ts
│   │   ├── types.ts         # API response types
│   │   ├── squareClient.ts  # Square client + isPresentAtLocation
│   │   ├── cache.ts
│   │   ├── requestLogger.ts
│   │   └── routes/
│   │       ├── locations.ts
│   │       └── catalog.ts
│   └── ...
├── .env.example
├── package.json             # Root scripts: dev, build, test, test:e2e
├── playwright.config.ts     # E2E config (webServer, baseURL)
└── README.md
```
