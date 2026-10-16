'use strict';
(() => {
  const $ = (selector) => document.querySelector(selector);
  const model = { data: null, state: 'open', kind: 'all', view: 'work', query: '', action: false, busy: false, failed: false, open: new Set() };
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
  const actionable = (r) => r.state === 'open' && Boolean(text(r.blocker).trim() || text(r.next_action).trim());
  function counts(rows) { return rows.reduce((c, r) => { c.all++; c[r.state]++; if (actionable(r)) c.action++; if (r.state === 'merged') c[r.kind + 'Merged']++; return c; }, { all: 0, open: 0, merged: 0, closed: 0, action: 0, upstreamMerged: 0, forkMerged: 0 }); }
  function metric(label, value, note, accent) { const n = el('article', 'metric' + (accent ? ' metric-accent' : '')); n.append(el('span', '', label), el('strong', '', value), el('small', '', note)); return n; }
  function renderMetrics() {
    const c = counts(model.data.records);
    $('#metrics').replaceChildren(metric('Records tracked', c.all, 'All-time public PR history'), metric('Upstream open', model.data.records.filter(r => r.kind === 'upstream' && r.state === 'open').length, 'In the actual repositories', true), metric('Own-fork open', model.data.records.filter(r => r.kind === 'fork' && r.state === 'open').length, 'Review copies, not extra fixes'), metric('Upstream merged', c.upstreamMerged, 'All time; ' + Number(model.data.recent_upstream_merges || 0) + ' in last 7 days'), metric('Own-fork merged', c.forkMerged, 'Not upstream acceptance'), metric('Closed, not merged', c.closed, 'All-time decisions & lessons'));
  }
  function field(container, label, value, fallback) { const row = el('div', 'detail-field'); row.append(el('dt', '', label), el('dd', '', text(value).trim() || fallback || 'Not provided')); container.append(row); }
  function card(r) {
    const article = el('article', 'pr-card');
    const top = el('div', 'card-top');
    const badges = el('div', 'badges');
    badges.append(el('span', 'badge kind-' + r.kind, r.kind === 'upstream' ? '↗ Actual upstream' : '⑂ Own-fork review'), el('span', 'badge state-' + r.state, r.state));
    if (r.draft) badges.append(el('span', 'badge draft', 'Draft'));
    top.append(badges, el('span', 'card-number', '#' + text(r.number)));
    const title = el('h3'); title.append(link(r.title || 'Untitled contribution', r.url));
    const meta = el('div', 'card-meta'); meta.append(link(text(r.repo) + '#' + text(r.number), r.url), el('span', '', 'Updated ' + format(r.updated_at)));
    const summary = el('div', 'action-summary');
    summary.append(el('span', 'eyebrow', r.state === 'open' ? 'NEXT MOVE' : 'OUTCOME'));
    summary.append(el('p', '', r.state === 'open' ? (text(r.next_action).trim() || (r.blocker ? 'Blocked: ' + text(r.blocker) : 'No next action recorded.')) : (text(r.close_reason).trim() || (r.state === 'merged' ? 'Merged. No additional outcome recorded.' : 'No closure reason recorded.'))));
    const details = el('details', 'card-details');
    const key = text(r.id || r.repo + '#' + r.number); details.open = model.open.has(key);
    details.addEventListener('toggle', () => { if (details.open) model.open.add(key); else model.open.delete(key); });
    const heading = el('summary', '', 'Details, evidence & learning');
    const fields = el('dl', 'detail-grid');
    field(fields, 'Contribution type', r.kind === 'upstream' ? 'Actual upstream contribution' : 'Own-fork review — not upstream acceptance');
    field(fields, 'Status / draft', r.state + ' / ' + (r.draft ? 'draft' : 'not draft'));
    field(fields, 'Opened', format(r.created_at)); if (r.merged_at) field(fields, 'Merged at', format(r.merged_at));
    field(fields, 'Head commit', text(r.head).slice(0, 12)); field(fields, 'CI status', r.ci);
    field(fields, 'Blocker', r.blocker, 'No blocker recorded'); field(fields, 'Next action', r.next_action);
    field(fields, 'Closure reason', r.close_reason, r.state === 'open' ? 'Not closed' : 'Not recorded'); field(fields, 'Lesson', r.lesson, 'No lesson recorded');
    details.append(heading, fields);
    if (r.human_reply) { const reply = el('section', 'human-reply'); reply.append(el('h4', '', 'Latest human reply'), el('blockquote', '', r.human_reply)); details.append(reply); }
    const evidence = el('div', 'evidence'); evidence.append(el('span', 'eyebrow', 'EVIDENCE'));
    let links = 0;
    if (safeURL(r.upstream_url)) { evidence.append(link('Upstream context ↗', r.upstream_url)); links++; }
    for (const e of Array.isArray(r.evidence) ? r.evidence : []) { if (e && safeURL(e.url)) { evidence.append(link(text(e.label) || 'GitHub evidence ↗', e.url)); links++; } }
    if (!links) evidence.append(el('span', 'muted', 'No verified GitHub evidence links provided.'));
    details.append(evidence); article.append(top, title, meta, summary);
    if (model.view === 'lessons') { const lesson = el('div', 'lesson-preview'); lesson.append(el('span', 'eyebrow', 'TAKEAWAY'), el('p', '', text(r.lesson).trim() || 'No lesson recorded yet.')); article.append(lesson); }
    article.append(details); return article;
  }
  function renderRecords() {
    if (!model.data) return;
    const rows = model.data.records;
    const base = rows.filter(r => (model.kind === 'all' || r.kind === model.kind) && (model.view !== 'lessons' || r.state !== 'open') && (!model.action || actionable(r)) && (!model.query || JSON.stringify(r).toLocaleLowerCase().includes(model.query)));
    const c = counts(base);
    document.querySelectorAll('[data-state]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.state === model.state)); button.querySelector('span').textContent = c[button.dataset.state]; });
    const visible = base.filter(r => model.state === 'all' || r.state === model.state);
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
      model.data = validate(await response.json()); model.failed = false;
      renderMetrics(); renderRecords(); renderActivity();
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
  $('#search').addEventListener('input', e => { model.query = e.target.value.trim().toLocaleLowerCase(); renderRecords(); });
  $('#kind').addEventListener('change', e => { model.kind = e.target.value; renderRecords(); });
  $('#action').addEventListener('change', e => { model.action = e.target.checked; renderRecords(); });
  document.querySelectorAll('[data-state]').forEach(b => b.addEventListener('click', () => { model.state = b.dataset.state; renderRecords(); }));
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { model.view = b.dataset.view; document.querySelectorAll('[data-view]').forEach(n => n.setAttribute('aria-pressed', String(n === b))); renderRecords(); }));
  $('#reset').addEventListener('click', () => { model.state = 'all'; model.kind = 'all'; model.view = 'work'; model.query = ''; model.action = false; $('#search').value = ''; $('#kind').value = 'all'; $('#action').checked = false; document.querySelectorAll('[data-view]').forEach(n => n.setAttribute('aria-pressed', String(n.dataset.view === 'work'))); renderRecords(); });
  $('#refresh').addEventListener('click', refresh);
  refresh(); setInterval(refresh, 60000); setInterval(freshness, 15000);
})();
