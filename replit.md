# CardWatch

A live Pokemon card intelligence tool for Android. Point your phone at a Whatnot stream, take a screenshot, and CardWatch automatically identifies the card and shows you real-time market prices — no manual lookup needed.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/cardwatch run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: see `artifacts/api-server/.env.example`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: React Native + Expo (managed workflow), Expo Router, expo-media-library
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Card data + pricing: PkmnPrices API (`https://api.pkmnprices.com`)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Notifications: Discord webhooks

## Where things live

```
artifacts/
  cardwatch/          # Expo React Native app
    app/(tabs)/
      index.tsx       # Scanner screen — live detection + start/stop
      history.tsx     # Detection history log
      settings.tsx    # Scan interval, confidence, Discord, backend URL
    context/
      cardwatch-context.tsx  # Source of truth — isScanning, detections, liveDetection
    hooks/
      useScreenScanner.ts    # Polling loop: media library → OCR → /detect
      useOCR.ts              # ML Kit text recognition with heuristic fallback
      useColors.ts           # Design token accessor
  api-server/         # Express 5 REST API
    src/
      routes/cardwatch.ts    # All card/detection/price/settings endpoints
      services/
        card-provider.ts     # PkmnPrices card search + identification
        price-provider.ts    # PkmnPrices market price fetch
        discord.ts           # Discord webhook notifications
lib/
  db/                 # Drizzle schema + client (source of truth: src/schema/cardwatch.ts)
  api-zod/            # Zod request/response schemas (generated from OpenAPI)
  api-client-react/   # React Query hooks (generated from OpenAPI via Orval)
  api-spec/           # OpenAPI 3.1 spec (source of truth: openapi.yaml)
```

## Architecture decisions

- **Gallery polling instead of live screen capture**: Android's MediaProjection API requires a custom native module (bare/EAS workflow). Instead, the app polls `expo-media-library` for new screenshots. The user takes a screenshot of the Whatnot stream; CardWatch detects it automatically. This works in Expo Go and the managed workflow with zero native code.
- **Backend-optional mode**: When no `backendUrl` is configured, the scanner synthesises detections from local OCR alone, so the app is fully usable offline. The backend adds card identification + pricing from the PkmnPrices API.
- **Duplicate suppression**: The `/detections` POST endpoint checks whether the same card was seen within the `duplicateCooldown` window (default 10 s) and returns the existing detection instead of inserting a duplicate row.
- **Single settings row**: The `cardwatch_settings` table always has one row (id=1) managed via `INSERT … ON CONFLICT DO UPDATE`. No migrations needed when settings change.
- **Orval codegen**: The API contract lives in `lib/api-spec/openapi.yaml`. Running `pnpm --filter @workspace/api-spec run codegen` regenerates both the React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`). Never edit the generated files directly.

## Product

- **Live scanner**: Tap "Start scanning" to begin a session. Take a screenshot of the Whatnot stream (or any screen showing a Pokemon card). CardWatch polls your gallery, runs OCR, calls the backend `/detect` endpoint, and displays the identified card with market price in under the configured scan interval.
- **Detection history**: All confirmed detections are saved locally (AsyncStorage) and optionally synced to the Postgres backend. The history tab shows card name, set, collector number, price, and detection time.
- **Discord alerts**: When a card meets the minimum confidence threshold a Discord embed is posted to your configured webhook — card name, set, confidence, raw/PSA prices, and card image.
- **Settings**: Minimum confidence threshold (75 / 85 / 92%), scan interval (2 / 3 / 5 s), duplicate cooldown, Discord toggle, backend URL.

## User preferences

- API key for PkmnPrices: `pk_d2224bcfe5ff4746f952383806cd30342965af2f438bbbe9` — set as both `CARD_API_KEY` and `PRICE_API_KEY` in `.env`.
- Target platform: Android (Whatnot is used on Android phones).

## Gotchas

- **Media library permission**: `expo-media-library` requires the `READ_MEDIA_IMAGES` permission on Android 13+ and `READ_EXTERNAL_STORAGE` on older versions. The scanner prompts for this automatically when scanning starts.
- **ML Kit OCR**: `@react-native-ml-kit/text-recognition` is not available in Expo Go — OCR falls back to heuristic-only mode which returns 0 confidence. To get real OCR, build a custom dev client with `eas build --profile development`.
- **PkmnPrices card IDs are numeric integers** — the price provider passes `String(match.id)` to the DB but the API expects the numeric string in the URL path (`/v1/cards/11001`). This works fine; just be aware the ID is not a UUID.
- **Run codegen after changing openapi.yaml**: The generated files in `lib/api-client-react/src/generated` and `lib/api-zod/src/generated` must be regenerated or the TypeScript build will fail.
- **DB push vs migrate**: `pnpm --filter @workspace/db run push` uses Drizzle's push mode (dev only — destructive). For production, generate and run migrations instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- PkmnPrices API docs: `https://api.pkmnprices.com` — search by name, filter by set/number, fetch prices by numeric card ID
