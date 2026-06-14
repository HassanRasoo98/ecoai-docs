# Prompt Types

Every cached request is classified into one of seven prompt types. The type is stored in the usage log and surfaced in the dashboard's "Content types" strip and the prompts page filters.

---

## Types

| Type | Emoji | Color | What it means |
|---|---|---|---|
| `text` | 📝 | gray | Plain text messages — no special content |
| `structured` | ⚙️ | cyan | Explicit JSON output schema (`response_format`, `responseSchema`) |
| `image` | 🖼 | blue | Vision input — image in the prompt |
| `audio` | 🎵 | pink | Audio input — audio inline data or data URI |
| `file` | 📄 | orange | Document input — PDF, file reference, or non-image/audio data URI |
| `tool` | 🔧 | violet | Tool/function calling — `tools`, `functions`, or `tool_choice` present |
| `image_output` | 🎨 | rose | Image *generation* — `eco.images.generate()` or `eco.images.edit()` |

---

## Detection logic

Prompt type is detected from the raw request params before the cache key is hashed.

**Priority order**: `structured` > `tool` > `file` > `structured (Gemini)` > `audio` > `image` > `text`

### `structured`

Triggered by `response_format` being present (any value) — OpenAI JSON mode, JSON schema, etc.

```python
# OpenAI json_schema
{"response_format": {"type": "json_schema", "json_schema": {...}}}

# OpenAI json_object
{"response_format": {"type": "json_object"}}
```

Also triggered by Gemini's `responseSchema` or `responseMimeType` in `generationConfig` (detected via JSON scan after the tool check).

### `tool`

Triggered when `tools`, `functions`, or `tool_choice` is present. This check runs before JSON serialization because Gemini's tool params may contain non-JSON-serializable proto objects.

```python
{"tools": [{"type": "function", "function": {"name": "search"}}]}
{"functions": [...]}  # legacy OpenAI format
{"tool_choice": "auto"}
```

### `file`

Triggered by:
- Anthropic document block: `{"type": "document", ...}`
- OpenAI Responses API file input: `{"type": "input_file", ...}`
- OpenAI file fields: `"file_data"` or `"file_url"` key present
- A data URI that is **not** image/audio/video: `data:application/pdf;base64,...`

### `audio`

Triggered by:
- Gemini inline audio: `"inlineData"` present **and** `"audio/"` in the JSON
- Audio data URI: `data:audio/...`

```python
# Gemini audio
{"inlineData": {"mimeType": "audio/wav", "data": "..."}}

# Data URI
{"content": "data:audio/mp3;base64,..."}
```

### `image`

Triggered by:
- OpenAI vision: `{"type": "image_url", ...}`
- Anthropic image block: `{"type": "image", ...}`
- Gemini inline image: `"inlineData"` present **and** `"image/"` in the JSON
- Gemini Cloud Storage file: `"fileData"` key present
- Image data URI: `data:image/...`

Note: `inlineData` is only matched as image when the MIME type is an image type. Audio/video `inlineData` is handled by the `audio` check above.

### `image_output`

Set directly by `eco.images.generate()` and `eco.images.edit()` — not detected from params. These methods tag every call (hit or miss) as `image_output`.

### `text`

Everything else — a plain text conversation with no special content.

---

## Dashboard display

The "Content types" strip on the overview page shows counts for any type that has at least one entry. Types with zero entries are hidden.

The prompts page filter bar includes buttons for all seven types so you can drill into any category.

---

## Examples

```typescript
// JS — text
{ model: 'gpt-4o', messages: [{ role: 'user', content: 'Hello' }] }
// → 'text'

// JS — structured
{ model: 'gpt-4o', messages: [...], response_format: { type: 'json_object' } }
// → 'structured'

// JS — tool
{ model: 'gpt-4o', messages: [...], tools: [{ type: 'function', function: { name: 'search' } }] }
// → 'tool'

// JS — image
{ model: 'gpt-4o', messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: '...' } }] }] }
// → 'image'

// JS — audio (Gemini)
{ contents: [{ parts: [{ inlineData: { mimeType: 'audio/wav', data: '...' } }] }] }
// → 'audio'

// JS — file
{ messages: [{ role: 'user', content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf' } }] }] }
// → 'file'
```
