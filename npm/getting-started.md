# Getting Started — npm SDK (`eco-ai`)

## Install

```bash
npm install eco-ai
```

Install whichever provider SDKs you use:

```bash
npm install openai                  # OpenAI
npm install @anthropic-ai/sdk       # Anthropic
npm install @google/generative-ai   # Google Gemini
npm install ioredis                 # Redis storage (optional)
```

**Requirements**: Node.js 18+, `better-sqlite3` (bundled).

---

## Quickstart

### OpenAI

```typescript
import { EcoAI } from 'eco-ai';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const eco = new EcoAI({ client: openai, mode: 'dev' });

const response = await eco.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Summarise the water cycle.' }],
});
console.log(response.choices[0].message.content);

// Second call — returns from cache instantly, costs $0
const cached = await eco.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Summarise the water cycle.' }],
});
```

### Anthropic

```typescript
import { EcoAI } from 'eco-ai';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const eco = new EcoAI({ client: anthropic, mode: 'dev' });

const response = await eco.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Explain quantum entanglement.' }],
});
console.log(response.content[0].text);
```

### Google Gemini

```typescript
import { EcoAI } from 'eco-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const eco = new EcoAI({ client: gemini, mode: 'dev' });

const response = await eco.generateContent({
  model: 'gemini-2.5-flash',
  prompt: 'What is photosynthesis?',
});
console.log(response.text);
```

> **That's the entire integration.** No new infrastructure. No config files. No account needed. EcoAI stores responses in a local SQLite file at `.ecoai/cache.db` by default.

---

## Configuration

```typescript
const eco = new EcoAI({
  client: openai,

  // Cache mode
  mode: 'dev',              // 'dev': cache forever | 'prod': apply TTL (default: 'dev')

  // Storage
  storage: 'sqlite',        // 'sqlite' | 'redis' | 'memory' (default: 'sqlite')
  sqlitePath: '.ecoai/cache.db',
  redisUrl: 'redis://localhost:6379',  // only needed when storage: 'redis'

  // TTL (prod mode only)
  ttl: 3600,                // global TTL in seconds (default: 3600)
  ttlByModel: {             // per-model overrides, take precedence over ttl
    'gpt-4o': 7200,
    'gpt-4o-mini': 1800,
  },

  // Usage logging
  logUsage: true,           // write per-call records to SQLite (default: true)
  logPath: '.ecoai/usage.db',

  // Master switch
  cachingEnabled: true,     // set false to disable caching entirely (default: true)

  // Semantic caching (off by default)
  semantic: {
    threshold: 0.95,        // cosine similarity threshold (0–1)
    embeddingModel: 'text-embedding-3-small',
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
});
```

### Environment variables

Environment variables are the second-highest priority (below programmatic config, above the settings file):

```bash
ECOAI_MODE=prod
ECOAI_STORAGE=sqlite
ECOAI_REDIS_URL=redis://localhost:6379
```

### Settings file

The dashboard writes to `.ecoai/settings.json`. EcoAI reads this file at startup as the lowest-priority config layer. Programmatic config and env vars always win.

---

## Storage backends

### SQLite (default)
```typescript
const eco = new EcoAI({ client: openai, storage: 'sqlite', sqlitePath: '.ecoai/cache.db' });
```
Best for: local development, single-process production, Docker (mount `.ecoai/` as a volume).

### In-memory
```typescript
const eco = new EcoAI({ client: openai, storage: 'memory' });
```
Best for: unit tests, ephemeral one-shot processes. Cache is lost on process exit.

### Redis
```typescript
// Requires: npm install ioredis
const eco = new EcoAI({
  client: openai,
  storage: 'redis',
  redisUrl: 'redis://localhost:6379',
});
```
Best for: multi-instance production, serverless, shared cache across processes.

---

## Dev vs Prod mode

```typescript
// Dev mode — cache forever, no TTL
const eco = new EcoAI({ client: openai, mode: 'dev' });

// Prod mode — cache expires after ttl seconds (default 3600)
const eco = new EcoAI({ client: openai, mode: 'prod', ttl: 7200 });

// Switch at runtime
eco.setMode('prod');
eco.setMode('dev');
```

---

## Streaming

Streaming calls bypass the cache entirely and pass through to the provider:

```typescript
// This is passed through directly — NOT cached
const stream = await eco.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Tell me a story.' }],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
}
```

---

## Image generation

Image generation is supported via `eco.images`. Only `response_format: 'b64_json'` responses are cached — URL responses expire after ~1 hour and are passed through directly.

```typescript
// Cached (b64_json)
const result = await eco.images.generate({
  model: 'dall-e-3',
  prompt: 'A photorealistic sunset over the ocean',
  size: '1024x1024',
  quality: 'standard',
  response_format: 'b64_json',  // required for caching
});
const b64 = result.data[0].b64_json;

// NOT cached (url — expires after ~1 hour)
const result = await eco.images.generate({
  model: 'dall-e-3',
  prompt: 'A photorealistic sunset over the ocean',
  response_format: 'url',  // bypasses cache
});

// Image edits (DALL-E 2)
const edited = await eco.images.edit({
  image: fs.createReadStream('original.png'),
  prompt: 'Add a lighthouse in the background',
  response_format: 'b64_json',
});
```

---

## Structured output

Structured output calls (`response_format: json_schema`) are automatically tagged as `'structured'` in usage logs and the dashboard:

```typescript
const result = await eco.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Extract the name and age.' }],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'person',
      schema: {
        type: 'object',
        properties: { name: { type: 'string' }, age: { type: 'number' } },
      },
    },
  },
});
```

---

## Cache management

```typescript
await eco.cache.flush();                         // clear everything
await eco.cache.flush({ model: 'gpt-4o' });      // clear by model
await eco.cache.flush({ pattern: 'summarise*' }); // clear by prompt glob
```

---

## Usage statistics

```typescript
const stats = await eco.usage.summary();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Tokens saved: ${stats.tokensSaved.toLocaleString()}`);
console.log(`Cost saved: $${stats.costSaved.toFixed(4)}`);
console.log(`CO₂ saved: ${(stats.co2Saved * 1000).toFixed(2)}g`);

const history = await eco.usage.history({ from: '2025-01-01', limit: 50 });
for (const r of history) {
  console.log(r.timestamp, r.model, r.cacheHit ? 'HIT' : 'MISS', r.tokensSaved);
}
```

---

## Dashboard

```bash
# Start the analytics dashboard (requires the monorepo to be set up)
npx ecoai dashboard

# Or from the monorepo root
pnpm dashboard

# Point at a specific database
ECOAI_DB_PATH=/path/to/.ecoai/usage.db npx ecoai dashboard
```

Opens at `http://localhost:3000`. See [Dashboard](../shared/dashboard.md) for full details.

---

## CommonJS / ESM

EcoAI ships both `dist/index.mjs` (ESM) and `dist/index.js` (CJS). `better-sqlite3` is a native CJS module. In projects with `"type": "module"`, ensure you're loading the CJS bundle:

```json
// package.json of consumer project — one option
{ "type": "commonjs" }
```

Or use `.cjs` file extensions in your project.
