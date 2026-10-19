# Implemented contribution control room

This page contains recorded implementation work from the current contribution campaign, not the account's unrelated GitHub history or a future roadmap. A record must belong to a project with implementation/publication evidence and this campaign's creation window.

## Official means official

- **Official merges** includes only pull requests merged into the actual upstream repository.
- A merged review PR in the contributor's fork is shown only as **Fork history**, never as an official merge.
- Fork and upstream review copies remain linked. Record counts are not counts of distinct fixes.
- Unrelated older account contributions are excluded rather than credited to this work.

## Implemented but not accepted

Open records show their current verified blocker, who can unblock it, and follow-up that was actually sent. Contributor-owned repairs, personal licensing decisions and final review gates are distinguished from upstream maintainer work. Verified GitHub mentions link to the actual posted comment; a name on this page does not imply that person was notified.

Closed records retain supported reasons, evidence and lessons. Unknown reasons are explicitly marked unknown; closures are not automatically treated as technical rejection.

## Verification and refresh

The page polls its published snapshot every sixty seconds. The independent publisher runs on a ten-minute schedule. Verification time is separate from browser fetch time; stale/error states remain visible. CI is attributed only to matching heads. Missing checks and blocked workflows are not green.

Only sanitized public contribution data is published. No tokens, private project records, analytics, third-party scripts or external fonts are sent to the browser. Untrusted text uses textContent, and record links are restricted to HTTPS GitHub URLs.

The status publisher does not submit upstream patches, sign agreements or contact people. Those remain separate, specifically authorized actions. No package installation or build step is needed to serve this static site.

## Human conversation coverage

Every card shows human-conversation status, verification time and coverage independently of lifecycle and CI snapshots. The Needs your reply view requires fresh, complete captures; counts refer to PRs, not bot comments. Captures become stale after thirty minutes; future-dated or explicitly unknown provenance cannot establish fresh coverage. Missing, partial or stale coverage does not establish silence or consume hourly reminder receipts. Public timelines contain event kinds, authors, dates, review-state labels and GitHub permalinks, not human message text. Only an authenticated private companion can overlay sanitized excerpts. General-comment reply matching is a temporal heuristic, not proof that a response addressed every question. Legacy unstructured `human_reply` is excluded from public data.

Daily acceptance history is derived directly from actual-upstream merged records and valid `merged_at` dates in UTC. It does not depend on the shape of `merged_by_day`. Per-day counts and cumulative dated counts are labeled separately. Missing dates are disclosed, unlisted dates are not successes, and fork merges never contribute, including under filters.

## Public page and private companion

The public GitHub-hosted page remains read-only and never attempts companion authentication. Each PR offers a dialog with Draft a reply, Draft a question, Mark handled and Snooze 1 hour. Without an authenticated companion, submission is disabled; Copy instruction includes the PR URL, exact latest human target (or PR URL if absent), selected action and user instruction. If clipboard access fails, the actual command is shown in a selectable textarea rather than reporting a successful copy.

Open the operator-managed companion on its own origin with an optional `#key=…` capability fragment. Never place a key in a public-page link. The fragment is immediately removed, including on public hosts. Authentication is eligible only on HTTPS origins other than GitHub/GitHub Pages, or HTTP loopback (`localhost`, `127.0.0.1`, `[::1]`). An explicitly supplied, valid 64-character lowercase hex capability is sent only to that exact origin's `/api/control`; it is persisted in origin-scoped sessionStorage only after successful drafts-only capability authentication. No key is embedded in source, data, queries or rendered output. Storage-denied browsers use memory only. Cookies are omitted, redirects rejected, and no external API/auth URL can be configured. Disconnect clears the capability and displayed private history. A nonstandard HTTP remote companion is deliberately unsupported; use HTTPS or loopback.

Authenticated `GET /api/control` must return `enabled:true`, `mode:"drafts_only"`, `outbound_authorized:false` and supported `actions`. The UI then reads `GET /api/requests` and refreshes control/history every sixty seconds. `POST /api/requests` uses exactly `{pr_id,action,instruction,target_url}` and the same-origin bearer authorization. Drafts require nonblank text, reminders require an explicit confirmation click. Each unchanged retry carries a stable Idempotency-Key. Successful submission is read back from authenticated history before reporting verified persistence. History renders status, timestamps, IDs, instructions and optional private draft/result text safely with textContent; it is never loaded without authentication. Unavailable history is explicitly marked, not represented as an empty successful queue.

Queued drafts are **not sent**. Mark handled and snooze are local reminders, **not verified upstream replies**; they do not change public conversation evidence in the browser. No send-to-GitHub control exists. Exact final text and current policy approval remain in main Hermes chat. Server-side project-specific policy errors remain errors, never successful sends.

## Lightweight checks

Run `node --check site/app.js` from the dashboard directory. No frontend dependencies or build step are required. Browser integration should cover a public session with no API requests, authenticated loopback capability/session/fragment handling, private history, all four explicit request actions, clipboard-denied fallback, stale/unknown coverage, upstream-only merge filters, and mobile dialog/filter wrapping. The companion itself queues commands; the separate GPT-6.1-Sol worker prepares private results. Neither component can send a GitHub reply.
