/* Graduate schools page: requirements + professors sorted by your interests. Runs in the browser; nothing is sent anywhere. */
(function () {
  'use strict';
  var D = window.ECB_UNI, R = window.ECB_RANKS; if (!D || !R) return;
  var root = document.getElementById('uniApp'); if (!root) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var SYN = {
    vlsi: ['vlsi', 'ic', 'integrated circuits', 'circuits', 'cmos', 'asic', 'soc'],
    analog: ['analog', 'mixed-signal', 'adc', 'data converters', 'ic'],
    rf: ['rf', 'mm-wave', 'microwave', 'antennas', 'radar', 'terahertz'],
    wireless: ['wireless', 'communications', 'communication', '5g', 'mimo', 'networking'],
    ml: ['machine learning', 'deep learning', 'ai', 'neural', 'reinforcement learning'],
    ai: ['ai', 'machine learning', 'deep learning', 'neuromorphic'],
    power: ['power', 'power electronics', 'motor drives', 'energy', 'grid', 'converters'],
    signal: ['signal processing', 'dsp', 'image processing', 'speech'],
    photonics: ['photonics', 'optical', 'optics', 'photonic', 'laser', 'optoelectronics'],
    security: ['security', 'trust', 'hardware security', 'obfuscation'],
    embedded: ['embedded', 'fpga', 'reconfigurable', 'edge'],
    biomedical: ['biomedical', 'bioelectronic', 'implants', 'medical', 'neural interfaces', 'healthcare'],
    mems: ['mems', 'nems', 'sensors', 'microsystems'],
    quantum: ['quantum', 'spintronics', 'cryogenic'],
    robotics: ['robotics', 'robot', 'autonomous', 'control'],
    control: ['control', 'systems', 'reinforcement learning', 'autonomous'],
    semiconductor: ['semiconductor', 'devices', 'device physics', 'nanotechnology', '2d materials', 'transistors']
  };
  function terms(q) {
    var words = q.toLowerCase().split(/[,;\n]+|\s+and\s+/).map(function (s) { return s.trim(); }).filter(Boolean), out = [];
    words.forEach(function (w) {
      var parts = w.split(/\s+/);
      out.push({ t: w, w: 2 });
      parts.forEach(function (p) {
        if (p.length < 2) return;
        out.push({ t: p, w: 1 });
        (SYN[p] || []).forEach(function (s) { out.push({ t: s, w: 0.5 }); });
      });
      (SYN[w] || []).forEach(function (s) { out.push({ t: s, w: 0.5 }); });
    });
    return out;
  }
  function has(hay, t) {
    var i = hay.indexOf(t);
    while (i > -1) { var b = i === 0 || /[^a-z0-9]/.test(hay[i - 1]); if (b) return true; i = hay.indexOf(t, i + 1); }
    return false;
  }
  function score(f, ts) {
    if (!ts.length) return 0;
    var h = (f.areas || '').toLowerCase(), s = 0, seen = {};
    ts.forEach(function (x) { if (!seen[x.t] && has(h, x.t)) { seen[x.t] = 1; s += x.w; } });
    return s;
  }
  var st = { dept: 'ece', school: 'all', q: '' };
  root.innerHTML =
    '<div class="uni-warn" role="note"><strong>Please read.</strong> This page is a starting guide made from each department\'s public web pages on <span id="uCh"></span>. Rules, deadlines and professor lists change, and some data may be wrong, missing or out of date. Ranking groups are approximate, based on published graduate rankings, and may be wrong. Only about the top 50 universities of each department are shown. Matching by interest is a rough keyword match. Always confirm on the official page before you apply or email anyone.</div>' +
    '<div class="fc"><div class="fb open"><div class="uni-ctl">' +
    '<label class="fld"><span>Department</span><select id="uDept"></select></label>' +
    '<label class="fld"><span>University</span><select id="uSch"></select></label>' +
    '<label class="fld uni-q"><span>My interest areas (separate with commas)</span><input id="uQ" type="text" placeholder="e.g. analog IC, RF, machine learning" autocomplete="off"></label>' +
    '</div><p class="hint">What you type stays on your device. Professors who match your interests appear first.</p></div></div>' +
    '<div class="fc"><div class="fb open"><h2 class="h2">Which universities fit me?</h2>' +
    '<div class="uni-m">' +
    '<label class="fld"><span>My CGPA</span><span class="u-two"><input id="mG" type="number" step="0.01" min="0" placeholder="3.45"><select id="mS"><option value="4">out of 4.00</option><option value="5">out of 5.00</option><option value="10">out of 10</option></select></span></label>' +
    '<label class="fld"><span>English test</span><span class="u-two"><select id="mT"><option value="ielts">IELTS</option><option value="toefl">TOEFL iBT (old 120 scale)</option><option value="none">Not taken yet</option></select><input id="mE" type="number" step="0.5" min="0" placeholder="7.0"></span></label>' +
    '<label class="fld"><span>GRE Quant (optional)</span><input id="mR" type="number" min="130" max="170" placeholder="165"></label>' +
    '<label class="fld"><span>Applying for</span><select id="mL"><option value="ms">MS</option><option value="phd">PhD</option></select></label>' +
    '<label class="fld"><span>Ranking I want</span><select id="mK"><option value="any">Any</option><option value="top">Top group</option><option value="mid">Upper group</option><option value="safe">Middle group (easier)</option></select></label>' +
    '<div class="sc-mbtns"><button class="btn primary" id="mGo" type="button">Find my universities</button></div></div>' +
    '<p class="hint">Uses the interest areas typed above too. Rough guide only: the "typical" CGPA of each school is my estimate, not an official number. Nothing is sent anywhere.</p>' +
    '<div id="mOut"></div></div></div>' +
    '<div id="uList"></div>';
  document.getElementById('uCh').textContent = D.checked;
  var dSel = document.getElementById('uDept'), sSel = document.getElementById('uSch'), qIn = document.getElementById('uQ'), list = document.getElementById('uList');
  dSel.innerHTML = Object.keys(R.depts).map(function (k) { return '<option value="' + k + '">' + esc(R.depts[k].name) + '</option>'; }).join('');
  function slug(n) { return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function plain(n) { return n.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim(); }
  function grp(g) { return g === 1 ? 'Top group' : g === 2 ? 'Upper group' : g === 3 ? 'Middle group' : 'Outside the top 50'; }
  function estFit(r) { var typ = r === 1 ? 3.75 : r === 2 ? 3.6 : r === 3 ? 3.45 : 3.3; return { typ: typ, min: 3.0, est: true }; }
  function withReq(o) {
    var q = (window.ECB_REQ || []).filter(function (r) { return r.m.test(o.name); })[0];
    if (q) { o.req = q.req; o.reqScope = q.scope; o.src = q.src; o.fit = Object.assign({}, o.fit, q.fit); }
    return o;
  }
  function schools() {
    var dep = R.depts[st.dept], det = st.dept === 'ece' ? D.schools : [], used = {}, out = [];
    dep.list.forEach(function (x) {
      if (x[0] > D.topLimit) return;
      var d = det.filter(function (z) { return z.match && z.match.test(x[2]); })[0];
      if (d) { used[d.id] = 1; out.push(Object.assign({}, d, { rank: x[0], tie: false })); }
      else out.push(withReq({ id: 's-' + slug(plain(x[2])), name: plain(x[2]), short: plain(x[2]), city: x[3], rank: x[0], tie: false, stub: true, faculty: [], fit: estFit(x[0]) }));
    });
    det.forEach(function (d) { if (d.pinned && !used[d.id]) out.push(Object.assign({}, d, { rank: d.pinRank, tie: false })); });
    return out;
  }
  function fillSch() {
    sSel.innerHTML = '<option value="all">All universities</option>' + schools().map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }).join('');
    sSel.value = st.school;
  }
  function reqRow(k, v) { return '<div class="u-r"><dt>' + k + '</dt><dd>' + esc(v) + '</dd></div>'; }
  function scholar(f, s) { return 'https://scholar.google.com/scholar?q=' + encodeURIComponent('author:"' + f.name + '" ' + s.short); }
  function card(s, ts) {
    var r = s.req, fac = s.faculty.map(function (f) { return { f: f, sc: score(f, ts) }; });
    fac.sort(function (a, b) { return b.sc - a.sc || a.f.name.localeCompare(b.f.name); });
    var anyMatch = ts.length && fac.some(function (x) { return x.sc > 0; });
    var h = '<article class="uni-card"><header><div><h2>' + esc(s.name) + '</h2><p class="u-sub">' + esc(s.city) + '</p></div>' +
      '</header>';
    if (s.rank) h += '<p class="u-rank">Probable ranking group: ' + grp(s.rank) + '</p>';
    if (s.stub && s.req) {
      var rr = s.req;
      h += '<details class="u-req" open><summary>Basic requirements (international applicants)</summary><dl>' + reqRow('GPA', rr.gpa) + reqRow('GRE', rr.gre) + reqRow('English', rr.english) + reqRow('Deadline', rr.deadline) + reqRow('Fee', rr.fee) + reqRow('Documents', rr.docs) + reqRow('Funding', rr.funding) +
        '</dl><p class="u-src">Taken from: ' + esc(s.reqScope) + '. Rules can differ for your department. <a target="_blank" rel="noopener" href="' + esc(s.src) + '">Official page</a>. Checked 2026-11-08.</p></details>' +
        '<p class="u-empty">Professor list: not added yet.</p><div class="u-ln"><a target="_blank" rel="noopener" href="https://www.google.com/search?q=' + encodeURIComponent(s.name + ' ' + R.depts[st.dept].name + ' faculty research') + '">Search faculty</a></div></article>';
      return h;
    }
    if (s.stub) {
      var q = s.name + ' ' + R.depts[st.dept].name;
      return h + '<p class="u-empty">Admission requirements and professor list: not added yet for this department.</p><div class="u-ln">' +
        '<a target="_blank" rel="noopener" href="https://www.google.com/search?q=' + encodeURIComponent(q + ' graduate admission requirements') + '">Search admissions</a>' +
        '<a target="_blank" rel="noopener" href="https://www.google.com/search?q=' + encodeURIComponent(q + ' faculty research') + '">Search faculty</a></div></article>';
    }
    h += '<details class="u-req" open><summary>Basic requirements (international applicants)</summary><dl>' +
      reqRow('GPA', r.gpa) + reqRow('GRE', r.gre) + reqRow('English', r.english) + reqRow('Deadline', r.deadline) + reqRow('Fee', r.fee) + reqRow('Documents', r.docs) + reqRow('Funding', r.funding) + reqRow('Note', r.notes) +
      '</dl><p class="u-src">Source: <a target="_blank" rel="noopener" href="' + esc(s.src) + '">official admissions page</a>. Checked ' + esc(D.checked) + '.</p></details>';
    h += '<h3 class="u-fh">Professors' + (s.faculty.length ? ' (' + s.faculty.length + ')' : '') + '</h3>';
    if (!s.faculty.length) {
      h += '<p class="u-empty">Professor list coming soon for this university. ' +
        '<a target="_blank" rel="noopener" href="https://www.google.com/search?q=' + encodeURIComponent(s.name + ' electrical and computer engineering faculty') + '">Search the faculty page</a></p>';
    } else {
      if (ts.length && !anyMatch) h += '<p class="u-empty">No professor here matches those words. Try broader words such as "circuits", "wireless" or "learning".</p>';
      h += '<ul class="u-fac">' + fac.map(function (x) {
        var f = x.f;
        return '<li class="' + (ts.length && !x.sc ? 'dim' : '') + '"><div class="u-fn"><strong>' + esc(f.name) + '</strong>' +
          (x.sc ? '<span class="u-m">match</span>' : '') + '</div><p>' + esc(f.areas) + '</p><div class="u-ln">' +
          (f.url ? '<a target="_blank" rel="noopener" href="' + esc(f.url) + '">Profile: website and email</a>' : '<a target="_blank" rel="noopener" href="https://www.google.com/search?q=' + encodeURIComponent(f.name + ' ' + s.short + ' electrical computer engineering') + '">Find profile (search)</a>') +
          '<a target="_blank" rel="noopener" href="' + esc(scholar(f, s)) + '">Google Scholar search</a></div></li>';
      }).join('') + '</ul>' + (s.facNote ? '<p class="u-warn2">' + esc(s.facNote) + '</p>' : '') + '<p class="u-src">Source: <a target="_blank" rel="noopener" href="' + esc(s.facSrc) + '">department faculty page</a>. Scholar link is a search; check it is the right person.</p>';
    }
    return h + '</article>';
  }
  function render() {
    var ts = terms(st.q), sc = schools().filter(function (s) { return st.school === 'all' || s.id === st.school; });
    list.innerHTML = sc.map(function (s) { return card(s, ts); }).join('');
  }
  dSel.onchange = function () { st.dept = dSel.value; st.school = 'all'; fillSch(); render(); };
  sSel.onchange = function () { st.school = sSel.value; render(); };
  var tm; qIn.oninput = function () { clearTimeout(tm); tm = setTimeout(function () { st.q = qIn.value; render(); }, 150); };
  function num(id) { var v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; }
  function fitOne(s, u, ts) {
    var f = s.fit, why = [], status, pts = 0;
    var typ = f.typ + (u.level === 'phd' ? 0.15 : 0);
    var d = u.gpa - typ;
    if (u.gre != null) d += u.gre >= 167 ? 0.12 : u.gre >= 163 ? 0.06 : u.gre < 155 ? -0.05 : 0;
    var engBad = false, engNote = '';
    if (s.stub && !(s.fit.toefl || s.fit.ielts)) why.push('English minimum: not added yet, check the university page');
    else if (u.test !== 'none' && u.eng != null) {
      var need = u.test === 'ielts' ? f.ielts : f.toefl;
      if (u.eng < need) { engBad = true; engNote = 'Your ' + (u.test === 'ielts' ? 'IELTS' : 'TOEFL') + ' ' + u.eng + ' is below the minimum ' + need + '. Retake before applying.'; }
      else why.push('English meets the minimum (' + need + ')');
    } else why.push('English test not taken yet: you will need ' + f.ielts + ' IELTS or ' + f.toefl + ' TOEFL (unless waived)');
    if (u.gpa < f.min) { status = 'Reach'; why.push('CGPA is below ' + f.min); pts = 0; }
    else if (d >= 0.2) { status = 'Safer'; pts = 3; }
    else if (d >= -0.15) { status = 'Good match'; pts = 2; }
    else if (d >= -0.4) { status = 'Reach'; pts = 1; }
    else { status = 'Long shot'; pts = 0; }
    if (s.rank) why.unshift('Probable ranking group: ' + grp(s.rank));
    why.unshift('Typical admit CGPA about ' + typ.toFixed(2) + (s.stub ? ' (rough estimate from rank band only)' : ' (estimate)'));
    var pm = s.faculty.filter(function (x) { return score(x, ts) > 0; }).length;
    return { s: s, status: status, pts: pts, engBad: engBad, engNote: engNote, why: why, pm: pm };
  }
  function match() {
    var out = document.getElementById('mOut'), g = num('mG');
    if (g == null) { out.innerHTML = '<p class="u-empty">Enter your CGPA first.</p>'; return; }
    var sc = +document.getElementById('mS').value; g = g / sc * 4;
    var u = { gpa: g, test: document.getElementById('mT').value, eng: num('mE'), gre: num('mR'), level: document.getElementById('mL').value };
    var band = document.getElementById('mK').value, ts = terms(qIn.value);
    var rows = schools().map(function (s) { return fitOne(s, u, ts); });
    if (band !== 'any') rows = rows.filter(function (r) { return band === 'top' ? r.s.rank === 1 : band === 'mid' ? r.s.rank === 2 : r.s.rank >= 3; });
    rows.sort(function (a, b) { return (b.pts - a.pts) || (b.pm - a.pm) || (a.s.fit.tier - b.s.fit.tier); });
    out.innerHTML = '<p class="u-src">Your CGPA on a 4.0 scale: ' + g.toFixed(2) + (sc !== 4 ? ' (simple conversion; the real conversion is up to each university)' : '') + '</p>' +
      (rows.length ? rows.map(function (r) {
        return '<div class="u-fit ' + r.status.replace(/\s/g, '').toLowerCase() + '"><div class="u-fh2"><strong>' + esc(r.s.name) + '</strong><span class="u-st">' + r.status + '</span></div>' +
          '<ul>' + r.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' +
          (r.engBad ? '<p class="u-bad">' + esc(r.engNote) + '</p>' : '') +
          (!r.s.faculty.length ? '<p class="u-empty">Professor list not added yet for this university.</p>' : ts.length ? '<p>' + r.pm + ' professor' + (r.pm === 1 ? '' : 's') + ' match your interests.</p>' : '') +
          '<button class="btn small" type="button" data-see="' + r.s.id + '">See professors</button></div>';
      }).join('') : '<p class="u-empty">No university in this group yet. Try "Any".</p>') +
      '<p class="u-src">Ranking groups are approximate.</p><p class="u-src">"Safer", "Good match", "Reach" compare your CGPA (and GRE if given) with an estimated typical admit. Admission also depends on research, letters and your statement.</p>';
  }
  document.getElementById('mGo').onclick = match;
  document.getElementById('mOut').onclick = function (e) {
    var b = e.target.closest('[data-see]'); if (!b) return;
    st.school = b.getAttribute('data-see'); sSel.value = st.school; st.q = qIn.value; render();
    list.scrollIntoView({ behavior: 'smooth' });
  };
  fillSch(); render();
  window.ECB_UNI_TEST = { terms: terms, score: score };
})();
