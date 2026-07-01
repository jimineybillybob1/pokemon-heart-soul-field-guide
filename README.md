# Pokemon Heart & Soul Field Guide

A static, offline-friendly guide for Pokemon Heart & Soul, built from the official Heart & Soul
documentation workbook and source repository assets.

## Features

- Full Dex with stats, types, abilities, evolutions, learnsets, wild/static availability, and caught tracking
- Location browser with wild encounter methods, rates, levels, and time of day
- Items, TMs, HMs, berries, tutors, moves, trainers, FAQ, completion, and rematch references
- Six-slot Team Builder with autocomplete, nicknames, natures, held items, evolution shortcuts, and local persistence
- Six-slot Team Planner with notes
- Battle Planner using selected Team Builder moves against custom targets or documented boss teams
- Portable save export/import for caught Pokemon, team, planner, battle settings, and rules
- Conflict-safe encrypted UUID cloud sync through an optional Cloudflare Worker
- Local recovery backups before imports, sync loads, resets, and recovery restores
- Service worker caching for offline use after first load

Walkthrough content is intentionally excluded.

## Rebuild Data

The data builder expects the Heart & Soul workbook and a local checkout of the source repo at
`work/pokemonHnS`.

```powershell
& 'C:\Users\james\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  'scripts\build-guide-data.py' `
  'C:\Users\james\Downloads\Pokemon Heart & Soul Documentation - LIVE.xlsx' `
  'work\pokemonHnS'
```

The generated app data is written to `data/heart-soul-data.js`, and selected assets are copied to
`assets/`.

## Cloud Sync

The guide works without a backend: export/import and local recovery are always available. Cloud sync
uses the Worker in `sync-worker/`, stores only browser-encrypted save data, and treats the UUID as
the private recovery key.

To enable it, create a Cloudflare Workers KV namespace, add `CLOUDFLARE_KV_NAMESPACE_ID` and
`HEART_SOUL_SYNC_ENDPOINT` as GitHub Actions variables, add `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` as secrets, then run the **Deploy sync Worker** workflow followed by the
Pages workflow.
