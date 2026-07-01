# Pokemon Heart & Soul Field Guide

A static, offline-friendly guide for Pokemon Heart & Soul, built from the official Heart & Soul
documentation workbook and source repository assets.

## Features

- Full Dex with stats, types, abilities, evolutions, learnsets, wild/static availability, and caught tracking
- Location browser with wild encounter methods, rates, levels, and time of day
- Items, TMs, HMs, berries, tutors, moves, trainers, FAQ, completion, and rematch references
- Six-slot Team Builder with move selection and local persistence
- Six-slot Team Planner with notes
- Battle Planner using selected Team Builder moves against custom targets or documented boss teams
- Portable save export/import for caught Pokemon, team, planner, battle settings, and rules
- Encrypted sync codes for moving saves between browsers without a backend
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
