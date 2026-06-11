---
created_at: 2026-06-11 08:26
page_type: entity
sources:
- file: 项目安装
  hash: 356758e4dd476ba14fc6e26654fd1baa439d443f604760bf8cdae20591595faf
status: draft
summary: ''
title: Go (Programming Language)
updated_at: 2026-06-11 08:26
---

---
title: "Go (Programming Language)"
page_type: entity
status: active
summary: "A statically typed, compiled programming language designed at Google. Version 1.26.4 used in this project."
sources:
  - file: "项目安装.md"
    sections: ["全部"]
confidence: high
---

# Go

Go is an open-source programming language that makes it easy to build simple, reliable, and efficient software. In this context, Go 1.26.4 was installed via [[winget]] to compile the [[opencodereview]] project.

## Install
- Installed using `winget install GoLang.Go`.
- After installation, the binary is located at `C:\Program Files\Go\bin`.

## Usage
- The `go build` command compiles the source in `./cmd/opencodereview` into an executable.
- [[Go Build Ldflags]] are used to embed version metadata.

## See Also
- [[winget]]
- [[opencodereview]]
- [[Go Build Ldflags]]