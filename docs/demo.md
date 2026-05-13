# Demo Data

Use Agent Ledger's built-in demo snapshot when you want to record the UI without showing your real projects.

## Run the TUI with demo data

```sh
bun run dev -- --demo
```

## Save and reopen a demo snapshot

```sh
bun run snapshot -- --demo --out demo/demo-snapshot.json
bun run dev -- --snapshot demo/demo-snapshot.json
```

## Choose a cost policy

You can force a cost policy when generating a snapshot:

```sh
bun run snapshot -- --cost-mode auto
bun run snapshot -- --cost-mode calculate
bun run snapshot -- --cost-mode display
```
