# Getting Started — Python SDK (`ecoai`)

## Install

```bash
pip install ecoai

# With provider extras (install whichever you use)
pip install "ecoai[openai]"      # OpenAI
pip install "ecoai[anthropic]"   # Anthropic
pip install "ecoai[gemini]"      # Google Gemini
pip install "ecoai[redis]"       # Redis storage backend
pip install "ecoai[all]"         # all of the above
```

**Requirements**: Python 3.10+

---

## Quickstart

### OpenAI

```python
import os
from ecoai import EcoAI
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
eco = EcoAI(client=client, mode="dev")

response = eco.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Summarise the water cycle."}],
)
print(response.choices[0].message.content)

# Second call — returns from cache instantly, costs $0
cached = eco.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Summarise the water cycle."}],
)
```

### Anthropic

```python
import os
from ecoai import EcoAI
from anthropic import Anthropic

client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
eco = EcoAI(client=client, mode="dev")

response = eco.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Explain quantum entanglement."}],
)
print(response.content[0].text)
```

### Google Gemini

```python
import os
import google.generativeai as genai
from ecoai import EcoAI

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
model = genai.GenerativeModel("gemini-2.5-flash")
eco = EcoAI(client=model)

response = eco.generate_content("What causes the northern lights?")
print(response.text)
```

> **That's the entire integration.** No new infrastructure. No config files. No account needed. EcoAI stores responses in a local SQLite file at `.ecoai/cache.db` by default.

---

## Configuration

```python
from ecoai import EcoAI, SemanticConfig

eco = EcoAI(
    client=client,

    # Cache mode
    mode="dev",                     # "dev": cache forever | "prod": apply TTL

    # Storage
    storage="sqlite",               # "sqlite" | "memory" | "redis"
    sqlite_path=".ecoai/cache.db",  # SQLite file path
    redis_url="redis://...",        # only needed when storage="redis"

    # TTL (prod mode only)
    ttl=3600,                       # global TTL in seconds
    ttl_by_model={"gpt-4o": 7200}, # per-model overrides, take precedence

    # Usage logging
    log_usage=True,                 # write per-call records to SQLite
    log_path=".ecoai/usage.db",     # usage log path

    # Master switch
    caching_enabled=True,           # set False to disable caching entirely

    # Semantic caching (off by default)
    semantic=SemanticConfig(
        threshold=0.95,
        embedding_model="text-embedding-3-small",
    ),
)
```

### Environment variables

```bash
ECOAI_MODE=prod
ECOAI_STORAGE=sqlite
ECOAI_REDIS_URL=redis://localhost:6379
ECOAI_DB_PATH=.ecoai/usage.db  # used by the dashboard CLI
```

### Settings file

The EcoAI dashboard writes to `.ecoai/settings.json`. The Python SDK reads this file at startup as the lowest-priority config layer:

```
Priority: EcoAI(kwargs) > ECOAI_* env vars > .ecoai/settings.json > defaults
```

---

## Storage backends

### SQLite (default)
```python
eco = EcoAI(client=client, storage="sqlite", sqlite_path=".ecoai/cache.db")
```
Best for: local development, single-process production, Docker (mount `.ecoai/` as a volume).

### In-memory
```python
eco = EcoAI(client=client, storage="memory")
```
Best for: unit tests, ephemeral processes. Cache is lost when the process exits.

### Redis
```python
# Requires: pip install "ecoai[redis]"
eco = EcoAI(
    client=client,
    storage="redis",
    redis_url="redis://localhost:6379",
)
```
Best for: multi-instance production, serverless, shared cache across processes.

---

## Dev vs Prod mode

```python
# Dev mode — cache forever, no TTL
eco = EcoAI(client=client, mode="dev")

# Prod mode — cache expires after ttl seconds (default 3600)
eco = EcoAI(client=client, mode="prod", ttl=7200)
```

---

## Streaming

Streaming calls bypass the cache entirely and pass through to the provider:

```python
# NOT cached — passed through directly
stream = eco.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Tell me a story."}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

---

## Image generation

Image generation via `eco.images`. Only `response_format="b64_json"` responses are cached. URL responses expire after ~1 hour and bypass the cache.

```python
# Cached (b64_json)
result = eco.images.generate(
    model="dall-e-3",
    prompt="A photorealistic sunset over the ocean",
    size="1024x1024",
    quality="standard",
    response_format="b64_json",  # required for caching
    n=1,
)
b64_data = result.data[0].b64_json

# NOT cached (url — expires after ~1 hour)
result = eco.images.generate(
    model="dall-e-3",
    prompt="A photorealistic sunset over the ocean",
    response_format="url",  # bypasses cache
)

# Image edits (DALL-E 2)
with open("original.png", "rb") as f:
    edited = eco.images.edit(
        image=f,
        prompt="Add a lighthouse in the background",
        response_format="b64_json",
    )
```

---

## Structured output

Structured output calls (`response_format={"type": "json_schema", ...}`) are automatically tagged as `"structured"` in usage logs and the dashboard:

```python
result = eco.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Extract the name and age."}],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "person",
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "age": {"type": "number"},
                },
            },
        },
    },
)
```

---

## Cache management

```python
from ecoai import FlushFilter

eco.flush()                                   # clear all cached responses
eco.flush(FlushFilter(pattern="summarise*"))  # clear by prompt glob pattern
```

---

## Usage statistics

```python
summary = eco.summary()
print(f"Hit rate:     {summary.hit_rate:.0%}")
print(f"Tokens saved: {summary.tokens_saved:,}")
print(f"Cost saved:   ${summary.cost_saved_usd:.4f}")
print(f"CO₂ saved:    {summary.co2_saved_g:.2f}g")

records = eco.history(limit=50)
for r in records:
    status = "HIT" if r.cache_hit else "MISS"
    print(f"{r.timestamp}  {r.model:<30}  {status}  {r.tokens_saved:>6} saved")
```

---

## Dashboard

The Python SDK includes a standalone dashboard server — no Node.js or pnpm needed.

```bash
# Start the dashboard
python -m ecoai dashboard

# Custom database path and port
python -m ecoai dashboard --db /path/to/.ecoai/usage.db --port 8080

# Don't open browser automatically
python -m ecoai dashboard --no-browser

# If installed via pip, the ecoai script is available
ecoai dashboard --db .ecoai/usage.db
```

Opens at `http://localhost:3000`. See [Dashboard](../shared/dashboard.md) for full details.

---

## Sharing a database between Python and JS SDKs

Both SDKs use the same SQLite schema. You can point them at the same `usage.db` to see all calls in one dashboard:

```bash
# In your JS project
ECOAI_DB_PATH=/shared/.ecoai/usage.db npx ecoai dashboard

# In your Python project
python -m ecoai dashboard --db /shared/.ecoai/usage.db
```

Or programmatically:
```python
# Python
eco = EcoAI(client=client, log_path="/shared/.ecoai/usage.db")
```
```typescript
// TypeScript
const eco = new EcoAI({ client: openai, logPath: '/shared/.ecoai/usage.db' });
```
