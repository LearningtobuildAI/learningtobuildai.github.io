# Deploy bundle — The Future 24/7 (static export)

Built by tools/export-static-site.js on 2026-07-22T23:58:49.540Z.

## What this is
The full public site as static files, plus baked JSON at /api/* for the
data the pages fetch (world intel + counts, runtime status, energy theories,
evolution stats). Hidden/restricted intel is excluded (server-side filter).

## Deploy to Cloudflare Pages (free)
1. npm i -g wrangler && wrangler login
2. wrangler pages project create future247
3. wrangler pages deploy . --project-name=future247   (run from this folder)
4. Custom domain: Pages project -> Custom domains -> add the purchased domain.

## Known static-mode degradations (by design, v1)
- Chat (command console) shows offline — needs the cloud LLM proxy (planned).
- Admin/labs panels and cycle telemetry 404 — server-only features.
- Data is a snapshot; re-run the exporter + deploy to refresh (can be
  scheduled like the tile publisher).
