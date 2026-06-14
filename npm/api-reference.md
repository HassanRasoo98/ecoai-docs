# API Reference — npm SDK

## `new EcoAI(config)`

Wraps an existing AI provider client with caching. Detects the provider automatically via duck-typing.

```typescript
import { EcoAI } from 'eco-ai';
const eco = new EcoAI({ client: openai });
```

### Config options

| Option | Type | Default | Description |
|---|---|---|---|
| `client` | `OpenAI \| Anthropic \| GoogleGenerativeAI` | required | Your existing provider client |
| `mode` | `'dev' \| 'prod'` | `'dev'` | `dev` = cache forever; `prod` = apply TTL |
| `storage` | `'sqlite' \| 'redis' \| 'memory'` | `'sqlite'` | Cache storage backend |
| `sqlitePath` | `string` | `'.ecoai/cache.db'` | SQLite file path |
| `redisUrl` | `string` | `process.env.ECOAI_REDIS_URL` | Redis connection URL |
| `ttl` | `number` | `3600` | Cache TTL in seconds (prod mode only) |
| `ttlByModel` | `Record<string, number>` | `{}` | Per-model TTL overrides |
| `logUsage` | `boolean` | `true` | Write per-call records to SQLite |
| `logPath` | `string` | `'.ecoai/usage.db'` | Usage log SQLite path |
| `cachingEnabled` | `boolean` | `true` | Master on/off switch |
| `settingsPath` | `string` | `'.ecoai/settings.json'` | Dashboard settings file path |
| `semantic` | `boolean \| SemanticOptions` | `false` | Enable semantic caching |

### `semantic` options

```typescript
eco = new EcoAI({
  client: openai,
  semantic: {
    threshold: 0.95,                     // cosine similarity threshold (0–1), default 0.95
    embeddingModel: 'text-embedding-3-small',  // default
    openaiApiKey: process.env.OPENAI_API_KEY,  // required for embeddings
  },
});
// or just:
eco = new EcoAI({ client: openai, semantic: true }); // use all defaults
```

---

## Provider namespaces

### OpenAI — `eco.chat.completions.create(params)`

Identical signature to `openai.chat.completions.create()`. All params are forwarded as-is.

```typescript
const response = await eco.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
  temperature: 0.7,
  max_tokens: 500,
  // Any valid OpenAI ChatCompletion params
});
// Returns: ChatCompletion (same type as openai SDK)
```

Stream calls bypass the cache:
```typescript
const stream = await eco.chat.completions.create({ ..., stream: true });
```

### OpenAI — `eco.responses.create(params)`

Wraps the OpenAI Responses API (available when `openai.responses` exists on the client).

```typescript
const response = await eco.responses.create({
  model: 'gpt-4o',
  input: [{ role: 'user', content: [{ type: 'input_text', text: 'Summarize this.' }] }],
});
```

### OpenAI — `eco.images.generate(params)` / `eco.images.edit(params)`

Wraps image generation. **Only `response_format: 'b64_json'` is cached.** URL responses bypass the cache (URLs expire after ~1 hour).

```typescript
// Generate
const result = await eco.images.generate({
  prompt: 'A lighthouse at sunset',
  model: 'dall-e-3',
  size: '1024x1024',
  quality: 'standard',
  response_format: 'b64_json',  // required for caching
  n: 1,
});
// Returns: ImagesResponse (same type as openai SDK)

// Edit (DALL-E 2)
const edited = await eco.images.edit({
  image: fs.createReadStream('photo.png'),
  prompt: 'Add a rainbow',
  response_format: 'b64_json',
});
```

### Anthropic — `eco.messages.create(params)`

Identical signature to `anthropic.messages.create()`.

```typescript
const response = await eco.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Explain recursion.' }],
  system: 'You are a helpful assistant.',
  temperature: 1.0,
});
// Returns: Message (same type as anthropic SDK)
```

### Gemini — `eco.generateContent(params)`

```typescript
const response = await eco.generateContent({
  model: 'gemini-2.5-flash',
  prompt: 'What is the capital of France?',
  // or use contents format:
  contents: [{ role: 'user', parts: [{ text: 'What is the capital of France?' }] }],
  generationConfig: {
    temperature: 0.9,
    maxOutputTokens: 500,
  },
});
console.log(response.text);   // shorthand text accessor
```

---

## Cache controls

### `eco.cache.flush(filter?)`

```typescript
await eco.cache.flush();                           // clear all cached responses
await eco.cache.flush({ model: 'gpt-4o' });        // clear only gpt-4o responses
await eco.cache.flush({ pattern: 'summarise*' });  // clear by prompt glob pattern
```

`filter` is optional. Omitting it clears everything. Pattern matching is glob-style against the first 200 chars of the prompt.

---

## Usage statistics

### `eco.usage.summary()` → `Promise<UsageSummary>`

```typescript
interface UsageSummary {
  totalCalls: number;   // total API calls made (cached + uncached)
  cachedCalls: number;  // calls served from cache
  hitRate: number;      // cachedCalls / totalCalls (0–1)
  tokensSaved: number;  // total output tokens saved by cache hits
  costSaved: number;    // estimated USD saved
  co2Saved: number;     // estimated kg CO₂ saved
}
```

### `eco.usage.history(options?)` → `Promise<UsageRecord[]>`

```typescript
interface UsageHistoryOptions {
  from?: string;      // ISO 8601 date, e.g. '2025-01-01'
  to?: string;        // ISO 8601 date
  limit?: number;     // max records to return
  model?: string;     // filter by model name
  provider?: 'openai' | 'anthropic' | 'gemini';
}

interface UsageRecord {
  id: number;
  timestamp: string;      // ISO 8601
  model: string;
  provider: 'openai' | 'anthropic' | 'gemini';
  cacheHit: boolean;
  tokensUsed: number;
  tokensSaved: number;
  latencyMs: number;
  costEstimate: number;   // USD
  promptHash: string;     // SHA-256 of the request
}
```

---

## Mode switching

```typescript
eco.setMode('prod');  // switch to prod mode (TTL-based expiry)
eco.setMode('dev');   // switch back to dev mode (cache forever)
```

---

## Types

```typescript
import type {
  EcoAIConfig,
  Mode,           // 'dev' | 'prod'
  StorageType,    // 'sqlite' | 'redis' | 'memory'
  Provider,       // 'openai' | 'anthropic' | 'gemini'
  PromptType,     // 'text' | 'image' | 'file' | 'tool' | 'structured' | 'audio' | 'image_output'
  FlushFilter,
  UsageSummary,
  UsageRecord,
  UsageHistoryOptions,
} from 'eco-ai';
```

---

## Internal utilities (advanced)

These are exported but primarily for internal use or testing:

```typescript
import { hashCacheKey, detectPromptType } from 'eco-ai/cache/hash';

// Compute the cache key for any params object
const key = hashCacheKey({ model: 'gpt-4o', messages: [...] });

// Detect the prompt type
const type = detectPromptType({ model: 'gpt-4o', messages: [...] });
// → 'text' | 'image' | 'file' | 'tool' | 'structured' | 'audio' | 'image_output'
```
