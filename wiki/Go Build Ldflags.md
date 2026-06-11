---
created_at: 2026-06-11 08:26
page_type: concept
sources:
- file: 项目安装
  hash: 356758e4dd476ba14fc6e26654fd1baa439d443f604760bf8cdae20591595faf
status: draft
summary: ''
title: Go Build Ldflags
updated_at: 2026-06-11 08:26
---

---
title: "Go Build Ldflags"
page_type: concept
status: active
summary: "A pattern of using -ldflags with -X to inject build-time variables (Version, GitCommit, BuildDate) into a Go binary."
sources:
  - file: "项目安装.md"
    sections: ["全部"]
confidence: high
---

# Go Build Ldflags

The `-ldflags` argument to `go build` passes linker flags. A common pattern is to use `-X importpath.name=value` to set the value of a string variable at build time. This is used to embed version metadata into the compiled binary.

## Example
```powershell
go build -ldflags "-s -w -X main.Version=v0.0.0-$gitCommit -X main.GitCommit=$gitCommit -X main.BuildDate=$buildDate" -o dist/opencodereview.exe ./cmd/opencodereview
```
- `-s -w` strip debug information to reduce binary size.
- `-X main.Version=...` sets the string variable `Version` in the `main` package.
- The values are typically obtained from Git and the current time.

## Use in [[opencodereview]]
The build command uses this pattern to record the version, Git commit hash, and build date in the resulting `opencodereview.exe`.

## See Also
- [[opencodereview]]
- [[Go]]