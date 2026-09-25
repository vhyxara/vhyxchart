Claude Code (Developer):
Before starting: complete the full sync ritual from claude.md — read claude.md, decision.md, visual-runtime-architecture.md in full, the last 2–3 session_update.md entries.

1. reads the brief
2. inspects the codebase
3. implements the task
4. runs validation
5. reports results

The Developer should not expand scope without approval.

---

Developer submits implementation report

The report should contain:

```text
Implementation completed
Files changed
What changed
Tests added/changed
Commands executed
Validation results
Known limitations
Unexpected findings
Open questions / blockers
```

If something conflicts with the architecture, it must be explicitly identified.

---

after every brief execution Developer append report in session_update.md

# session_update.md — Append-only implementation log

_Claude Code: append a new entry here at the end of every task, using the JSON report format specified in your current brief. Never edit or delete a prior entry — if something needs correcting, add a new entry noting the correction. Read the last 2–3 entries as part of your sync ritual before starting new work (see `claude.md`)._

# decision.md — Operational rules for this codebase

_This file is the local, code-level distillation of `visual-runtime-architecture.md`. If anything here ever appears to conflict with those documents, the architecture documents win — report the conflict as an escalation, don't silently pick one._

reference:
VhyxUI path:
/Users/tanveer/Documents/tanveer/vhyxUI
