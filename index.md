---
layout: home

hero:
  name: EcoAI
  text: Stop paying for the same AI response twice.
  tagline: Open-source caching SDK for AI apps. Drop-in wrapper for OpenAI, Anthropic, and Gemini. Zero infrastructure. Instant savings.
  actions:
    - theme: brand
      text: npm SDK →
      link: /npm/getting-started
    - theme: alt
      text: Python SDK →
      link: /python/getting-started

features:
  - icon: ⚡
    title: Drop-in integration
    details: Wrap your existing AI client in one line. No new infrastructure, no config files, no account needed.
  - icon: 💾
    title: SQLite · Redis · Memory
    details: Responses cached locally by default in SQLite. Scale to Redis for multi-process production deployments.
  - icon: 🧠
    title: Semantic caching
    details: Optionally match semantically similar prompts — not just identical ones. Configurable cosine similarity threshold.
  - icon: 📊
    title: Local dashboard
    details: Built-in analytics dashboard. Cache hit rate, tokens saved, cost saved, CO₂ avoided — all from your local database.
  - icon: 🌱
    title: CO₂ tracking
    details: Every cached response reduces GPU compute. EcoAI measures and logs the estimated carbon footprint avoided.
  - icon: 🔌
    title: OpenAI · Anthropic · Gemini
    details: Works with all three major providers, including vision, tool calling, structured output, and image generation.
---

## Install

::: code-group

```bash [npm]
npm install eco-ai
```

```bash [pip]
pip install ecoai-python
```

:::

## Quickstart

::: code-group

```typescript [OpenAI (JS)]
import { EcoAI } from 'eco-ai';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const eco = new EcoAI({ client: openai });

// Identical to openai.chat.completions.create — cached automatically
const response = await eco.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Summarise the water cycle.' }],
});
```

```python [OpenAI (Python)]
from openai import OpenAI
from ecoai import EcoAI

client = OpenAI()
eco = EcoAI(client=client)

# Identical to client.chat.completions.create — cached automatically
response = eco.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Summarise the water cycle."}],
)
```

:::

```
Before EcoAI  →  38 identical calls  →  $4.26 spent  →  142,000 tokens used
After EcoAI   →  1 real call + 37 cached  →  $0.11 spent  →  97% saved
```
