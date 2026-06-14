---
title: CO₂ Methodology
description: How EcoAI estimates carbon savings per cached response — formula, sources, and known limitations.
---

# CO₂ Methodology

EcoAI tracks the carbon savings produced by each cache hit. This page explains exactly how that number is calculated, what sources it draws from, and where the estimates fall short.

---

## The formula

```
tokens_saved  ×  energy_per_token  ×  grid_carbon_intensity  =  kg CO₂ saved
```

In code:

```ts
co2SavedKg = (tokensSaved / 1000) * CO2_PER_1K_TOKENS[model]
```

Where `CO2_PER_1K_TOKENS[model]` already bakes in the grid intensity factor, so a single lookup gives you the full result.

---

## 1. Tokens saved

EcoAI counts **output tokens** on every cache hit — the tokens the provider *would have generated* if the request had reached the API.

Input tokens are excluded because:
- The prompt is read to compute the cache key regardless of hit or miss.
- Output generation (autoregressive decoding) accounts for the majority of inference FLOPs and therefore energy.

---

## 2. Energy per token

Published energy data for LLM inference is sparse. EcoAI's per-model constants are derived from the following sources:

| Source | What it contributes |
|--------|---------------------|
| Patterson et al. (2021) *Carbon Emissions and Large Neural Networks* | Training/inference energy breakdown for transformer models |
| Luccioni et al. (2023) *Power Hungry Processing* | Per-query energy measurements across LLM sizes |
| IEA *Electricity 2024* | Global average grid intensity: **0.45 kgCO₂/kWh** |
| Google Environmental Report (2023) | Per-query anchor (~0.3 Wh for a Google Search) |

General ranges used:

| Model tier | Wh per 1k output tokens |
|---|---|
| Large (GPT-4o, Claude Opus, Gemini 2.5 Pro) | 0.002–0.003 Wh |
| Mid-range (Claude Sonnet, Gemini Flash) | 0.001–0.002 Wh |
| Small (GPT-4o-mini, Claude Haiku) | 0.0003–0.0007 Wh |

### Per-model constants (kg CO₂ per 1k output tokens)

| Model | kgCO₂ / 1k tokens | Basis |
|---|---|---|
| `gpt-4o` | 0.000030 | Large GPT-4 class, 0.003 Wh/1k × 0.45 kgCO₂/kWh × PUE 1.2 |
| `gpt-4o-mini` | 0.000006 | Small model, ~5× lower than GPT-4o |
| `gpt-4-turbo` | 0.000030 | Same class as GPT-4o |
| `gpt-3.5-turbo` | 0.000006 | Small |
| `claude-opus-4-8` | 0.000035 | Large MoE-class |
| `claude-sonnet-4-6` | 0.000020 | Mid-range |
| `claude-haiku-4-5` | 0.000008 | Small |
| `claude-3-5-sonnet-20241022` | 0.000020 | Mid-range |
| `claude-3-opus-20240229` | 0.000035 | Large |
| `gemini-2.5-pro` | 0.000025 | Large |
| `gemini-2.5-flash` | 0.000010 | Efficient mid-range |
| `gemini-1.5-pro` | 0.000025 | Large |
| `gemini-1.5-flash` | 0.000010 | Efficient |
| `default` (unknown model) | 0.000020 | Conservative mid-range fallback |

---

## 3. Grid carbon intensity

EcoAI uses **0.45 kgCO₂/kWh** — the IEA 2023 global average for electricity generation.

This is intentionally not provider-specific because:
- Providers do not publish real-time per-inference carbon data.
- Providers purchase renewable energy certificates (RECs) that reduce *reported* emissions but not necessarily *physical* grid draw at the moment of inference.
- A global average makes the methodology reproducible and independently auditable.

Actual emissions may be lower for providers running on green-heavy grids (e.g. Google's stated 90%+ carbon-free energy hours), or higher in coal-heavy regions.

---

## 4. Comparison equivalencies

The dashboard converts CO₂ savings into human-scale comparisons. Reference values:

| Comparison | kg CO₂ per unit | Source |
|---|---|---|
| Google search | 0.0002 kg | Google Environmental Report 2023 |
| Email sent | 0.004 kg | Carbon Trust "Digital Carbon Footprint" |
| Smartphone charge | 0.0022 kg | 5.5 Wh × 0.4 kgCO₂/kWh |
| LED bulb-hour | 0.002 kg | 5 W × 1 h × 0.4 kgCO₂/kWh |
| 1 km driven (avg car) | 0.120 kg | IPCC AR6 passenger vehicle lifecycle average |

Equivalencies are only shown when the computed value is ≥ 0.01 units, to avoid uninformative fractions.

---

## Known limitations

1. **Inference-only.** Training costs, datacenter cooling (PUE), and hardware manufacturing are excluded — they are amortised across billions of requests and cannot be attributed to a single cached call.

2. **Output tokens only.** Input token energy (KV-cache prefill) is not counted, making all estimates conservative.

3. **No provider-specific metering.** Without per-request energy data from OpenAI, Anthropic, or Google, every number here is an estimate. EcoAI will update constants when providers publish better data.

4. **Model versions change.** Providers release more efficient model revisions over time. A model ID like `gpt-4o` may refer to different underlying hardware across different time periods.

5. **Location is not factored in.** A cache hit in Norway (near-zero-carbon grid) has different real-world impact than one in Poland (coal-heavy grid). EcoAI uses a global average and cannot know where inference runs.

::: info Goal
The goal is not precision — it is to make the environmental benefit of caching **visible and meaningful**. Even under conservative assumptions, repeated identical API calls without caching waste real energy.
:::

---

## Suggesting improvements

If you have better data for a specific model, a region-specific grid intensity, or a source we haven't cited, open an issue or pull request:

- [GitHub Issues](https://github.com/HassanRasoo98/ecoai/issues)
- [Edit this page on GitHub](https://github.com/HassanRasoo98/ecoai-docs/edit/main/shared/co2-methodology.md)

*Last updated: June 2026. Sources reviewed annually or when providers publish updated energy reports.*
