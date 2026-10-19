'use strict';
(() => {
  const $ = (selector) => document.querySelector(selector);
  const model = { data: null, publicData: null, privateConversations: {}, state: 'open', kind: 'all', view: 'work', query: '', action: false, busy: false, failed: false, open: new Set(), private: false, capability: null, selected: null, submitting: false, privateBusy: false, requests: [], attempt: null };
  const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const text = (value) => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  const date = (value) => { const d = new Date(value); return value && Number.isFinite(d.getTime()) ? d : null; };
  const format = (value) => { const d = date(value); return d ? dateFormat.format(d) : 'Not provided'; };
  function el(tag, className, content) { const n = document.createElement(tag); if (className) n.className = className; if (content != null) n.textContent = text(content); return n; }
  function safeURL(value) {
    if (typeof value !== 'string') return null;
    try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'github.com' && !u.username && !u.password && !u.port ? u.href : null; } catch { return null; }
  }
  function link(label, url, className = '') { const href = safeURL(url); const n = el(href ? 'a' : 'span', className, label); if (href) { n.href = href; n.target = '_blank'; n.rel = 'noopener noreferrer'; } return n; }
  const isUpstreamMerge = r => r.kind === 'upstream' && r.state === 'merged' && r.upstream_merge_verified === true;
  const recent = value => { const d = date(value); const age = d ? Date.now() - d.getTime() : Infinity; return age >= -300000 && age <= 1800000; };
  function conversation(r) {
    const c = r.conversation && typeof r.conversation === 'object' ? r.conversation : {};
    const complete = c.coverage === 'complete' && recent(c.verified_at);
    const status = text(c.status);
    let label = 'Human reply status unknown';
    if (status === 'closed') label = 'Conversation closed';
    else if (complete && (status === 'needs_reply' || c.needs_reply === true)) label = 'Needs your reply';
    else if (complete && status === 'waiting_on_maintainer') label = 'Waiting on maintainer';
    else if (status === 'no_human_reply' && complete) label = 'No human reply verified';
    if (!complete) label += c.coverage === 'stale' || (c.verified_at && !recent(c.verified_at)) ? ' · stale evidence' : ' · coverage incomplete';
    return { c, label, complete, needs: complete && (c.needs_reply === true || status === 'needs_reply') };
  }
  const actionable = (r) => r.state === 'open' && !r.upstream_accepted && Boolean(text(r.blocker).trim());
  function counts(rows) { return rows.reduce((c, r) => { c.all++; if (r.state === 'merged') { if (isUpstreamMerge(r)) { c.merged++; c.upstreamMerged++; } else if (r.kind === 'fork') { c.reviewed++; c.forkMerged++; } } else c[r.state]++; if (actionable(r)) c.action++; return c; }, { all: 0, open: 0, merged: 0, closed: 0, reviewed: 0, action: 0, upstreamMerged: 0, forkMerged: 0 }); }
  function metric(label, value, note, accent) { const n = el('article', 'metric' + (accent ? ' metric-accent' : '')); n.append(el('span', '', label), el('strong', '', value), el('small', '', note)); return n; }
  function renderMetrics() {
    const c = counts(model.data.records);
    const upstream = model.data.records.filter(r => r.kind === 'upstream');
    const engaged = upstream.filter(r => Number(conversation(r).c.human_count) > 0 || conversation(r).c.latest_human).length;
    const pending = upstream.filter(r => conversation(r).needs).length;
    const unknown = upstream.filter(r => !conversation(r).complete).length;
    $('#metrics').replaceChildren(metric('Implementation records', c.all, 'Recorded work; not distinct fixes'), metric('Upstream open', upstream.filter(r => r.state === 'open').length, 'Submitted to actual projects'), metric('Human-engaged upstream', engaged, unknown ? unknown + ' records have incomplete/stale coverage' : 'Verified human evidence, not bots'), metric('Official merges', c.upstreamMerged, 'Actual upstream only; never fork merges', true), metric('Pending replies', pending, 'Upstream PRs flagged; not a bot count'), metric('Fork review history', c.forkMerged, 'Never counted as official merges'));
    $('#needs-count').textContent = model.data.records.filter(r => conversation(r).needs).length;
  }
  function field(container, label, value, fallback) { const row = el('div', 'detail-field'); row.append(el('dt', '', label), el('dd', '', text(value).trim() || fallback || 'Not provided')); container.append(row); }
  function card(r) {
    const article = el('article', 'pr-card');
    const top = el('div', 'card-top');
    const badges = el('div', 'badges');
    badges.append(el('span', 'badge kind-' + r.kind, r.kind === 'upstream' ? '↗ Actual upstream' : '⑂ Own-fork review'), el('span', 'badge state-' + (r.kind === 'fork' && r.state === 'merged' ? 'reviewed' : r.state), r.kind === 'fork' && r.state === 'merged' ? 'Fork review only' : r.state));
    const conv = conversation(r);
    badges.append(el('span', 'badge conversation-badge' + (conv.needs ? ' needs-reply' : ''), conv.label));
    if (r.draft) badges.append(el('span', 'badge draft', 'Draft'));
    top.append(badges, el('span', 'card-number', '#' + text(r.number)));
    const title = el('h3'); title.append(link(r.title || 'Untitled contribution', r.url));
    const meta = el('div', 'card-meta'); meta.append(link(text(r.repo) + '#' + text(r.number), r.url), el('span', '', 'Updated ' + format(r.updated_at)));
    const summary = el('div', 'action-summary');
    summary.append(el('span', 'eyebrow', r.state === 'open' ? 'CURRENT BLOCKER' : 'RECORDED OUTCOME'));
    summary.append(el('p', '', r.state === 'open' ? (text(r.blocker).trim() || 'No specific blocker verified; review status remains unresolved.') : (text(r.close_reason).trim() || 'No outcome explanation recorded.')));
    if (r.state === 'open') { const owner = el('p', 'owner-line'); owner.append(el('strong', '', 'Can unblock: '), link(r.blocker_owner || 'Not verified', r.owner_url)); summary.append(owner, el('p', 'follow-up', r.follow_up_status || 'No verified follow-up recorded.')); }
    const details = el('details', 'card-details');
    const key = text(r.id || r.repo + '#' + r.number); details.open = model.open.has(key);
    details.addEventListener('toggle', () => { if (details.open) model.open.add(key); else model.open.delete(key); });
    const heading = el('summary', '', 'Details, evidence & learning');
    const fields = el('dl', 'detail-grid');
    field(fields, 'Contribution type', r.kind === 'upstream' ? 'Actual upstream contribution' : 'Own-fork review — not upstream acceptance');
    field(fields, 'Status / draft', (r.kind === 'fork' && r.state === 'merged' ? 'Fork review completed — not officially merged' : r.state) + ' / ' + (r.draft ? 'draft' : 'not draft'));
    field(fields, 'Opened', format(r.created_at)); if (r.merged_at) field(fields, r.kind === 'upstream' ? 'Officially merged at' : 'Fork review completed at', format(r.merged_at));
    field(fields, 'Head commit', text(r.head).slice(0, 12)); field(fields, 'CI status', r.ci);
    field(fields, 'CI snapshot time', format(r.ci_verified_at || r.ci_snapshot_at || r.ci_checked_at || model.data.ci_snapshot_at || (model.data.verification || {}).ci_at));
    field(fields, 'Lifecycle snapshot time', format(r.lifecycle_verified_at || r.lifecycle_snapshot_at || model.data.generated_at));
    field(fields, 'Conversation verified at', format(conv.c.verified_at));
    field(fields, 'Conversation coverage', conv.c.coverage || 'Unknown — no verification provided');
    field(fields, 'Last independently verified own reply', format(conv.c.last_our_reply_at));
    field(fields, 'Pending human messages', Number.isInteger(conv.c.pending_count) && conv.c.pending_count >= 0 ? conv.c.pending_count : 'Not established');
    field(fields, 'Blocker', r.blocker, 'No blocker recorded'); field(fields, 'Who can unblock', r.blocker_owner); field(fields, 'Verified follow-up', r.follow_up_status); field(fields, 'Work already recorded', r.completed_actions); if (r.upstream_ci) field(fields, 'Related upstream CI', r.upstream_ci);
    field(fields, 'Closure reason', r.close_reason, r.state === 'open' ? 'Not closed' : 'Not recorded'); if (r.state === 'closed') field(fields, 'Reason confidence', r.close_reason_certainty || 'Not yet audited'); field(fields, 'Lesson', r.lesson, 'No lesson recorded');
    details.append(heading, fields);
    const timeline = el('section', 'conversation-timeline');
    timeline.append(el('h4', '', 'Human conversation & responses'), el('p', 'muted', conv.label + ' · verified ' + format(conv.c.verified_at)));
    if (conv.c.summary) timeline.append(el('p', '', conv.c.summary));
    const events = Array.isArray(conv.c.events) ? conv.c.events.filter(e => e && typeof e === 'object') : [];
    const history = el('ol');
    for (const e of events.slice().sort((a, b) => (date(a.at)?.getTime() || 0) - (date(b.at)?.getTime() || 0))) {
      const item = el('li', e.is_ours ? 'our-response' : 'human-event');
      item.append(el('strong', '', text(e.author) || 'Author not provided'), el('span', 'event-kind', (e.is_ours ? 'Our response' : text(e.kind) || 'Conversation event') + ' · ' + format(e.at)), el('p', '', text(e.body).slice(0, 1800) || 'No body excerpt provided.'), link('Public permalink ↗', e.url)); history.append(item);
    }
    if (!events.length && conv.c.latest_human) {
      const h = conv.c.latest_human; const item = el('li'); item.append(el('strong', '', text(h.author) || 'Author not provided'), el('span', 'event-kind', format(h.at)), el('p', '', text(h.body).slice(0, 1800)), link('Latest human permalink ↗', h.url)); history.append(item);
    }
    if (!history.children.length) history.append(el('li', 'muted', conv.complete && conv.c.status === 'no_human_reply' ? 'No human reply verified in this complete, recent snapshot.' : 'No conversation events available. This does not establish that nobody replied.'));
    timeline.append(history); details.append(timeline);
    const evidence = el('div', 'evidence'); evidence.append(el('span', 'eyebrow', 'EVIDENCE'));
    let links = 0;
    if (safeURL(r.upstream_url)) { evidence.append(link('Upstream context ↗', r.upstream_url)); links++; }
    for (const e of Array.isArray(r.evidence) ? r.evidence : []) { if (e && safeURL(e.url)) { evidence.append(link(text(e.label) || 'GitHub evidence ↗', e.url)); links++; } }
    if (!links) evidence.append(el('span', 'muted', 'No verified GitHub evidence links provided.'));
    details.append(evidence); article.append(top, title, meta, summary);
    if (model.view === 'lessons') { const lesson = el('div', 'lesson-preview'); lesson.append(el('span', 'eyebrow', 'TAKEAWAY'), el('p', '', text(r.lesson).trim() || 'No lesson recorded yet.')); article.append(lesson); }
    const requestButton = el('button', 'request-button', 'Prepare reply / private action');
    requestButton.type = 'button'; requestButton.addEventListener('click', () => openRequest(r));
    article.append(details, requestButton); return article;
  }
  function renderRecords() {
    if (!model.data) return;
    const rows = model.data.records;
    const base = rows.filter(r => (model.kind === 'all' || r.kind === model.kind) && (model.view !== 'lessons' || r.state !== 'open') && (model.view !== 'reply' || conversation(r).needs) && (!model.action || actionable(r)) && (!model.query || JSON.stringify(r).toLocaleLowerCase().includes(model.query)));
    const c = counts(base);
    document.querySelectorAll('[data-state]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.state === model.state)); button.querySelector('span').textContent = c[button.dataset.state]; });
    const visible = base.filter(r => model.state === 'all' || (model.state === 'merged' ? isUpstreamMerge(r) : model.state === 'reviewed' ? r.kind === 'fork' && r.state === 'merged' : r.state === model.state));
    $('#result-count').textContent = visible.length + ' of ' + rows.length + ' contributions' + (model.view === 'lessons' ? ' · closure view' : '');
    const nodes = visible.map(card);
    if (!nodes.length) { const empty = el('div', 'empty'); empty.append(el('span', 'empty-mark', '∅'), el('h3', '', rows.length ? 'No matching field notes.' : 'The ledger is empty.'), el('p', '', rows.length ? 'Try a broader search or clear your filters. Counts above reflect the full snapshot.' : 'The published snapshot contains no contribution records.')); nodes.push(empty); }
    $('#records').replaceChildren(...nodes);
    $('#reset').hidden = !(model.query || model.state !== 'all' || model.kind !== 'all' || model.action || model.view !== 'work');
  }
  function renderActivity() {
    const list = $('#activity'); list.replaceChildren();
    for (const item of model.data.activity || []) { if (!item || typeof item !== 'object') continue; const li = el('li'); const time = el('time', '', format(item.at)); const d = date(item.at); if (d) time.dateTime = d.toISOString(); li.append(time, link(item.text || 'Activity entry', item.url)); list.append(li); }
    if (!list.children.length) list.append(el('li', 'muted', 'No activity entries in this snapshot.'));
  }
  function freshness() {
    const stamp = model.data && date(model.data.generated_at);
    const age = stamp ? Date.now() - stamp.getTime() : Infinity;
    const stale = !stamp || age > 30 * 60 * 1000 || age < -5 * 60 * 1000;
    $('#signal').className = 'signal' + (stale || model.failed ? ' stale' : '');
    $('#freshness').textContent = !model.data ? 'No verified snapshot' : !stamp ? 'Snapshot time unavailable' : age < -5 * 60 * 1000 ? 'Snapshot clock is ahead' : stale ? 'Stale snapshot · over 30 min' : 'Snapshot is recent';
    $('#verified').textContent = stamp ? format(stamp) : 'Not available';
    if (stamp) $('#verified').dateTime = stamp.toISOString(); else $('#verified').removeAttribute('datetime');
    $('#notice').hidden = !(model.data && (stale || model.failed));
    $('#notice').textContent = model.failed ? 'Refresh failed. Showing the last successfully loaded snapshot; its verification time has not changed.' : !stamp ? 'This snapshot has no valid verification timestamp. Freshness cannot be confirmed.' : age < -5 * 60 * 1000 ? 'The snapshot timestamp is in the future. Check the publishing clock; freshness cannot be confirmed.' : 'This snapshot is more than 30 minutes old. Polling this page does not re-verify GitHub; the publisher must update the data.';
  }
  function validate(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.records)) throw new Error('Invalid data envelope');
    for (const r of data.records) { if (!r || typeof r !== 'object' || !['upstream', 'fork'].includes(r.kind) || !['open', 'merged', 'closed'].includes(r.state)) throw new Error('Invalid contribution record'); }
    if (data.activity != null && !Array.isArray(data.activity)) throw new Error('Invalid activity list');
    return data;
  }
  async function refresh() {
    if (model.busy) return;
    model.busy = true; $('#refresh').disabled = true; $('#refresh').classList.add('refreshing'); $('#refresh-status').textContent = 'Checking published snapshot…'; $('#records').setAttribute('aria-busy', 'true');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('./data.json', { cache: 'no-store', signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw new Error('Snapshot unavailable');
      model.publicData = validate(await response.json()); rebuildData(); model.failed = false;
      renderMetrics(); renderRecords(); renderActivity(); renderMerges();
      $('#scope').textContent = (text(model.data.scope).trim() ? text(model.data.scope) + ' · ' : '') + 'Public GitHub data only. Own-fork work is not upstream acceptance.';
      const interval = Number(model.data.refresh_interval_minutes);
      $('#cadence').textContent = 'Page checks every 60 seconds.' + (Number.isFinite(interval) && interval > 0 ? ' Publisher refresh cadence: ' + interval + ' minutes.' : ' Publisher refresh cadence not provided.');
      $('#refresh-status').textContent = 'Snapshot checked ' + dateFormat.format(new Date()) + '. Auto-check every 60s.';
    } catch {
      model.failed = true;
      $('#refresh-status').textContent = 'Could not load the published snapshot. Retry now or wait for the next automatic check.';
      if (!model.data) { const empty = el('div', 'empty error'); empty.append(el('span', 'empty-mark', '!'), el('h3', '', 'The snapshot is unavailable.'), el('p', '', 'No counts or contribution records can be verified. Use Refresh data to retry.')); $('#records').replaceChildren(empty); $('#result-count').textContent = 'Data unavailable'; }
    } finally { clearTimeout(timeout); model.busy = false; $('#refresh').disabled = false; $('#refresh').classList.remove('refreshing'); $('#records').setAttribute('aria-busy', 'false'); freshness(); }
  }
  function renderMerges() {
    // Records are authoritative: tolerate any merged_by_day shape without crediting forks or invented dates.
    const merged = model.data.records.filter(isUpstreamMerge);
    const days = new Map(); let missing = 0;
    for (const r of merged) { const d = date(r.merged_at); if (!d) { missing++; continue; } const day = d.toISOString().slice(0, 10); days.set(day, (days.get(day) || 0) + 1); }
    const list = $('#merge-history'); list.replaceChildren(); let cumulative = 0;
    for (const [day, total] of [...days].sort(([a], [b]) => a.localeCompare(b))) { cumulative += total; const li = el('li'); const t = el('time', '', day + ' UTC'); t.dateTime = day; li.append(t, el('strong', '', total + (total === 1 ? ' merge' : ' merges')), el('span', 'muted', cumulative + ' cumulative dated merges')); list.append(li); }
    if (!days.size) list.append(el('li', 'muted', merged.length ? 'Upstream merges exist, but no valid merged_at dates are available.' : 'No actual upstream merges in this snapshot. No daily success is assumed.'));
    $('#merge-note').textContent = merged.length + ' actual upstream merges in the snapshot. ' + (missing ? missing + ' missing merge dates; not placed on the chart. ' : '') + 'Per-day counts use merged_at (UTC); cumulative totals are separate. Unlisted days are not reported successes.';
  }
  const storageKey = 'oss-dashboard-private-capability';
  let key = '';
  // Epochs fence even promises already resolved when abort/disconnect occurs.
  let privateGeneration = 0, dialogGeneration = 0;
  const privateControllers = new Set();
  const sessionCurrent = generation => generation === privateGeneration;
  const dialogCurrent = (session, dialog) => sessionCurrent(session) && dialog === dialogGeneration;
  function invalidateDialog() {
    dialogGeneration++; model.submitting = false; model.attempt = null;
    $('#copy-text').value = ''; $('#copy-fallback').hidden = true;
    $('#request-feedback').textContent = '';
  }
  function closeRequest() {
    invalidateDialog(); model.selected = null;
    $('#request-instruction').value = ''; $('#request-pr').textContent = ''; $('#request-target').textContent = '';
    if ($('#request-dialog').open) $('#request-dialog').close();
    updateDialog();
  }
  const publicHost = /(^|\.)(github\.io|github\.com)$/.test(location.hostname);
  const privateEligible = !publicHost && (location.protocol === 'https:' || (location.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)));
  function rebuildData() {
    if (!model.publicData) return;
    model.data = JSON.parse(JSON.stringify(model.publicData));
    if (model.private) for (const r of model.data.records) {
      if (model.privateConversations[r.id]) r.conversation = model.privateConversations[r.id];
    }
  }
  function clearPrivate() {
    privateGeneration++;
    for (const controller of privateControllers) controller.abort();
    privateControllers.clear();
    model.privateBusy = false;
    key = ''; model.private = false; model.capability = null; model.requests = [];
    model.privateConversations = {}; rebuildData();
    if (model.data) { renderMetrics(); renderRecords(); }
    closeRequest();
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be blocked. */ }
    $('#private-history').hidden = true; $('#requests-list').replaceChildren(); $('#requests-status').textContent = ''; $('#disconnect').hidden = true;
    $('#companion-status').textContent = 'Read-only mode. Private companion unavailable or disconnected. Copy instructions into main Hermes chat; nothing is sent to GitHub.';
    updateDialog();
  }
  async function api(path, options = {}) {
    if (!privateEligible || !key || !['/api/control', '/api/requests', '/api/conversations'].includes(path)) throw new Error('Private companion unavailable');
    const target = new URL(path, location.origin);
    if (target.origin !== location.origin) throw new Error('Origin mismatch');
    const generation = privateGeneration;
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
    privateControllers.add(controller);
    try {
      const response = await fetch(target.href, { ...options, credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal, headers: { ...options.headers, Authorization: 'Bearer ' + key } });
      if (!sessionCurrent(generation)) throw new Error('Private session changed.');
      if (response.status === 401 || response.status === 403) { if (!options.method || options.method === 'GET') clearPrivate(); }
      if (!response.ok) throw new Error('Private request failed (HTTP ' + response.status + ').');
      const data = await response.json();
      if (!sessionCurrent(generation)) throw new Error('Private session changed.');
      return data;
    } finally { clearTimeout(timer); privateControllers.delete(controller); }
  }
  async function initPrivate() {
    let candidate = '';
    try { const fragment = new URLSearchParams(location.hash.slice(1)); if (fragment.has('key')) { candidate = fragment.get('key') || ''; history.replaceState(null, '', location.pathname + location.search); } } catch { clearPrivate(); return; }
    if (!privateEligible) { clearPrivate(); return; }
    try { key = candidate || sessionStorage.getItem(storageKey) || ''; } catch { key = candidate; }
    const nextKey = key;
    clearPrivate(); key = nextKey;
    if (!key || !/^[a-f0-9]{64}$/.test(key)) { clearPrivate(); return; }
    // A supplied fragment opts in only to this origin. Persist only after capability authentication.
    await refreshPrivate();
  }
  async function refreshPrivate() {
    if (!key || model.privateBusy) return;
    const generation = privateGeneration;
    model.privateBusy = true;
    try {
      const capabilities = await api('/api/control');
      if (!sessionCurrent(generation)) return;
      if (!key || capabilities.enabled !== true || capabilities.mode !== 'drafts_only' || capabilities.outbound_authorized !== false) throw new Error('Unsafe or unsupported companion capabilities.');
      model.capability = capabilities; model.private = true;
      try { sessionStorage.setItem(storageKey, key); } catch { /* Memory-only session still works. */ }
      $('#disconnect').hidden = false; $('#private-history').hidden = false;
      $('#companion-status').textContent = 'Authenticated private companion · drafts and local reminders only. A request is never permission to post.';
      const privateData = await api('/api/conversations');
      if (!sessionCurrent(generation)) return;
      if (!privateData.conversations || typeof privateData.conversations !== 'object' || Array.isArray(privateData.conversations)) throw new Error('Invalid private conversations');
      model.privateConversations = privateData.conversations; rebuildData();
      if (model.data) { renderMetrics(); renderRecords(); }
      updateDialog(); await loadRequests();
    } catch { if (sessionCurrent(generation)) clearPrivate(); }
    finally { if (sessionCurrent(generation)) model.privateBusy = false; }
  }
  async function loadRequests(expectedId, expectedDialog) {
    const generation = privateGeneration;
    const current = () => sessionCurrent(generation) && model.private && (expectedDialog === undefined || expectedDialog === dialogGeneration);
    try {
      const data = await api('/api/requests');
      if (!current()) return false;
      if (!Array.isArray(data.requests)) throw new Error('Invalid private history');
      model.requests = data.requests;
      const list = $('#requests-list'); list.replaceChildren();
      for (const r of [...data.requests].reverse()) {
        if (!r || typeof r !== 'object') continue;
        const li = el('li'); li.append(el('strong', '', text(r.action) + ' · ' + text(r.processing_status || r.status)), el('p', 'muted', text(r.pr_id) + ' · ' + format(r.created_at) + ' · ID ' + text(r.id)), el('p', '', r.instruction || 'No instruction; local reminder action.'));
        if (r.draft) li.append(el('h4', '', 'Private draft — not sent'), el('pre', '', r.draft));
        if (r.result) li.append(el('pre', '', r.result));
        list.append(li);
      }
      if (!list.children.length) list.append(el('li', 'muted', 'No private requests recorded.'));
      $('#requests-status').textContent = 'Authenticated history checked ' + format(new Date()) + '. Refreshes every 60 seconds. Queued is not sent; local applied is not a verified GitHub reply.';
      return !expectedId || data.requests.some(r => r && r.id === expectedId);
    } catch { if (current()) { $('#requests-list').replaceChildren(); $('#requests-status').textContent = 'Private history unavailable. No results can be verified; refresh again later.'; } return false; }
  }
  function targetFor(r) { return safeURL(r.conversation?.latest_human?.url) || safeURL(r.url) || ''; }
  function updateDialog() {
    const action = $('#request-action').value;
    const allowed = model.private && Array.isArray(model.capability?.actions) && model.capability.actions.includes(action);
    const needsText = action.startsWith('draft_');
    $('#request-instruction').required = needsText;
    $('#request-submit').disabled = model.submitting || !allowed || (needsText && !$('#request-instruction').value.trim()) || !model.selected?.id || !targetFor(model.selected);
    $('#request-submit').textContent = model.submitting ? 'Submitting private request…' : !model.private ? 'Private companion unavailable' : !allowed ? 'Action unavailable' : action === 'mark_handled' ? 'Confirm mark handled locally' : action === 'snooze' ? 'Confirm snooze for 1 hour' : 'Queue private draft request';
  }
  function openRequest(r) {
    invalidateDialog();
    model.selected = r; model.attempt = null;
    $('#request-pr').textContent = text(r.repo) + '#' + text(r.number) + ' · ' + text(r.title);
    $('#request-target').textContent = 'Exact target: ' + (targetFor(r) || 'No valid GitHub target provided.');
    $('#request-action').value = 'draft_reply'; $('#request-instruction').value = ''; $('#request-feedback').textContent = ''; $('#copy-fallback').hidden = true;
    updateDialog(); $('#request-dialog').showModal(); $('#request-instruction').focus();
  }
  function instruction() {
    const r = model.selected;
    return ['Private request: ' + $('#request-action').selectedOptions[0].textContent, 'PR: ' + (safeURL(r?.url) || 'Not provided'), 'Exact human target (or PR if none verified): ' + targetFor(r), 'Instruction: ' + ($('#request-instruction').value.trim() || '(No text; explicit local reminder action only.)'), 'Draft only / local reminder only. Do not post to GitHub. Exact final wording and policy approval must be confirmed in main Hermes chat.'].join('\n');
  }
  $('#disconnect').addEventListener('click', clearPrivate);
  $('#request-close').addEventListener('click', closeRequest);
  $('#request-dialog').addEventListener('close', () => { if (!$('#request-dialog').open) closeRequest(); });
  $('#request-dialog').addEventListener('cancel', closeRequest);
  $('#request-action').addEventListener('change', () => { invalidateDialog(); updateDialog(); });
  $('#request-instruction').addEventListener('input', () => { invalidateDialog(); updateDialog(); });
  $('#request-copy').addEventListener('click', async () => {
    const generation = privateGeneration, dialog = dialogGeneration;
    const value = instruction(); $('#copy-fallback').hidden = true;
    try { if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(value); if (!dialogCurrent(generation, dialog)) return; $('#request-feedback').textContent = 'Instruction copied. Paste into main Hermes chat; nothing has been queued or sent.'; }
    catch { if (!dialogCurrent(generation, dialog)) return; $('#copy-text').value = value; $('#copy-fallback').hidden = false; $('#copy-text').focus(); $('#copy-text').select(); $('#request-feedback').textContent = 'Not copied. Use the selectable instruction below.'; }
  });
  $('#request-submit').addEventListener('click', async () => {
    updateDialog(); if ($('#request-submit').disabled) return;
    const generation = privateGeneration, dialog = dialogGeneration;
    const payload = { pr_id: model.selected.id, action: $('#request-action').value, instruction: $('#request-instruction').value.trim(), target_url: targetFor(model.selected) };
    const serialized = JSON.stringify(payload);
    if (!model.attempt || model.attempt.body !== serialized) model.attempt = { body: serialized, id: globalThis.crypto?.randomUUID?.() || 'ui-' + Date.now() + '-' + Math.random().toString(36).slice(2) };
    model.submitting = true; updateDialog(); $('#request-feedback').textContent = 'Submitting to this private companion only…';
    try {
      const result = await api('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': model.attempt.id }, body: serialized });
      if (!dialogCurrent(generation, dialog)) return;
      if (!result.request?.id) throw new Error('Companion returned no request identifier.');
      const verified = await loadRequests(result.request.id, dialog);
      if (!dialogCurrent(generation, dialog)) return;
      $('#request-feedback').textContent = 'Request ' + text(result.request.id) + ' · ' + text(result.request.status) + '. ' + (verified ? 'Verified in private history. ' : 'Accepted response received, but history read-back could not verify it. Retry uses the same request ID to avoid duplication. ') + 'Not sent to GitHub; local reminder actions do not prove a human reply.';
    } catch (error) { if (dialogCurrent(generation, dialog)) $('#request-feedback').textContent = text(error.message) + ' Delivery is unconfirmed. No automatic retry; retrying unchanged text is deduplicated. You can copy the instruction instead.'; }
    finally { if (dialogCurrent(generation, dialog)) { model.submitting = false; updateDialog(); } }
  });
  setInterval(() => { if (key) refreshPrivate(); }, 60000);
  $('#search').addEventListener('input', e => { model.query = e.target.value.trim().toLocaleLowerCase(); renderRecords(); });
  $('#kind').addEventListener('change', e => { model.kind = e.target.value; renderRecords(); });
  $('#action').addEventListener('change', e => { model.action = e.target.checked; renderRecords(); });
  document.querySelectorAll('[data-state]').forEach(b => b.addEventListener('click', () => { model.state = b.dataset.state; renderRecords(); }));
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { model.view = b.dataset.view; if (model.view === 'reply' || (model.view === 'lessons' && model.state === 'open')) { model.state = 'all'; model.action = false; $('#action').checked = false; } document.querySelectorAll('[data-view]').forEach(n => n.setAttribute('aria-pressed', String(n === b))); renderRecords(); }));
  $('#reset').addEventListener('click', () => { model.state = 'all'; model.kind = 'all'; model.view = 'work'; model.query = ''; model.action = false; $('#search').value = ''; $('#kind').value = 'all'; $('#action').checked = false; document.querySelectorAll('[data-view]').forEach(n => n.setAttribute('aria-pressed', String(n.dataset.view === 'work'))); renderRecords(); });
  $('#refresh').addEventListener('click', refresh);
  initPrivate();
  refresh(); setInterval(refresh, 60000); setInterval(freshness, 15000);
})();
