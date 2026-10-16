# Contribution control room

A dependency-free public ledger of OSS pull requests authored by `srijan2607`.

## What the numbers mean

- **Upstream** means the PR targets the actual project's repository.
- **Own-fork review** is a review copy in the author's fork, not an extra fix or upstream acceptance.
- Open counts describe the current public inventory. Merged and closed counts include historical records; the recent-merge figure is explicitly limited to the last seven days.
- A closed PR is not automatically a rejected fix. Closure reasons distinguish explicit evidence, inference and unknowns; evidence links remain available.
- Private and personal/product repositories are excluded. Only sanitized public GitHub metadata is published.

## Freshness and gates

The page checks `data.json` every 60 seconds. The publisher's target refresh cadence is ten minutes. The snapshot timestamp is the verification time, not the browser fetch time; a snapshot older than thirty minutes is visibly stale. CI has its own scan timestamp and is only attributed to an exact matching head. Missing or approval-blocked workflows are never called green.

Publication to this status site does not approve an upstream contribution. Personal final-head/text approval, licensing requirements, source repairs and CI gates remain separate. The status publisher does not submit PRs, sign agreements or contact maintainers.

## Interface

Search all record fields; filter by lifecycle or actual-upstream/own-fork type; expand a record for its commit, CI, blockers, next action, closure reason, lesson, public human reply and evidence. Use **Closures & lessons** for historical outcomes. Counts are calculated from the snapshot, never hardcoded.

No credentials, API tokens, analytics, external fonts or third-party scripts are used in the browser. Untrusted text uses `textContent`; record links are restricted to HTTPS GitHub URLs.

For local viewing, serve this directory with any static HTTP server. No package installation or build step is needed.
