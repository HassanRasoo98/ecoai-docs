# Semantic Caching

Semantic caching lets EcoAI return a cached response even when the new prompt is worded differently, as long as the meaning is similar enough.

**Off by default.** Enable explicitly when you need it.

---

## How it works

1. On every cache **miss**, EcoAI generates an embedding for the prompt text using `text-embedding-3-small`.
2. The embedding is stored alongside the cached response.
3. On the next call, the new prompt is also embedded and its cosine similarity is computed against all stored embeddings.
4. If any similarity score is ≥ the threshold (default 0.95), the closest match's cached response is returned — a **semantic hit**.
5. Multimodal requests (image, audio, file, tool) are **excluded** from semantic matching and always use exact-match caching.

---

## Enabling — npm SDK

```typescript
// Simple on/off
const eco = new EcoAI({ client: openai, semantic: true });

// Custom threshold
const eco = new EcoAI({
  client: openai,
  semantic: {
    threshold: 0.92,   // lower = more aggressive matching (more hits, more risk)
    embeddingModel: 'text-embedding-3-small',
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
});
```

## Enabling — Python SDK

```python
from ecoai import EcoAI, SemanticConfig

eco = EcoAI(
    client=client,
    semantic=SemanticConfig(
        threshold=0.95,
        embedding_model="text-embedding-3-small",
    ),
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

- An OpenAI API key (`OPENAI_API_KEY` env var), even when using Anthropic or Gemini clients.
- `openai` package installed (`pip install openai` / `npm install openai`).
- Embeddings cost: `text-embedding-3-small` is $0.020 per 1M tokens (~$0.000002 per prompt).

---

## Dashboard behavior

When semantic caching is active:
- The **Cache hits** card shows both totals: e.g. `8 semantic · 42 exact`
- The **Prompts page** → **Semantic** filter shows only semantic hits
- The **Prompts page** → **Exact** filter shows only exact hits

---

## Excluding specific calls

Multimodal requests are automatically excluded. To force an exact-match call:

```typescript
// JS — pass the raw client directly for this call
const response = await openai.chat.completions.create({ model: 'gpt-4o', messages: [...] });
```

```python
# Python — same idea
response = client.chat.completions.create(model="gpt-4o", messages=[...])
```

---

## Storage of embeddings

Embeddings are stored in-process in a `dict` keyed by SHA-256 hash of the prompt. They are **not** persisted to SQLite or Redis — they are recomputed on next startup. This means:

- After a process restart, the first call to each unique prompt generates a fresh embedding.
- In multi-process deployments, embeddings are not shared between processes.

For production multi-process setups with semantic caching, use Redis storage. The response is cached in Redis but embeddings remain in-process — each process builds its own embedding index over time.
