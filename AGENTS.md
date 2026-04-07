# Agent Ledger Notes

- Monorepo split:
  - `apps/tui`: OpenTUI frontend entrypoint at `src/main.tsx`; `src/app.tsx` owns layout, keyboard handling, overlays, and footer status bar.
  - `packages/service`: local data loading and snapshot generation; CLI entrypoint is `src/generate-snapshot.ts`.
  - `script/*.ts`: release and installer tooling only; root `tsconfig.json` is for these Bun scripts.

- Verified dev commands:
  - `bun install`
  - `bun run dev` starts the TUI from `apps/tui`
  - `bun run snapshot` runs the service snapshot generator
  - `bun run typecheck` is the main verification step
  - `bun run build:release` builds Linux `x64` and `arm64` binaries into `dist/`

- There is no maintained test suite in this repo anymore. Do not add or rely on `bun test` unless the user explicitly asks for tests again.

- Release flow is GitHub Actions only:
  - `.github/workflows/release-tag.yml` creates the release commit, pushes a `v*` tag, and dispatches `publish.yml`
  - `.github/workflows/publish.yml` is tag-driven; it builds and publishes on `v*` pushes or manual tag re-publish
  - the publish workflow validates with `bun run typecheck` only
  - `script/build.ts` must keep `bun install --os="*" --cpu="*"` or cross-arch OpenTUI builds break

- Installer hosting is repo-local:
  - root `install` is the public shell script served at `/install`
  - `script/install-server.ts` serves `/install` and `/healthz`
  - root `Dockerfile` packages that installer service

- TUI chrome lives in `apps/tui/src/app.tsx` plus `StatusBar` and the modal components; there is no separate header component anymore.

- Path/model formatting is intentionally custom:
  - `path-truncation.ts` keeps slash-aligned path suffixes like `/routers/foo` instead of mid-word truncation
  - `model-label.ts` extracts the last path segment for Top Models labels
