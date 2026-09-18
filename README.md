# Product Grab Station

A phone-friendly web app to browse product footage, grab clips, and move each
clip through its **Status** — reading and writing your Notion **Creator Clips**
database as the source of truth. No Claude dependency; the Notion token stays
server-side.

## How it fits together

- `grab/index.html` — the static app (safe to host anywhere; holds no secrets).
- `netlify/functions/clips.js` — a serverless proxy that talks to Notion. It
  holds the Notion token so the browser never sees it.
  - `GET /api/clips` → all clips grouped by `Detected Product`.
  - `POST /api/clips {id, status}` → updates that clip's `Status`.

"Used" is **not** a boolean. A clip is *available* while its Status is
`Looking Good` or `Filmed`, and counts as *used* once moved beyond that
(`Ready To Post`, `In Rotation`, `Posted`, `Mod`, `Not Her Time`).

## Deploy (Netlify, free)

1. Create a Notion internal integration → copy its secret:
   https://www.notion.so/my-integrations
2. Share the **Creator Clips** database with that integration
   (open the database → ••• → Connections → add your integration).
3. In Netlify: **Add new site → Import from Git**, pick this repo.
   Build settings come from `netlify.toml` (publish `grab/`, functions
   `netlify/functions/`).
4. Netlify → Site settings → **Environment variables**, add:
   - `NOTION_TOKEN` = the integration secret from step 1
   - `NOTION_DATABASE_ID` = `39e01d7c-fc09-8083-9307-d5931d9a918e`
5. Deploy. Your app is at `https://<your-site>.netlify.app/`.

## Notes

- The Claude artifact preview cannot call `/api/clips` (no serverless runtime),
  so live data only works once deployed to Netlify.
- Drive links open in Google Drive; those files are governed by your Drive
  sharing settings.
