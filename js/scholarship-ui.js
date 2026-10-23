/* Easy CV Builder - Global Scholarship page: list, filters, deadline timeline, CV match.
   Runs in the browser. The CV is read on the device and never uploaded or saved. */
(function () {
  'use strict';
  const $ = function (id) { return document.getElementById(id); };
  const D = window.ECB_SCHOLARSHIPS, E = window.ECB, A = window.ECB_APP;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  const st = { field: 'all', level: 'all', top: false, view: 'cards', file: null, mine: false };
  const LVN = { ug: 'Undergraduate', ms: "Master's", phd: 'PhD' };
  const FN = {}; D.fields.forEach(function (f) { FN[f[0]] = f[1]; });
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmt(iso) { const p = iso.split('-'); return +p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0]; }
  function dayDiff(iso) { const p = iso.split('-'), t = new Date(); const a = Date.UTC(+p[0], +p[1] - 1, +p[2]), b = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()); return Math.round((a - b) / 86400000); }
  function status(s) {
    const d = s.due;
    if (d.date) {
      const n = dayDiff(d.date);
      if (n < 0) return { cls: 'closed', label: 'Closed. Next round expected ' + (d.next || 'next year (not announced yet)') };
      if (n === 0) return { cls: 'soon', label: 'Closes today' };
      if (n <= 30) return { cls: 'soon', label: 'Closes in ' + n + ' day' + (n > 1 ? 's' : '') };
      return { cls: 'open', label: 'Opens/closes ' + fmt(d.date) };
    }
    return d.v ? { cls: 'info', label: 'See official page' } : { cls: 'usual', label: 'Usual timing' };
  }

  /* ---------- filters ---------- */
  function matches(s) {
    if (st.top && s.prestige !== 1) return false;
    if (st.level !== 'all' && s.lv.indexOf(st.level) < 0) return false;
    if (st.field !== 'all' && s.fl.indexOf('any') < 0 && s.fl.indexOf(st.field) < 0) return false;
    return true;
  }
  function pills() {
    $('scFields').innerHTML = D.fields.map(function (f) { return '<button type="button" role="tab" data-f="' + f[0] + '" class="' + (st.field === f[0] ? 'on' : '') + '">' + esc(f[1]) + '</button>'; }).join('');
    $('scLevels').innerHTML = D.levels.map(function (f) { return '<button type="button" role="tab" data-l="' + f[0] + '" class="' + (st.level === f[0] ? 'on' : '') + '">' + esc(f[1]) + '</button>'; }).join('');
    $('scView').querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === st.view); });
  }

  /* ---------- cards ---------- */
  function badge(s) { return s.prestige === 1 ? '<span class="bdg gold">Most prestigious</span>' : s.prestige === 2 ? '<span class="bdg">Famous</span>' : ''; }
  function cal(s) {
    if (!s.due.date || dayDiff(s.due.date) < 0) return '';
    return '<button type="button" class="calbtn" data-cal="' + esc(s.id) + '">Add to calendar</button>';
  }
  function card(s) {
    const sx = status(s);
    return '<article class="sch"><header><h3>' + esc(s.name) + '</h3>' + badge(s) + '</header>' +
      '<p class="where">' + esc(s.where) + '</p>' +
      '<p class="chips2">' + s.lv.map(function (l) { return '<span>' + LVN[l] + '</span>'; }).join('') + (s.fl[0] === 'any' ? '<span>Any field</span>' : s.fl.slice(0, 4).map(function (f) { return '<span>' + esc(FN[f]) + '</span>'; }).join('')) + '</p>' +
      '<p class="cover">' + esc(s.cover) + '</p>' +
      '<div class="due ' + sx.cls + '"><strong>' + esc(sx.label) + '</strong><span>' + esc(s.due.text) + '</span>' +
      (s.due.v ? '<em>' + (s.due.src === 'news' ? 'Reported by a news source on ' + fmt(D.checked) + '. Confirm on the official site' : 'Read from the official site on ' + fmt(D.checked)) + '</em>' : '') + '</div>' +
      (s.official.length ? '<h4>From the official page</h4><ul class="ok">' + s.official.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      (s.usual.length ? '<h4>Usually asked (confirm on the official page)</h4><ul>' + s.usual.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="cobtn">' + cal(s) + '<a href="' + esc(s.site) + '" target="_blank" rel="noopener noreferrer">Official site &#8599;</a><a class="pri" href="' + esc(s.dl) + '" target="_blank" rel="noopener noreferrer">Deadlines &amp; apply &#8599;</a></div></article>';
  }
  function timeline(list) {
    const dated = list.filter(function (s) { return s.due.date; }).sort(function (a, b) { const ca = dayDiff(a.due.date) < 0 ? 1 : 0, cb = dayDiff(b.due.date) < 0 ? 1 : 0; if (ca !== cb) return ca - cb; return a.due.date < b.due.date ? -1 : 1; });
    const set = list.filter(function (s) { return !s.due.date && s.due.v; });
    const usual = list.filter(function (s) { return !s.due.date && !s.due.v; });
    function row(s, dateHTML) {
      const sx = status(s);
      return '<li class="tl ' + sx.cls + '"><div class="tld">' + dateHTML + '</div><div class="tlb"><strong>' + esc(s.name) + '</strong> <small>' + esc(s.where) + '</small><p>' + esc(s.due.text) + '</p>' + (sx.cls === 'closed' ? '<p><strong>' + esc(sx.label) + '</strong></p>' : '') +
        '<a href="' + esc(s.dl) + '" target="_blank" rel="noopener noreferrer">Open the official page &#8599;</a></div></li>';
    }
    let h = '<div class="fc"><div class="fb open"><h2 class="h2">Dates found for each scholarship</h2><p class="hint">Checked on ' + fmt(D.checked) + '. Closed rounds are at the bottom. Dates change every year; confirm on each official site.</p><ul class="tll">' +
      (dated.length ? dated.map(function (s) { const p = s.due.date.split('-'); return row(s, '<b>' + (+p[2]) + '</b><i>' + MON[+p[1] - 1] + ' ' + p[0] + '</i>'); }).join('') : '<li class="hint">None in this filter.</li>') + '</ul></div></div>';
    h += '<div class="fc"><div class="fb open"><h2 class="h2">Date set by your country or by the programme</h2><p class="hint">The official site says to check the page for your country or course.</p><ul class="tll">' +
      (set.length ? set.map(function (s) { return row(s, '<i>Check</i>'); }).join('') : '<li class="hint">None in this filter.</li>') + '</ul></div></div>';
    h += '<div class="fc"><div class="fb open"><h2 class="h2">Usual timing (not confirmed)</h2><p class="hint">General timing from past years. Open the official page for this year\'s date.</p><ul class="tll">' +
      (usual.length ? usual.map(function (s) { return row(s, '<i>Usual</i>'); }).join('') : '<li class="hint">None in this filter.</li>') + '</ul></div></div>';
    return h;
  }
  function render() {
    pills();
    $('scNote').innerHTML = 'Deadlines marked &ldquo;read from the official site&rdquo; were checked on <strong>' + fmt(D.checked) + '</strong>. Other timing is the usual pattern, so confirm it on the official page. Rules change every year.';
    const age = -dayDiff(D.checked);
    $('scNote').innerHTML += age > 60 ? ' <strong class="stale">These dates were checked ' + age + ' days ago and may be out of date. Please verify on each official site.</strong>' : '';
    const list = D.list.filter(matches);
    if (!list.length) { $('scList').innerHTML = '<p class="hint">No scholarship matches these filters. Try &ldquo;All fields&rdquo; or &ldquo;All levels&rdquo;.</p>'; return; }
    $('scList').innerHTML = st.view === 'timeline' ? timeline(list)
      : '<p class="hint">' + list.length + ' scholarship' + (list.length > 1 ? 's' : '') + '</p><div class="sgrid">' + list.sort(function (a, b) { return (a.prestige || 3) - (b.prestige || 3); }).map(card).join('') + '</div>';
  }
  $('scFields').addEventListener('click', function (e) { const b = e.target.closest('button[data-f]'); if (b) { st.field = b.dataset.f; render(); } });
  $('scLevels').addEventListener('click', function (e) { const b = e.target.closest('button[data-l]'); if (b) { st.level = b.dataset.l; render(); } });
  $('scView').addEventListener('click', function (e) { const b = e.target.closest('button[data-v]'); if (b) { st.view = b.dataset.v; render(); } });
  $('scTop').addEventListener('change', function () { st.top = this.checked; render(); });

  /* ---------- CV match ---------- */
  const FIELD_RE = {
    eng: /engineer|electrical|electronic|\beee\b|\bece\b|mechanical|civil|computer science|\bcse\b|software|circuit|power system|vlsi|embedded|telecommunication|robotics|matlab|autocad|\bict\b|chemical|\bite\b/g,
    sci: /physics|chemistry|mathematic|statistic|biology|biotech|microbiology|geolog|data science|biochemistry/g,
    bus: /business|\bbba\b|\bmba\b|finance|accounting|marketing|economics|banking|supply chain/g,
    soc: /\blaw\b|\bllb\b|sociology|political|history|literature|journalism|anthropology|international relations|psychology|linguistics/g,
    health: /medicine|\bmbbs\b|nursing|pharmacy|public health|dental|nutrition|biomedical|clinical/g,
    dev: /development studies|public policy|\bngo\b|governance|sustainab|climate|poverty|humanitarian|livelihood/g
  };
  function monthsOf(text) {
    const re = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(?:19|20)\d{2}|present|current|now)/ig;
    const edu = /universit|college|bachelor|b\.?sc|m\.?sc|degree|school|hsc|ssc|cgpa|gpa|thesis|club|president|secretary|committee|volunteer|member|society|captain/i;
    let tot = 0;
    text.split('\n').forEach(function (line) {
      if (edu.test(line)) return;
      let m; re.lastIndex = 0;
      while ((m = re.exec(line))) {
        const a = parse(m[1]), b = /present|current|now/i.test(m[2]) ? new Date() : parse(m[2]);
        if (a && b && b >= a) tot += Math.min(120, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1);
      }
    });
    return tot;
  }
  function parse(s) {
    const m = String(s).match(/([a-z]{3})[a-z]*\.?\s*((?:19|20)\d{2})/i); if (!m) return null;
    return new Date(+m[2], MON.map(function (x) { return x.toLowerCase(); }).indexOf(m[1].toLowerCase()), 1);
  }
  function signals(lines) {
    const text = lines.join('\n'), low = text.toLowerCase();
    const sig = { field: 'any', fieldName: '', cgpa: null, pct: null, test: '', ielts: null, months: monthsOf(text) };
    let best = 0;
    Object.keys(FIELD_RE).forEach(function (k) { const n = (low.match(FIELD_RE[k]) || []).length; if (n > best) { best = n; sig.field = k; } });
    if (best >= 2) sig.fieldName = FN[sig.field]; else sig.field = 'any';
    const g = text.match(/(?:cgpa|gpa|grade point average)[^0-9\n]{0,14}(\d(?:\.\d{1,2})?)\s*(?:\/|out of|of)?\s*(\d(?:\.\d+)?)?/i);
    if (g && +g[1] > 0) {
      let v = +g[1], sc = g[2] ? +g[2] : (v > 4.3 ? 5 : 4);
      if (sc >= v && sc <= 10) { sig.cgpa = v + ' / ' + sc; sig.pct = v / sc; }
    }
    const ie = text.match(/ielts[^0-9\n]{0,14}(\d(?:\.\d)?)/i), tf = text.match(/toefl[^0-9\n]{0,14}(\d{2,3})/i);
    if (ie && +ie[1] > 0) { sig.test = 'IELTS ' + ie[1]; sig.ielts = +ie[1]; }
    else if (tf && +tf[1] > 0) { sig.test = 'TOEFL ' + tf[1]; sig.ielts = +tf[1] >= 90 ? 7 : +tf[1] >= 79 ? 6.5 : 6; }
    else if (/duolingo|\bpte\b|gre\b|gmat/i.test(text)) { sig.test = 'English or entrance test mentioned'; sig.ielts = 6.5; }
    sig.res = /research|thesis|publication|journal|conference|\bieee\b|laboratory|\blab\b/i.test(text);
    sig.pubs = /publication|published|journal|conference paper|\bieee\b|proceedings/i.test(text);
    sig.lead = /president|secretary|founder|captain|\bleader\b|led a|organi[sz]er|coordinator|mentor|volunteer|committee|\bclub\b/i.test(text);
    sig.awards = /award|scholarship|dean'?s list|medal|\brank|honou?rs?\b|prize/i.test(text);
    return sig;
  }
  function score(s, sig, level) {
    const w = s.want || {}, up = [], gap = [];
    let n = 28;
    if (s.fl.indexOf('any') >= 0) n += 6;
    else if (s.fl.indexOf(sig.field) >= 0) { n += 18; up.push('Your field (' + sig.fieldName + ') fits this scholarship.'); }
    else { n -= 14; gap.push('This scholarship focuses on other fields than the one found in your CV.'); }
    if (w.gpa) {
      if (sig.pct == null) gap.push('No CGPA was found. Add it clearly in Education.');
      else if (sig.pct >= 0.875) { n += w.gpa === 'high' ? 16 : 10; up.push('Your CGPA (' + sig.cgpa + ') looks strong.'); }
      else if (sig.pct >= 0.75) { n += w.gpa === 'high' ? 8 : 10; up.push('Your CGPA (' + sig.cgpa + ') is decent.'); if (w.gpa === 'high') gap.push('Top awards usually go to a very high CGPA or class rank.'); }
      else { n -= 8; gap.push('Your CGPA (' + sig.cgpa + ') may be low for this one. Strong research, work or leadership can help.'); }
    }
    if (w.exp) {
      if (sig.months >= 24) { n += 11; up.push('You show about ' + Math.round(sig.months / 12 * 10) / 10 + ' years of experience.'); }
      else if (sig.months >= 6) { n += 6; gap.push('This usually asks for about 2 or more years of work experience.'); }
      else { n -= 10; gap.push('Work experience is usually expected. Add jobs, internships or long projects with dates.'); }
    }
    if (w.res) {
      if (sig.pubs) { n += 9; up.push('Publications or papers help here.'); }
      else if (sig.res) { n += 5; up.push('You show research work.'); gap.push('A paper or conference presentation would strengthen this.'); }
      else if (level !== 'ug') { n -= 5; gap.push('Add research, thesis or lab work.'); }
    }
    if (w.lead) {
      if (sig.lead) { n += 7; up.push('Leadership or volunteering is visible.'); }
      else { n -= 5; gap.push('Show leadership: clubs, teams, volunteering, organising events.'); }
    }
    if (w.eng) {
      if (sig.ielts && sig.ielts >= 6.5) { n += 5; up.push('An English or entrance test is shown (' + sig.test + ').'); }
      else if (sig.test) { n += 3; gap.push('Aim for IELTS 6.5 or higher.'); }
      else gap.push('Add an IELTS, TOEFL or similar score (or plan to take it).');
    }
    if (sig.awards) n += 3;
    if (s.prestige === 1) { n -= 12; gap.push('Very competitive. Many strong applicants apply for each place.'); }
    else if (s.prestige === 2) n -= 4;
    n = Math.max(5, Math.min(90, Math.round(n)));
    return { s: s, n: n, label: n >= 70 ? 'Strong fit' : n >= 50 ? 'Possible' : 'Stretch', up: up, gap: gap };
  }
  function matchCard(r) {
    const sx = status(r.s);
    return '<article class="mc ' + (r.n >= 70 ? 'good' : r.n >= 50 ? 'mid' : 'low') + '"><div class="mcs"><b>' + r.n + '</b><span>' + r.label + '</span></div><div class="mcb"><h3>' + esc(r.s.name) + ' <small>' + esc(r.s.where) + '</small></h3>' +
      '<p class="due-line ' + sx.cls + '">' + esc(sx.label) + (r.s.due.v && r.s.due.date ? '' : '') + '</p>' +
      (r.up.length ? '<ul class="ok">' + r.up.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      (r.gap.length ? '<ul class="gap">' + r.gap.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      '<a href="' + esc(r.s.dl) + '" target="_blank" rel="noopener noreferrer">Deadlines &amp; apply &#8599;</a></div></article>';
  }
  function haveMine() { return !!(window.ECB_CHECK && window.ECB_CHECK.haveMine()); }
  function sync() { $('scMine').hidden = !haveMine(); }
  $('scCV').addEventListener('change', function (e) { st.file = e.target.files[0] || null; st.mine = false; $('scMine').classList.remove('on'); $('scMsg').textContent = st.file ? 'Selected: ' + st.file.name : ''; });
  $('scMine').addEventListener('click', function () {
    st.mine = !st.mine; this.classList.toggle('on', st.mine);
    if (st.mine) { st.file = null; $('scCV').value = ''; $('scMsg').textContent = 'Using the CV you are building.'; } else $('scMsg').textContent = '';
  });
  $('scGo').addEventListener('click', async function () {
    const btn = this;
    if (!st.mine && !st.file) { $('scMsg').textContent = 'Please upload your CV first.'; return; }
    btn.disabled = true; btn.textContent = 'Checking...';
    try {
      const lines = st.mine ? window.ECB_CHECK.flattenDoc(A.state.doc) : await E.readLines(st.file);
      const level = $('scLevel').value, sig = signals(lines);
      const res = D.list.filter(function (s) { return s.lv.indexOf(level) >= 0; }).map(function (s) { return score(s, sig, level); }).sort(function (a, b) { return b.n - a.n; });
      const prof = [
        'Field: ' + (sig.fieldName || 'not clear'), 'Level: ' + LVN[level], 'CGPA: ' + (sig.cgpa || 'not found'),
        'English test: ' + (sig.test || 'not found'), 'Experience: ' + (sig.months ? 'about ' + Math.round(sig.months / 12 * 10) / 10 + ' years' : 'not found'),
        'Research: ' + (sig.pubs ? 'publications found' : sig.res ? 'yes' : 'not found'), 'Leadership: ' + (sig.lead ? 'yes' : 'not found')];
      $('scResult').innerHTML = '<h3 class="h3b">What we read from your CV</h3><p class="chips2 prof">' + prof.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</p>' +
        '<p class="hint">If something is wrong, fix it in your CV (for example write &ldquo;CGPA: 3.60 / 4.00&rdquo; and &ldquo;IELTS: 7.0&rdquo;) and try again.</p>' +
        '<h3 class="h3b">Likely matches</h3><div class="mlist">' + res.slice(0, 8).map(matchCard).join('') + '</div>' +
        '<p class="note left">This is a rough guide that compares keywords and numbers in your CV with what each scholarship usually asks for. Real selection also depends on essays, references, interviews and the year&rsquo;s competition. A low score does not mean you cannot win.</p>';
      $('scResult').hidden = false; $('scMsg').textContent = '';
      $('scResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) { $('scMsg').textContent = (err && err.message) || 'We could not read that file.'; }
    btn.disabled = false; btn.textContent = 'Find my matches';
  });

  window.addEventListener('hashchange', function () { if (location.hash.indexOf('#/scholarships') === 0) { sync(); render(); } });
  sync(); render();
})();

(function () {
  const D = window.ECB_SCHOLARSHIPS, list = document.getElementById('scList');
  if (!list || !D) return;
  list.addEventListener('click', function (e) {
    const b = e.target.closest('button[data-cal]'); if (!b) return;
    const s = D.list.filter(function (x) { return x.id === b.dataset.cal; })[0]; if (!s) return;
    const d = s.due.date.replace(/-/g, '');
    const t = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8) + 1)).toISOString().slice(0, 10).replace(/-/g, '');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Easy CV Builder//EN', 'BEGIN:VEVENT', 'UID:' + s.id + '-' + d + '@easycvbuilder', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + t, 'SUMMARY:' + s.name.replace(/[,;]/g, ' ') + ' deadline (confirm on official site)', 'DESCRIPTION:' + s.dl, 'BEGIN:VALARM', 'TRIGGER:-P14D', 'ACTION:DISPLAY', 'DESCRIPTION:Scholarship deadline in 2 weeks', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = s.id + '-deadline.ics';
    document.body.appendChild(a); a.click(); a.remove();
  });
})();
