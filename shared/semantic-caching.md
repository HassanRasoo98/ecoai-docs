# Semantic Caching

Semantic caching lets EcoAI return a cached response even when the new prompt is worded differently, as long as the meaning is similar enough.

**Off by default.** Enable explicitly when you need it.

---

## How it works

1. On every cache **miss**, EcoAI generates an embedding for the prompt text (using OpenAI `text-embedding-3-small` by default, or your custom function).
2. The embedding is stored alongside the cached response.
3. On the next call, the new prompt is also embedded and its cosine similarity is computed against all stored embeddings.
4. If any similarity score is ≥ the threshold (default 0.95), the closest match's cached response is returned — a **semantic hit**.
5. Multimodal requests (image, audio, file, tool) are **excluded** from semantic matching and always use exact-match caching.

---

## Enabling — npm SDK

```typescript
// Simple on/off (uses OpenAI text-embedding-3-small)
const eco = new EcoAI({ client: openai, semantic: true });

// Custom threshold
const eco = new EcoAI({
  client: openai,
  semantic: {
    threshold: 0.92,
    embeddingModel: 'text-embedding-3-small',
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
});

// Bring your own embedding function — any provider, any model
const eco = new EcoAI({
  client: anthropic,
  semantic: {
    threshold: 0.92,
    embedFn: async (text) => {
      const res = await cohere.embed({ texts: [text], model: 'embed-english-v3.0' });
      return res.embeddings[0];
    },
  },
});
```

## Enabling — Python SDK

```python
from ecoai import EcoAI, SemanticConfig

# Default (OpenAI text-embedding-3-small)
eco = EcoAI(
    client=client,
    semantic=SemanticConfig(threshold=0.95),
)

# Bring your own embedding function — any provider, any model
import cohere

co = cohere.Client(api_key=os.environ["COHERE_API_KEY"])

def my_embed(text: str) -> list[float]:
    return co.embed(texts=[text], model="embed-english-v3.0").embeddings[0]

eco = EcoAI(
    client=client,
    semantic=SemanticConfig(threshold=0.95, embed_fn=my_embed),
)
```

---

## Example

```python
# First call — cache miss, response stored with embedding
eco.chat.completions.create(model="gpt-4o", messages=[
    {"role": "user", "content": "What is the capital of France?"}
])

# Second call — semantic hit (similarity ≥ 0.95)
eco.chat.completions.create(model="gpt-4o", messages=[
    {"role": "user", "content": "Tell me the capital city of France."}
])

# Different enough to miss (similarity < 0.95 at threshold 0.95)
eco.chat.completions.create(model="gpt-4o", messages=[
    {"role": "user", "content": "What is the second largest city in France?"}
])
```

---

## Threshold guide

| Threshold | Behavior |
|---|---|
| 0.99 | Extremely strict — only near-identical rephrasing matches |
| **0.95 (default)** | Conservative — safe starting point |
| 0.92 | Moderate — picks up common paraphrasing |
| 0.88 | Aggressive — higher hit rate, higher risk of wrong responses |
| < 0.85 | Not recommended — likely returns wrong cached answers |

**Start at 0.95 and lower only if you're seeing too many misses.** Semantic caching is a performance optimization — when in doubt, prefer a miss over a wrong answer.

---

## Requirements

**Using the default OpenAI embeddings:**
- An OpenAI API key (`OPENAI_API_KEY` env var), even when using Anthropic or Gemini clients.
- `openai` package installed (`pip install openai` / `npm install openai`).
- Embeddings cost: `text-embedding-3-small` is $0.020 per 1M tokens (~$0.000002 per prompt).

**Using a custom `embedFn` / `embed_fn`:**
- No OpenAI dependency required.
- Install and configure whichever embedding provider you choose.
- Your function must return a plain list/array of floats (the embedding vector). All vectors in one EcoAI instance must have the same dimension.

---

## Dashboard behavior

When semantic caching is active:
- The **Cache hits** card shows both totals: e.g. `8 semantic · 42 exact`
- The **Prompts page** → **Semantic** filter shows only semantic hits
- The **Prompts page** → **Exact** filter shows only exact hits

---

## Excluding specific calls

Multimodal requests are automatically excluded. To bypass semantic matching for a specific text call, call the underlying provider client directly:

```typescript
// JS — bypasses EcoAI entirely for this call
const response = await openai.chat.completions.create({ model: 'gpt-4o', messages: [...] });
```

```python
# Python — same idea
response = client.chat.completions.create(model="gpt-4o", messages=[...])
```

> **Roadmap:** A per-call override (`ecoai: { semantic: false }`) is planned so you can bypass semantic matching without leaving the `eco` wrapper. Until then, call the underlying client directly.

---

## Storage of embeddings

::: warning Embeddings do not survive restarts
Embeddings are stored **in-memory only** — they are not persisted to SQLite or Redis. After a process restart:
- All your **cached responses remain intact**.
- The **embedding index is empty**. Semantic matching rebuilds gradually as new calls come in — each cache miss regenerates and stores the embedding.

In practice this means your semantic hit rate may dip briefly after a restart before recovering. Your exact-match hit rate is unaffected.
:::

In multi-process deployments, each process builds its own embedding index independently. Use Redis storage so cached responses are shared across processes — but expect each process to rebuild its own in-memory embedding index over time.
