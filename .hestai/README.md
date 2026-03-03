# .hestai — Three-Tier Architecture

This directory implements the HestAI three-tier governance model (HestAI-MCP PR #264).

## Tiers

| Tier | Path | Purpose | Git |
|------|------|---------|-----|
| 1 | `.hestai-sys/` | System governance (MCP-delivered, read-only) | Gitignored |
| 2 | `.hestai/` | Project governance (North Stars, decisions, rules) | Committed |
| 3 | `.hestai/state/` → `.hestai-state/` | Working state (context, reports, sessions) | Gitignored |

## This Directory (Tier 2)

Committed to git. Changes require a PR. Contains authoritative project governance:

```
.hestai/
├── north-star/     # North Star documents (D1 phase deliverables, binding)
├── decisions/      # ADRs and decision records (if any)
└── README.md       # This file
```

## Working State (Tier 3)

`.hestai/state` is a symlink to `.hestai-state/` at the repo root. This directory is gitignored — it holds frequently-changing context that doesn't need PR review:

```
.hestai-state/
├── context/        # PROJECT-CONTEXT, ECOSYSTEM-POSITION, roadmap, build status
├── reports/        # Phase completion reports, assessments
├── sessions/       # Session handoff artifacts
├── research/       # Research notes
└── audit/          # Audit logs
```

## System Layer (Tier 1)

`.hestai-sys/` is injected by the HestAI MCP server on `clock_in`. It contains immutable governance rules shared across all projects. Never edit these directly.
