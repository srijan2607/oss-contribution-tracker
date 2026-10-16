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
