# EcoAI Dashboard

A local analytics dashboard for monitoring cache performance, usage, and savings. No external services — reads directly from your SQLite usage log.

---

## Starting the dashboard

### Python SDK (recommended for standalone use)

The Python dashboard ships **inside the `ecoai-python` package** — no Node.js, no extra setup.

```bash
# After pip install ecoai-python
python -m ecoai dashboard

# Or using the installed script
ecoai dashboard

# Custom path and port
python -m ecoai dashboard --db /path/to/.ecoai/usage.db --port 7315

# Suppress auto-opening the browser
python -m ecoai dashboard --no-browser

# Set port via environment variable
ECOAI_DASHBOARD_PORT=8080 python -m ecoai dashboard
```

Opens at `http://localhost:7315` by default.

### npm SDK

::: warning Requires the EcoAI monorepo
`npx ecoai dashboard` only works when you have the [EcoAI monorepo](https://github.com/HassanRasoo98/ecoai) cloned and set up — it is **not** bundled into the `eco-ai` npm package itself. If you just want a dashboard, use the Python SDK's standalone server above (it reads the same SQLite schema).
:::

```bash
# From the cloned monorepo root
pnpm dashboard

# With a custom database path
ECOAI_DB_PATH=/path/to/.ecoai/usage.db pnpm dashboard

# Custom port
npx ecoai dashboard --port 3001
ECOAI_DASHBOARD_PORT=3001 npx ecoai dashboard
```

Opens at `http://localhost:3001` by default.

> **Note:** The npm dashboard defaults to port **3001** while the Python dashboard defaults to **7315**. If you run both side-by-side, use `--port` to pick distinct ports.

---

## Overview page

The main page shows aggregate statistics across all recorded calls.

### Stat cards

| Card | What it shows |
|---|---|
| **Total calls** | All API calls made (cached + real) |
| **Cache hits** | Calls served from cache; semantic vs exact breakdown shown if semantic caching is active |
| **Hit rate** | `cache_hits / total_calls` as a percentage |
| **Tokens saved** | Total output tokens saved by cache hits; per-model breakdown shown for top 3 models. Click ⓘ for the calculation methodology. |
| **Cost saved** | Estimated USD saved; per-model breakdown. Click ⓘ for the model pricing table. |
| **CO₂ saved** | Estimated kilograms CO₂ avoided; human-scale equivalencies (Google searches, car km, etc.). Click ⓘ for the methodology. |

### Info panels (ⓘ buttons)

Each of the bottom three cards has an ⓘ button that opens a slide-in panel:

- **Tokens saved panel** — explains the formula (`response.usage.total_tokens` on cache hit), per-provider field names, and shows a live breakdown table.
- **Cost saved panel** — full model pricing table grouped by OpenAI / Anthropic / Google, with rates and last-updated date.
- **CO₂ saved panel** — energy-to-carbon formula, IEA grid intensity source, per-model gCO₂ rates, and academic sources.

### Content types strip

Appears when any non-text prompt type has been used. Shows pill badges for each type present:

| Badge | Meaning |
|---|---|
| 📝 text | Plain text conversations |
| ⚙️ structured | JSON schema / structured output requests |
| 🖼 image | Vision (image in prompt) |
| 🎵 audio | Audio inline data |
| 📄 file | Documents, PDFs, file references |
| 🔧 tool | Tool/function calling |
| 🎨 image gen | Image generation via DALL-E or Imagen |

### Charts

- **Hit rate over time** — daily hit rate for the last 30 days.
- **Calls by provider** — donut chart of total calls per provider.

### Model breakdown table

Shows the top 10 models by tokens saved, with total calls, cache hits, hit rate %, and tokens saved per model.

### Top cached prompts

A preview of the 10 most-hit cached prompts. Links to the Prompts page for the full list.

---

## Prompts page

A searchable, filterable list of all cached prompt entries.

### Filters

| Filter | Shows |
|---|---|
| All | Every cached prompt |
| Exact | Only exact-match hits |
| Semantic | Only semantic (similarity-based) hits |
| ⚙️ Structured | Structured output prompts |
| 🖼 Images | Vision prompts |
| 🎵 Audio | Audio prompts |
| 📄 Files | File/document prompts |
| 🔧 Tools | Tool-calling prompts |
| 🎨 Image gen | Image generation prompts |

### Prompt rows

Each row shows:
- **Prompt text** (truncated, expandable) — click to expand the full cached prompt
- **Model** and **provider** badge
- **Hit count** — how many times this prompt has been served from cache
- **Last seen** — relative time of the most recent cache hit
- **Type badge** — colored pill showing the prompt type (image, file, tool, etc.)

Pagination: 25 per page with prev/next controls.

---

## Settings page

Configure EcoAI behavior from the dashboard. Changes are written to `.ecoai/settings.json` and take effect on the next SDK startup.

| Setting | Description |
|---|---|
| **Caching enabled** | Master on/off toggle for all caching |
| **Mode** | `dev` (no expiry) or `prod` (TTL-based) |
| **TTL** | Cache TTL in seconds (prod mode only) |
| **Semantic caching** | Toggle semantic similarity matching |
| **Semantic threshold** | Cosine similarity threshold (0.90–1.00) |

Settings priority: programmatic config > `ECOAI_*` env vars > settings file > defaults. The settings file is the lowest priority — it only applies when the code doesn't override it.

---

## Database path

Both SDKs default to `.ecoai/usage.db` in the current working directory. You can point the dashboard at any path:

```bash
# npm
ECOAI_DB_PATH=/shared/.ecoai/usage.db npx ecoai dashboard

# Python
python -m ecoai dashboard --db /shared/.ecoai/usage.db
```

You can share one database across both JS and Python SDKs — they use the same schema.

---

## Data retention

The dashboard reads all rows in the usage log. There is no automatic pruning. To reduce the database size:

```python
# Python — delete all log entries (keeps schema intact)
import sqlite3
conn = sqlite3.connect(".ecoai/usage.db")
conn.execute("DELETE FROM usage_log")
conn.commit()
conn.close()
```

Or simply delete and re-create the file — EcoAI will recreate the schema on next startup.
