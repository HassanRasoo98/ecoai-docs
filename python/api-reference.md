# API Reference — Python SDK

## `EcoAI(**kwargs)`

Wraps an existing AI provider client with caching. Detects the provider automatically via duck-typing.

```python
from ecoai import EcoAI
eco = EcoAI(client=openai_client)
```

### Constructor parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `client` | `OpenAI \| Anthropic \| GenerativeModel \| genai.Client` | required | Your existing provider client |
| `mode` | `"dev" \| "prod"` | `"dev"` | `dev` = cache forever; `prod` = apply TTL |
| `storage` | `"sqlite" \| "redis" \| "memory"` | `"sqlite"` | Cache storage backend |
| `sqlite_path` | `str` | `".ecoai/cache.db"` | SQLite file path |
| `redis_url` | `str \| None` | `None` | Redis URL (also read from `ECOAI_REDIS_URL`) |
| `ttl` | `int \| None` | `3600` | Cache TTL in seconds (prod mode only) |
| `ttl_by_model` | `dict[str, int] \| None` | `{}` | Per-model TTL overrides |
| `log_usage` | `bool \| None` | `True` | Write per-call records to SQLite |
| `log_path` | `str` | `".ecoai/usage.db"` | Usage log SQLite path |
| `caching_enabled` | `bool \| None` | `True` | Master on/off switch |
| `settings_path` | `str` | `".ecoai/settings.json"` | Dashboard settings file |
| `semantic` | `SemanticConfig \| Literal[False] \| None` | `None` | Semantic caching config |

---

## Provider namespaces

### OpenAI — `eco.chat.completions.create(**kwargs)`

Identical kwargs to `openai.OpenAI().chat.completions.create()`.

```python
response = eco.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
    temperature=0.7,
    max_tokens=500,
    # any valid OpenAI ChatCompletion kwargs
)
# Returns: ChatCompletion (same pydantic model as openai SDK)
print(response.choices[0].message.content)
```

Stream calls bypass the cache:
```python
stream = eco.chat.completions.create(model="gpt-4o", messages=[...], stream=True)
```

### OpenAI — `eco.images.generate(**kwargs)` / `eco.images.edit(**kwargs)`

Wraps image generation. **Only `response_format="b64_json"` is cached.** URL responses bypass the cache (URLs expire after ~1 hour).

```python
# Generate (cached when b64_json)
result = eco.images.generate(
    model="dall-e-3",
    prompt="A lighthouse at sunset",
    size="1024x1024",
    quality="standard",
    response_format="b64_json",
    n=1,
)
# Returns: ImagesResponse (same pydantic model as openai SDK)
b64 = result.data[0].b64_json

# Edit
with open("photo.png", "rb") as f:
    result = eco.images.edit(
        image=f,
        prompt="Add a rainbow",
        response_format="b64_json",
    )
```

### Anthropic — `eco.messages.create(**kwargs)`

Identical kwargs to `anthropic.Anthropic().messages.create()`.

```python
response = eco.messages.create(
    model="claude-opus-4-8",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Explain recursion."}],
    system="You are a helpful assistant.",
)
# Returns: Message (same pydantic model as anthropic SDK)
print(response.content[0].text)
```

### Gemini (old SDK) — `eco.generate_content(contents, **kwargs)`

For `google.generativeai.GenerativeModel` clients. The method signature mirrors the underlying SDK.

```python
# Simple string prompt
response = eco.generate_content("What is the capital of France?")
print(response.text)

# With generation config
response = eco.generate_content(
    "Explain photosynthesis.",
    generation_config={"temperature": 0.9, "max_output_tokens": 500},
)

# Streaming bypasses cache
stream = eco.generate_content("Tell me a poem.", stream=True)
for chunk in stream:
    print(chunk.text, end="", flush=True)
```

### Gemini (new SDK) — `eco.models.generate_content(model, contents, **kwargs)`

For `google.genai.Client` clients. `eco.models` mirrors the `client.models` namespace from the `google-genai` SDK.

```python
response = eco.models.generate_content(
    model="gemini-2.0-flash",
    contents="What is the capital of France?",
)
print(response.text)

# With generation config
from google.genai import types
response = eco.models.generate_content(
    model="gemini-2.0-flash",
    contents="Explain photosynthesis.",
    config=types.GenerateContentConfig(temperature=0.9, max_output_tokens=500),
)

# Streaming bypasses cache
response = eco.models.generate_content(
    model="gemini-2.0-flash",
    contents="Tell me a poem.",
    stream=True,
)
```

**Cache hit response (both SDKs):** On a cache hit, EcoAI returns a `GeminiCachedResponse` — a lightweight object with `.text`, `.candidates`, and `.usage_metadata`. On a cache miss, the real SDK response object is returned.

---

## Cache management

### `eco.flush(filter=None)`

```python
from ecoai import FlushFilter

eco.flush()                                    # clear all cached responses
eco.flush(FlushFilter(pattern="summarise*"))   # clear by prompt glob (first 200 chars)
```

`FlushFilter` fields:
- `pattern: str | None` — glob pattern matched against prompt text
- `model: str | None` — clear only entries for this model *(SQLite/memory only)*

---

## Usage statistics

### `eco.summary()` → `UsageSummary`

```python
from ecoai import UsageSummary

summary: UsageSummary = eco.summary()
```

`UsageSummary` fields:
```python
@dataclass
class UsageSummary:
    total_calls: int        # total API calls made (cached + uncached)
    cache_hits: int         # calls served from cache
    cache_misses: int       # calls that hit the real API
    hit_rate: float         # cache_hits / total_calls (0.0–1.0)
    tokens_saved: int       # total output tokens saved by cache hits
    cost_saved_usd: float   # estimated USD saved
    co2_saved_g: float      # estimated grams CO₂ saved
    semantic_hits: int      # subset of cache_hits that were semantic matches
```

### `eco.history(limit=100, offset=0)` → `list[UsageRecord]`

Returns per-call records, newest first.

```python
records = eco.history(limit=50)
```

`UsageRecord` fields:
```python
@dataclass
class UsageRecord:
    id: int
    timestamp: str          # ISO 8601
    provider: str           # "openai" | "anthropic" | "gemini"
    model: str
    cache_hit: bool
    tokens_saved: int
    latency_ms: int
    cost_saved_usd: float
    co2_saved_g: float
    semantic_hit: bool
    prompt: str             # first 200 chars of prompt text
    prompt_type: str        # "text" | "image" | "file" | "tool" | "structured" | "audio" | "image_output"
```

---

## Types and dataclasses

```python
from ecoai import (
    EcoAI,
    EcoAIConfig,
    FlushFilter,
    Mode,           # Literal["dev", "prod"]
    StorageType,    # Literal["memory", "sqlite", "redis"]
    Provider,       # Literal["openai", "anthropic", "gemini"]
    PromptType,     # Literal["text", "image", "file", "tool", "structured", "audio", "image_output"]
    SemanticConfig,
    UsageRecord,
    UsageSummary,
)
```

### `SemanticConfig`

```python
from ecoai import SemanticConfig

config = SemanticConfig(
    threshold=0.95,                          # cosine similarity threshold (0.0–1.0)
    embedding_model="text-embedding-3-small", # OpenAI embedding model
)

eco = EcoAI(client=client, semantic=config)
```

Requires `openai` package and a valid `OPENAI_API_KEY` even when using Anthropic or Gemini.

### `EcoAIConfig` (internal)

The resolved configuration dataclass stored at `eco._engine._config`. Usually not needed directly.

---

## Settings integration

Read and write the dashboard settings file programmatically:

```python
from ecoai import read_settings, write_settings, EcoAISettings

settings = read_settings(".ecoai/settings.json")
print(settings.caching_enabled)
print(settings.semantic_enabled)
print(settings.semantic_threshold)

# Write settings (e.g. from a custom UI)
write_settings(".ecoai/settings.json", {
    "cachingEnabled": True,
    "semanticEnabled": False,
    "semanticThreshold": 0.95,
    "mode": "prod",
    "ttl": 7200,
})
```

---

## Dashboard CLI

```
usage: python -m ecoai [-h] {dashboard} ...

subcommands:
  dashboard   Start the EcoAI local dashboard

dashboard options:
  --db PATH       Path to the usage SQLite database (default: .ecoai/usage.db)
  --port PORT     Port to listen on (default: 7315, or $ECOAI_DASHBOARD_PORT)
  --no-browser    Do not open a browser tab automatically
```

Examples:
```bash
python -m ecoai dashboard
python -m ecoai dashboard --db /path/to/.ecoai/usage.db --port 8080 --no-browser
ecoai dashboard  # after pip install ecoai-python

# Set port via environment variable
ECOAI_DASHBOARD_PORT=8080 python -m ecoai dashboard
```

---

## Internal utilities (advanced)

```python
from ecoai.cache.hash import hash_cache_key, detect_prompt_type

# Compute the cache key for any params dict
key = hash_cache_key({"model": "gpt-4o", "messages": [...]})

# Detect the prompt type
ptype = detect_prompt_type({"model": "gpt-4o", "messages": [...]})
# → "text" | "image" | "file" | "tool" | "structured" | "audio" | "image_output"
```
