---
created_at: 2026-06-11 09:11
page_type: concept
sources:
- file: 2026-05-13_1026_promotion_tracking_export.md
  hash: 9113bdb7c3815373c496fde7e69b66bfca8f409d3db01194732bd9ca8023c170
status: draft
summary: ''
title: Streaming Export Response
updated_at: 2026-06-11 09:11
---

---
title: "Streaming Export Response"
page_type: concept
status: active
summary: "FastAPI response helper that yields a streaming CSV file with proper headers and content type."
sources:
  - file: "2026-05-13_1026_promotion_tracking_export.md"
    hash: ""
    sections: ["技术要点"]
confidence: high
---

# Streaming Export Response

A utility function (likely in `utils/api`) that returns a `StreamingResponse` configured for CSV downloads.

## Features
- Sets `Content-Type: text/csv` and a `Content-Disposition` header with a generated filename.
- Accepts a generator of CSV rows and iterates over them, writing directly to the response body.
- Works with `iter_paged_export` to avoid holding all data in memory.

## Usage in Promotion Tracking Export
The route handler calls `streaming_export_response(iter_paged_export(...))` to produce the download stream.

## Related
- [[Iter Paged Export]]
- [[Promotion Tracking Export Endpoint]]
