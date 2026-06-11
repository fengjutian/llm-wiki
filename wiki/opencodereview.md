---
created_at: 2026-06-11 08:26
page_type: entity
sources:
- file: 项目安装
  hash: 356758e4dd476ba14fc6e26654fd1baa439d443f604760bf8cdae20591595faf
status: draft
summary: ''
title: opencodereview
updated_at: 2026-06-11 08:26
---

---
title: "opencodereview"
page_type: entity
status: active
summary: "A command-line tool project compiled from ./cmd/opencodereview; the binary is dist/opencodereview.exe."
sources:
  - file: "项目安装.md"
    sections: ["全部"]
confidence: high
---

# opencodereview

opencodereview is a software tool built with [[Go]]. The entry point is located at `./cmd/opencodereview`, and the compiled binary is `dist/opencodereview.exe` (approximately 39 MB).

## Build Details
- Built using `go build` with [[Go Build Ldflags]] to embed version information (via `-X` flags).
- The build process creates the `dist/` directory if it doesn't exist.
- The default build (without ldflags) is `go build -o dist/opencodereview.exe ./cmd/opencodereview`.

## See Also
- [[Go Build Ldflags]]
- [[Go]]