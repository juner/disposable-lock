# json-seq-stream

application/json-seq / jsonl (NDJSON) support stream / async iterator library

This library provides composable `TransformStream` / `ReadableWritablePair` utilities to work with streaming JSON data formats.

## Features

- [x] Supports [RFC7464](https://datatracker.ietf.org/doc/html/rfc7464) (application/json-seq)
- [x] Supports JSON Lines / NDJSON (application/jsonl, application/x-ndjson)
- [x] Fully stream-compatible (Fetch API, File API, Bun/Deno, etc.)
- [x] Composable with standard Web Streams (`pipeThrough()`)

---

## Usage Examples

### JSON Sequence (RFC 7464)

```ts
import { InputJsonSequenceStream } from "json-seq-stream";

type Value = { value: number };

const sequenceStream = new InputJsonSequenceStream<Value>();

const response = await fetch(url);
const readable = response.body!.pipeThrough(sequenceStream);

for await (const value of readable) {
  console.log(value);
}
```

## JSON Lines / NDJSON

```ts
import { InputJsonLinesStream } from "json-seq-stream";

type Value = { value: number };

const linesStream = new InputJsonLinesStream<Value>();

const response = await fetch("https://example.com/data.jsonl");
const readable = response.body!.pipeThrough(linesStream);

for await (const value of readable) {
  console.log(value);
}
```

## Output Example

```ts
import { OutputJsonLinesStream } from "json-seq-stream";

type Value = { value: number };

const { readable, writable } = new OutputJsonLinesStream<Value>();

const writer = writable.getWriter();
writer.write({ value: 1 });
writer.write({ value: 2 });
writer.close();

for await (const chunk of readable) {
  console.log(new TextDecoder().decode(chunk)); // NDJSON text lines
}
```

## See also

- RFC 7464 - JavaScript Object Notation (JSON) Text Sequences \
[https://datatracker.ietf.org/doc/html/rfc7464](https://datatracker.ietf.org/doc/html/rfc7464)
- JSON Lines \
[https://jsonlines.org](https://jsonlines.org)
- JSON streaming - Wikipedia (en) \
[https://en.wikipedia.org/wiki/JSON_streaming](https://en.wikipedia.org/wiki/JSON_streaming)
