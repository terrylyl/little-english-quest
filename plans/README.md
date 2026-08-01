# Animation plans

| # | Plan | Severity | Status | Dependency |
| --- | --- | --- | --- | --- |
| 005 | Consolidate motion timing and shorten page entry | LOW | DONE | None |
| 002 | Limit high-frequency hover motion | MEDIUM | DONE | 005 |
| 003 | Make learning-card selection interruptible | MEDIUM | DONE | 002, 005 |
| 004 | Use a compositor-friendly recording pulse | MEDIUM | DONE | None |
| 001 | Preserve feedback in reduced-motion mode | MEDIUM | DONE | 004, 005 |

Recommended execution order: 005 → 002 → 003 → 004 → 001. All plans were audited against commit `4e7fc3e`.
