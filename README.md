# EcoAI Documentation

**Stop paying for the same AI response twice.**

EcoAI is an open-source caching SDK for AI-powered applications. It intercepts repetitive LLM calls, stores the responses, and returns them instantly — saving token costs, slashing latency, and reducing the environmental footprint of your AI apps.

```
Before EcoAI  →  38 identical calls  →  $4.26 spent  →  142,000 tokens used
After EcoAI   →  1 real call + 37 cached  →  $0.11 spent  →  97% saved
```

---

## Packages

| | npm (`eco-ai`) | Python (`ecoai`) |
|---|---|---|
| Install | `npm install eco-ai` | `pip install ecoai` |
| Repo | `ecoai/` (this monorepo) | `ecoai-python/` |
| Registry | [npmjs.com/package/eco-ai](https://www.npmjs.com/package/eco-ai) | [pypi.org/project/ecoai](https://pypi.org/project/ecoai) |
| Min version | Node 18+ | Python 3.10+ |

---

## Feature matrix

| Feature | npm SDK | Python SDK |
|---|---|---|
| OpenAI chat completions | ✅ | ✅ |
| OpenAI Responses API | ✅ | — |
| OpenAI image generation | ✅ `eco.images.generate()` | ✅ `eco.images.generate()` |
| Anthropic messages | ✅ | ✅ |
| Google Gemini | ✅ | ✅ |
| SQLite storage | ✅ | ✅ |
| Redis storage | ✅ | ✅ |
| In-memory storage | ✅ | ✅ |
| Exact-match caching | ✅ | ✅ |
| Semantic caching | ✅ | ✅ |
| Usage logging | ✅ | ✅ |
| Dashboard | ✅ `npx ecoai dashboard` | ✅ `python -m ecoai dashboard` |
| Streaming bypass | ✅ | ✅ |
| Dev / prod mode | ✅ | ✅ |
| Per-model TTL | ✅ | ✅ |
| Settings file integration | ✅ | ✅ |

---

## Documentation

### npm SDK
- [Getting Started](npm/getting-started.md)
- [API Reference](npm/api-reference.md)

### Python SDK
- [Getting Started](python/getting-started.md)
- [API Reference](python/api-reference.md)

### Shared topics
- [Prompt Types](shared/prompt-types.md) — text, image, file, tool, structured, audio, image_output
- [Dashboard](shared/dashboard.md) — using the local analytics dashboard
- [Semantic Caching](shared/semantic-caching.md) — similarity-based cache lookups

### Publishing
- [Publishing Guide](publishing.md) — how to publish both packages to npm and PyPI

---

## How it works

```
Your app code
     │
     ▼
┌─────────────────────────────────────┐
│            EcoAI SDK                │
│                                     │
│  1. Hash prompt + model + params    │
│  2. Check cache (SQLite / Redis)    │
│                                     │
│  Cache HIT  ──────────────────────► Return stored response (0ms, $0)
│                                     │
│  Cache MISS ──────────────────────► Forward to AI provider
│                                     │       │
│  3. Store response in cache  ◄───────────────┘
│  4. Log usage (tokens, cost, CO₂)
│  5. Return response to your app
└─────────────────────────────────────┘
```

EcoAI uses **exact-match caching**: a SHA-256 hash of the full request (model, messages, parameters) as the cache key. Identical requests return instantly. Optionally enable **semantic caching** to also match semantically similar prompts.

---

## License

MIT
