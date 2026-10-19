/* Easy CV Builder - the website: gallery, pop-up preview, form, drafts, downloads, counters */
(function () {
  'use strict';
  const E = window.ECB;
  const $ = function (id) { return document.getElementById(id); };
  const esc = E.esc;

  const state = {
    doc: null, pending: null, filter: 'all', view: 'home', changing: false,
    open: new Set(['person']), dirty: false, savedFile: false, remember: false,
    modalList: [], modalIdx: 0, modalDoc: null, lastFocus: null, showInvalid: false, fit: null
  };

  /* ---------- tiny helpers ---------- */
  function debounce(fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  let toastT;
  function toast(msg, ms) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, ms || 3200);
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  function slug(s) { return String(s || '').trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function getPath(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, path, v) {
    const ks = path.split('.'); const last = ks.pop();
    const t = ks.reduce(function (a, k) { return a[k]; }, o); t[last] = v;
  }
  function secDef(key) { return E.SECTION_DEFS[key] || E.SECTION_DEFS.experience; }
  function labelsOf(key) { const s = state.doc.sections[key]; return (s && s.labels) || secDef(key).labels || E.SECTION_DEFS.experience.labels; }

  /* ---------- counters (Abacus, a free counting service; only an anonymous "add one") ---------- */
  const NS = 'ecb-showrov-2026', BASE = 'https://abacus.jasoncameron.dev';
  async function api(kind, key) {
    try {
      const r = await fetch(BASE + '/' + kind + '/' + NS + '/' + key, { cache: 'no-store' });
      if (r.status === 404) return 0;
      if (!r.ok) return null;
      const j = await r.json();
      return typeof j.value === 'number' ? j.value : null;
    } catch (e) { return null; }
  }
  function showCount(id, v) { $(id).textContent = v == null ? '–' : v.toLocaleString('en-US'); }
  async function initCounters() {
    /* every time the site is opened or refreshed counts as 1 visit */
    showCount('cVisits', await api('hit', 'visits'));
    showCount('cDl', await api('get', 'downloads'));
  }
  async function countDownload() { const v = await api('hit', 'downloads'); if (v != null) showCount('cDl', v); }

  /* ---------- sample documents for the gallery ---------- */
  const sampleCache = {};
  function sampleFor(id) {
    if (sampleCache[id]) return sampleCache[id];
    const d = E.sampleDoc(id); E.applyTemplate(d, id);
    const t = E.tplById(id);
    Object.keys(d.sections).forEach(function (k) { d.sections[k].on = t.on.indexOf(k) >= 0; });
    d.person.showPhoto = !!t.photo; d.person.showPersonal = !!t.personal;
    sampleCache[id] = { doc: d, k: E.fit(d).k };
    return sampleCache[id];
  }
  function pageHTML(doc, k) {
    const t = E.tplById(doc.tpl), pp = E.PAPER[doc.paper] || E.PAPER.A4;
    return '<div class="pg ' + t.kind + '" style="--pw:' + pp.w + ';--ph:' + pp.h + '">' + E.renderCV(doc, k) + '</div>';
  }

  /* ---------- views ---------- */
  function show(view) {
    state.view = view;
    $('viewHome').hidden = view !== 'home';
    $('viewBuilder').hidden = view !== 'builder';
    document.querySelectorAll('.xview').forEach(function (v) { v.hidden = true; });
    window.scrollTo(0, 0);
  }
  const FILTERS = [['all', 'All'], ['undergrad', 'Undergrad'], ['bd', 'Bangladesh'], ['us', 'US internship / graduate'], ['abroad', 'Abroad application & study']];
  function filtered() { return E.TEMPLATES.filter(function (t) { return state.filter === 'all' || t.groups.indexOf(state.filter) >= 0; }); }
  function renderFilters() {
    $('filters').innerHTML = FILTERS.map(function (f) { return '<button type="button" role="tab" data-f="' + f[0] + '" class="' + (state.filter === f[0] ? 'on' : '') + '">' + esc(f[1]) + '</button>'; }).join('');
  }
  function renderGallery() {
    const cur = state.changing && state.doc ? state.doc.tpl : null;
    $('gallery').innerHTML = filtered().map(function (t, i) {
      const s = sampleFor(t.id);
      return '<button class="card" type="button" data-i="' + i + '" aria-label="Preview ' + esc(t.name) + '"><div class="thumb"><div class="pv-scale">' + pageHTML(s.doc, s.k) + '</div></div>' +
        '<div class="nm">' + esc(t.name) + '</div><div class="au">' + esc(t.audience) + '</div><span class="tag">' + (E.PAPER[t.paper].name.split(' ')[0] === 'US' ? 'US Letter' : 'A4') + ' · ' + t.pages + (t.pages === 1 ? ' page' : ' pages max') + '</span>' +
        (cur === t.id ? ' <span class="tag">Current</span>' : '') + '</button>';
    }).join('');
    scaleThumbs();
  }
  function scaleThumbs() {
    document.querySelectorAll('.thumb').forEach(function (th) {
      const sc = th.firstChild, pg = sc.firstChild;
      const pw = pg ? pg.getBoundingClientRect().width / (sc._s || 1) : 794;
      const s = th.clientWidth / (pw || 794);
      sc._s = s; sc.style.transform = 'scale(' + s + ')'; sc.style.width = (pw || 794) + 'px';
    });
  }
  function showHome(changing) {
    state.changing = !!changing;
    const b = $('homeBanner');
    if (state.pending) { b.hidden = false; b.textContent = 'We read your old CV on this device. Choose a template and your details will fill it in.'; }
    else if (state.changing) { b.hidden = false; b.textContent = 'Pick another template. Your details stay as they are.'; }
    else b.hidden = true;
    renderFilters(); renderGallery(); show('home');
  }

  /* ---------- pop-up preview ---------- */
  function openModal(i) {
    state.modalList = filtered(); state.modalIdx = i;
    $('modal').hidden = false; document.body.style.overflow = 'hidden';
    renderModal(); $('mUse').focus();
  }
  function closeModal() { $('modal').hidden = true; document.body.style.overflow = ''; }
  function renderModal() {
    const t = state.modalList[state.modalIdx];
    const s = sampleFor(t.id);
    const d = E.cloneDoc(s.doc);
    d.person.showPhoto = !!t.photo && $('mPhoto').checked;
    state.modalDoc = d;
    $('mPhotoRow').hidden = !t.photo;
    $('mTitle').textContent = t.name;
    $('mAud').textContent = t.audience;
    $('mMeta').textContent = E.PAPER[t.paper].name + ' · ' + (t.pages === 1 ? '1 page recommended' : 'up to 2 pages') + (t.photo ? ' · photo optional' : '');
    const k = E.fit(d).k;
    $('mScale').innerHTML = pageHTML(d, k);
    layoutModal();
  }
  function layoutModal() {
    const st = $('mStage'), pg = $('mScale').firstChild; if (!pg) return;
    const pp = E.PAPER[state.modalDoc.paper] || E.PAPER.A4;
    const aw = st.clientWidth - 28, ah = st.clientHeight - 28;
    const s = Math.min(aw / pp.pw, ah / pp.ph, 1.6);
    $('mScale').style.width = pp.pw + 'px';
    $('mScale').style.transform = 'scale(' + s + ')';
    $('mBox').style.width = (pp.pw * s) + 'px';
    $('mBox').style.height = (Math.max(pg.offsetHeight, pp.ph * 0.2) * s) + 'px';
  }
  function modalStep(n) {
    const L = state.modalList.length;
    state.modalIdx = (state.modalIdx + n + L) % L; renderModal();
  }

  /* ---------- starting a CV ---------- */
  function ensureBlank(doc) {
    Object.keys(doc.sections).forEach(function (k) {
      const s = doc.sections[k];
      if (s.on && ['entry', 'list', 'skills', 'refs'].indexOf(s.kind) >= 0 && (!s.items || !s.items.length)) s.items = [E.newItem(s.kind)];
    });
  }
  function useTemplate(id) {
    closeModal();
    let d;
    if (state.pending) { d = state.pending; state.pending = null; }
    else if (state.changing && state.doc) d = state.doc;
    else d = E.newDoc(id);
    const keepPaper = state.changing && state.doc === d;
    E.applyTemplate(d, id, { keepPaper: false && keepPaper });
    ensureBlank(d);
    state.doc = d; state.changing = false; state.showInvalid = false; banner('');
    if (!state.open.size || !state.open.has('person')) state.open = new Set(['person']);
    state.open.add('sec-education');
    enterBuilder();
  }
  function enterBuilder() {
    show('builder');
    $('tplName').textContent = E.tplById(state.doc.tpl).name;
    $('selPaper').value = state.doc.paper; $('selPages').value = String(state.doc.pages); $('chkFit').checked = !!state.doc.fit;
    $('chkRemember').checked = state.remember;
    renderForm(); renderPreview(); changedSoft();
  }

  /* ---------- form ---------- */
  function fld(label, path, val, o) {
    o = o || {};
    const id = o.id ? ' id="' + o.id + '"' : '';
    const inv = state.showInvalid && o.invalid ? ' invalid' : '';
    return '<label class="fld' + inv + '"><span>' + esc(label) + (o.req ? ' <em>*</em>' : '') + '</span>' +
      (o.area ? '<textarea' + id + ' rows="' + (o.rows || 3) + '" data-path="' + path + '" placeholder="' + esc(o.ph || '') + '">' + esc(val) + '</textarea>'
        : '<input' + id + ' data-path="' + path + '" value="' + esc(val) + '" placeholder="' + esc(o.ph || '') + '"' + (o.type ? ' type="' + o.type + '"' : '') + (o.ac ? ' autocomplete="' + o.ac + '"' : '') + (o.im ? ' inputmode="' + o.im + '"' : '') + (o.dis ? ' disabled' : '') + '>') + '</label>';
  }
  function chkHTML(label, path, checked) {
    return '<label class="chk" style="margin-top:12px"><input type="checkbox" data-path="' + path + '"' + (checked ? ' checked' : '') + '> ' + esc(label) + '</label>';
  }
  function miniBtns(key, i, n, extra) {
    return '<button type="button" class="icon" data-act="item-up" data-key="' + key + '" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + ' title="Move up">↑</button>' +
      '<button type="button" class="icon" data-act="item-down" data-key="' + key + '" data-i="' + i + '"' + (i === n - 1 ? ' disabled' : '') + ' title="Move down">↓</button>' +
      '<button type="button" class="icon" data-act="item-del" data-key="' + key + '" data-i="' + i + '" title="Remove">×</button>';
  }
  const SYMS = ['°', '±', 'Ω', 'α', 'β', 'μ', 'π', 'Δ', '≤', '≥', '×', '≈'];
  function entryForm(key, it, i, n) {
    const L = labelsOf(key), base = 'sections.' + key + '.items.' + i;
    const edu = key === 'education';
    const bl = it.b.map(function (b, bi) {
      return '<div class="brow"><textarea rows="1" data-path="' + base + '.b.' + bi + '" data-grow="1" placeholder="Describe what you did or achieved">' + esc(b) + '</textarea>' +
        '<button type="button" class="icon" data-act="b-del" data-key="' + key + '" data-i="' + i + '" data-bi="' + bi + '" title="Remove point">×</button></div>';
    }).join('');
    return '<div class="entry" data-key="' + key + '" data-i="' + i + '"><div class="eh"><b>Entry ' + (i + 1) + '</b>' + miniBtns(key, i, n) + '</div>' +
      '<div class="grid2">' + fld(L.p, base + '.p', it.p, { req: edu }) + fld(L.s, base + '.s', it.s, { req: edu }) + '</div>' +
      '<div class="grid2">' + fld(L.loc, base + '.loc', it.loc) + fld(L.note, base + '.note', it.note) + '</div>' +
      '<div class="grid2">' + fld(L.ds || 'Start date', base + '.ds', it.ds, { ph: 'e.g. Jan 2023' }) + fld(L.de || 'End date', base + '.de', it.de, { ph: 'e.g. Dec 2024', dis: it.cur }) + '</div>' +
      chkHTML('Present (still ongoing)', base + '.cur', it.cur) +
      '<div class="fmt" aria-label="Formatting for points"><button type="button" data-act="fmt" data-w="**" title="Bold"><b>B</b></button><button type="button" data-act="fmt" data-w="^{" title="Superscript">x²</button><button type="button" data-act="fmt" data-w="_{" title="Subscript">x₂</button>' +
      SYMS.map(function (s) { return '<button type="button" data-act="sym" data-s="' + s + '">' + s + '</button>'; }).join('') + '</div>' +
      bl + '<div class="addrow"><button type="button" class="btn small" data-act="b-add" data-key="' + key + '" data-i="' + i + '">+ Add point</button></div></div>';
  }
  function listForm(key, items) {
    const ph = secDef(key).ph || '';
    return items.map(function (it, i) {
      return '<div class="lrow"><input data-path="sections.' + key + '.items.' + i + '.t" value="' + esc(it.t) + '" placeholder="' + esc(ph) + '">' + miniBtns(key, i, items.length) + '</div>';
    }).join('') + '<div class="addrow"><button type="button" class="btn small" data-act="item-add" data-key="' + key + '">+ Add line</button></div>';
  }
  function skillsForm(key, items) {
    return '<p class="hint">Use "Category" for groups like Programming, with the skills separated by commas. The level bar is shown only in templates that use skill bars (0 = no bar).</p>' +
      items.map(function (it, i) {
        const b = 'sections.' + key + '.items.' + i;
        return '<div class="entry" data-key="' + key + '" data-i="' + i + '"><div class="eh"><b>Skill ' + (i + 1) + '</b>' + miniBtns(key, i, items.length) + '</div>' +
          '<div class="grid2">' + fld('Skill or category', b + '.label', it.label, { ph: 'e.g. Programming' }) + fld('Details (comma separated)', b + '.text', it.text, { ph: 'Python, C++, MATLAB' }) + '</div>' +
          '<div class="lvl">Level <input type="range" min="0" max="100" step="5" data-path="' + b + '.level" value="' + (it.level || 0) + '"> <span>' + (it.level || 0) + '</span></div></div>';
      }).join('') + '<div class="addrow"><button type="button" class="btn small" data-act="item-add" data-key="' + key + '">+ Add skill</button></div>';
  }
  function refsForm(key, items) {
    const sec = state.doc.sections[key];
    return chkHTML('Show "Available on request" instead of names', 'sections.' + key + '.onRequest', sec.onRequest) +
      items.map(function (it, i) {
        const b = 'sections.' + key + '.items.' + i;
        return '<div class="entry" data-key="' + key + '" data-i="' + i + '"><div class="eh"><b>Referee ' + (i + 1) + '</b>' + miniBtns(key, i, items.length) + '</div>' +
          '<div class="grid2">' + fld('Name', b + '.name', it.name) + fld('Title / position', b + '.title', it.title) + '</div>' +
          '<div class="grid2">' + fld('Institution / organization', b + '.org', it.org) + fld('Phone', b + '.phone', it.phone, { type: 'tel' }) + '</div>' +
          fld('Email', b + '.email', it.email, { type: 'email' }) + '</div>';
      }).join('') + '<div class="addrow"><button type="button" class="btn small" data-act="item-add" data-key="' + key + '">+ Add referee</button></div>';
  }
  function secCard(key) {
    const doc = state.doc, sec = doc.sections[key], idx = doc.order.indexOf(key);
    const open = state.open.has('sec-' + key), custom = /^c_/.test(key);
    const n = sec.kind === 'text' ? (E.nonEmpty(sec.text) ? 'filled' : '') : E.usable({ on: true, kind: sec.kind, items: sec.items }).length + ' item' + (E.usable({ on: true, kind: sec.kind, items: sec.items }).length === 1 ? '' : 's');
    const miss = state.showInvalid && key === 'education' && E.missingFields(doc).some(function (m) { return m.id === 'sec-education'; });
    let body = '';
    if (open) {
      body = fld('Section title', 'sections.' + key + '.title', sec.title);
      if (sec.kind === 'text') body += fld('Text', 'sections.' + key + '.text', sec.text, { area: true, rows: 5, ph: secDef(key).ph });
      else if (sec.kind === 'entry') body += sec.items.map(function (it, i) { return entryForm(key, it, i, sec.items.length); }).join('') + '<div class="addrow"><button type="button" class="btn small" data-act="item-add" data-key="' + key + '">+ Add entry</button></div>';
      else if (sec.kind === 'list') body += listForm(key, sec.items);
      else if (sec.kind === 'skills') body += skillsForm(key, sec.items);
      else if (sec.kind === 'refs') body += refsForm(key, sec.items);
      if (custom) body += '<div class="addrow"><button type="button" class="btn small danger" data-act="sec-del" data-key="' + key + '">Delete this section</button></div>';
    }
    return '<div class="fc sec' + (open ? ' open' : '') + (sec.on ? '' : ' off') + (miss ? ' invalid' : '') + '" id="sec-' + key + '" data-key="' + key + '">' +
      '<div class="fh" data-act="toggle" data-id="sec-' + key + '"><span class="chev">▸</span><h3>' + esc(sec.title) + (key === 'education' ? ' <em style="color:#c0392b">*</em>' : '') + '</h3><span class="cnt2">' + n + '</span>' +
      '<button type="button" class="icon" data-act="sec-up" data-key="' + key + '"' + (idx === 0 ? ' disabled' : '') + ' title="Move section up">↑</button>' +
      '<button type="button" class="icon" data-act="sec-down" data-key="' + key + '"' + (idx === doc.order.length - 1 ? ' disabled' : '') + ' title="Move section down">↓</button>' +
      '<label class="sw" title="Show this section in the CV"><input type="checkbox" data-path="sections.' + key + '.on"' + (sec.on ? ' checked' : '') + '><i></i></label></div>' +
      (open ? '<div class="fb">' + body + '</div>' : '') + '</div>';
  }
  function personCard() {
    const p = state.doc.person, open = state.open.has('person');
    const miss = {}; if (state.showInvalid) E.missingFields(state.doc).forEach(function (m) { miss[m.id] = 1; });
    let body = '';
    if (open) {
      body = '<div class="grid2">' + fld('Full name', 'person.name', p.name, { req: true, id: 'f-name', ac: 'name', invalid: miss['f-name'] }) + fld('Job title or field', 'person.title', p.title, { ph: 'e.g. Electrical Engineer' }) + '</div>' +
        '<div class="grid2">' + fld('Email', 'person.email', p.email, { req: true, id: 'f-email', type: 'email', ac: 'email', invalid: miss['f-email'] }) + fld('Phone', 'person.phone', p.phone, { req: true, id: 'f-phone', type: 'tel', ac: 'tel', im: 'tel', invalid: miss['f-phone'] }) + '</div>' +
        fld('City and country', 'person.loc', p.loc, { ph: 'e.g. Dallas, USA' }) +
        fld('Applying for (program or scholarship, optional)', 'person.target', p.target, { ph: 'Shown in the Study-abroad template' }) +
        '<div class="photo-row">' + (p.photo ? '<img class="ph-prev" alt="Your photo" src="' + esc(p.photo) + '">' : '') +
        '<button type="button" class="btn small" data-act="photo-pick">' + (p.photo ? 'Change photo' : 'Add photo (optional)') + '</button>' + (p.photo ? '<button type="button" class="btn small danger" data-act="photo-del">Remove</button>' : '') + '</div>' +
        '<p class="hint">The photo appears in templates that have a photo area. Photos stay on your device.</p>' +
        (p.photo ? chkHTML('Show my photo', 'person.showPhoto', p.showPhoto) + '<br>' + chkHTML('Keep original colors (default is black and white)', 'person.photoColor', p.photoColor) : '') +
        '<div style="margin-top:6px">' + chkHTML('Show personal details (date of birth, nationality, father’s name)', 'person.showPersonal', p.showPersonal) + '</div>' +
        (p.showPersonal ? '<div class="grid2">' + fld('Date of birth', 'person.dob', p.dob, { ph: 'DD Month YYYY' }) + fld('Nationality', 'person.nationality', p.nationality) + '</div>' + fld('Father’s name', 'person.father', p.father) : '');
    }
    return '<div class="fc' + (open ? ' open' : '') + '" id="card-person"><div class="fh" data-act="toggle" data-id="person"><span class="chev">▸</span><h3>Personal details</h3></div>' + (open ? '<div class="fb">' + body + '</div>' : '') + '</div>';
  }
  function linksCard() {
    const p = state.doc.person, open = state.open.has('links');
    let body = '';
    if (open) {
      body = '<datalist id="linkpresets">' + E.LINK_PRESETS.map(function (x) { return '<option value="' + x + '">'; }).join('') + '</datalist>' +
        '<p class="hint">Shown at the top of your CV. Add only the ones you have.</p>' +
        p.links.map(function (l, i) {
          return '<div class="lrow"><input style="width:140px;flex:none" list="linkpresets" data-path="person.links.' + i + '.label" value="' + esc(l.label) + '" placeholder="Label">' +
            '<input data-path="person.links.' + i + '.url" value="' + esc(l.url) + '" placeholder="https://..." inputmode="url" autocapitalize="none">' +
            '<button type="button" class="icon" data-act="link-del" data-i="' + i + '" title="Remove">×</button></div>';
        }).join('') +
        '<div class="addrow">' + E.LINK_PRESETS.map(function (x) { return '<button type="button" class="btn small" data-act="link-add" data-l="' + x + '">+ ' + x + '</button>'; }).join('') + '<button type="button" class="btn small" data-act="link-add" data-l="">+ Other link</button></div>';
    }
    return '<div class="fc' + (open ? ' open' : '') + '" id="card-links"><div class="fh" data-act="toggle" data-id="links"><span class="chev">▸</span><h3>Links</h3><span class="cnt2">' + p.links.filter(function (l) { return E.nonEmpty(l.url); }).length + '</span></div>' + (open ? '<div class="fb">' + body + '</div>' : '') + '</div>';
  }
  function addSectionCard() {
    return '<div class="fc open" id="card-add"><div class="fh"><h3>Add your own section</h3></div><div class="fb"><div class="grid2"><label class="fld"><span>Section title</span><input id="newSecTitle" placeholder="e.g. Languages and Tests"></label>' +
      '<label class="fld"><span>Type</span><select id="newSecKind"><option value="entry">Entries (jobs, projects)</option><option value="list">Bullet list</option><option value="text">Paragraph</option></select></label></div>' +
      '<div class="addrow"><button type="button" class="btn" data-act="custom-add">+ Add section</button></div></div></div>';
  }
  function reqBox() {
    const m = E.missingFields(state.doc);
    return m.length ? '<div class="req-box bad" id="reqBox"><b>Required before download:</b> ' + m.map(function (x) { return esc(x.label); }).join(', ') + '.</div>'
      : '<div class="req-box ok" id="reqBox">All required fields are filled in.</div>';
  }
  function renderForm() {
    const st = $('formcol').scrollTop;
    $('formcol').innerHTML = reqBox() + personCard() + linksCard() + state.doc.order.filter(function (k) { return state.doc.sections[k]; }).map(secCard).join('') + addSectionCard();
    document.querySelectorAll('#formcol textarea[data-grow]').forEach(grow);
    $('formcol').scrollTop = st;
  }
  function grow(el) { el.style.height = 'auto'; el.style.height = Math.max(38, el.scrollHeight + 2) + 'px'; }

  /* ---------- preview ---------- */
  function renderPreview() {
    if (!state.doc) return;
    const d = state.doc, t = E.tplById(d.tpl), pp = E.PAPER[d.paper] || E.PAPER.A4;
    const f = E.fit(d); state.fit = f;
    const sc = $('pvScale');
    sc.innerHTML = pageHTML(d, f.k);
    const pg = sc.firstChild;
    const scroll = $('pvScroll');
    const cs = getComputedStyle(scroll);
    const avail = scroll.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const s = Math.min(1.25, Math.max(0.25, avail / pp.pw));
    sc.style.width = pp.pw + 'px';
    sc.style.transform = 'scale(' + s + ')';
    const H = Math.max(pg.offsetHeight, pp.ph);
    $('pvBox').style.width = (pp.pw * s) + 'px';
    $('pvBox').style.height = (H * s) + 'px';
    sc.querySelectorAll('.pv-guide').forEach(function (g) { g.remove(); });
    if (t.kind === 'flow') {
      const m = E.MARGIN_MM * 3.7795, usable = pp.ph - 2 * m;
      for (let i = 1; i < 6; i++) {
        const y = m + i * usable;
        if (y > H - m / 2) break;
        const g = document.createElement('div'); g.className = 'pv-guide'; g.style.top = y + 'px'; g.innerHTML = '<span>page ' + (i + 1) + ' starts</span>';
        sc.appendChild(g);
      }
    }
    const target = d.pages;
    let msg;
    if (f.over && d.fit) msg = '<span class="bad">Too long for ' + target + (target === 1 ? ' page' : ' pages') + ' even after shrinking (needs ' + f.pages + ').</span> Shorten it, switch some sections off, or choose “Up to 2 pages”.';
    else if (f.over) msg = '<span class="bad">Too long for ' + target + (target === 1 ? ' page' : ' pages') + ' (needs ' + f.pages + ').</span> Shorten it or turn on Auto-fit.';
    else if (f.shrunk) msg = '<span class="ok">Fits on ' + f.pages + (f.pages === 1 ? ' page' : ' pages') + '</span> (text shrunk to ' + Math.round(f.k * 100) + '% to fit).';
    else msg = '<span class="ok">Fits on ' + f.pages + (f.pages === 1 ? ' page' : ' pages') + '.</span>';
    if (f.over && !d.fit) msg = '<span class="warn">Runs to ' + f.pages + ' pages.</span> Turn on Auto-fit to shrink it, or choose “Up to 2 pages”.';
    $('pvStatus').innerHTML = msg + ' <span style="color:#64748b">' + (E.PAPER[d.paper].name) + '</span>';
  }
  const renderPreviewSoon = debounce(renderPreview, 160);

  /* ---------- saving progress ---------- */
  function persist() {
    if (!state.remember || !state.doc) return;
    if (!lsSet('ecb_draft', JSON.stringify(state.doc))) toast('Could not remember your progress on this device. Please use Save draft.');
  }
  const persistSoon = debounce(persist, 400);
  function changed() {
    state.dirty = true; state.savedFile = false;
    persistSoon(); renderPreviewSoon(); refreshReq();
  }
  function changedSoft() { persistSoon(); refreshReq(); }
  function refreshReq() {
    const old = $('reqBox'); if (!old || !state.doc) return;
    const tmp = document.createElement('div'); tmp.innerHTML = reqBox();
    old.className = tmp.firstChild.className; old.innerHTML = tmp.firstChild.innerHTML;
    if (state.showInvalid) {
      const miss = {}; E.missingFields(state.doc).forEach(function (m) { miss[m.id] = 1; });
      ['f-name', 'f-email', 'f-phone'].forEach(function (id) { const el = $(id); if (el) el.parentNode.classList.toggle('invalid', !!miss[id]); });
      const ed = $('sec-education'); if (ed) ed.classList.toggle('invalid', !!miss['sec-education']);
    }
  }
  function migrate(doc) {
    const base = E.newDoc(doc.tpl);
    Object.keys(base.sections).forEach(function (k) { if (!doc.sections[k]) doc.sections[k] = base.sections[k]; if (doc.order.indexOf(k) < 0) doc.order.push(k); });
    doc.person = Object.assign({}, base.person, doc.person);
    doc.touched = Object.assign({ photo: false, personal: false }, doc.touched);
    if (!E.PAPER[doc.paper]) doc.paper = 'A4';
    if (!E.tplById(doc.tpl)) doc.tpl = 't2';
    doc.order = doc.order.filter(function (k) { return doc.sections[k]; });
    return doc;
  }
  function saveDraftFile() {
    if (!state.doc) return;
    const payload = { app: 'easy-cv-builder', version: 1, savedAt: new Date().toISOString(), doc: state.doc };
    download(new Blob([JSON.stringify(payload)], { type: 'application/json' }), (slug(state.doc.person.name) || 'my-cv') + '-draft.json');
    state.savedFile = true; state.dirty = false;
    toast('Draft saved to your device. Use “Open draft” to continue later.');
  }
  function openDraftFile(file) {
    const r = new FileReader();
    r.onload = function () {
      try {
        const j = JSON.parse(r.result);
        if (!j || j.app !== 'easy-cv-builder' || !j.doc || !j.doc.person || !j.doc.sections) throw new Error('bad');
        state.doc = migrate(j.doc); state.pending = null; state.changing = false; state.showInvalid = false;
        state.open = new Set(['person']); state.dirty = false; state.savedFile = true;
        enterBuilder();
        banner('Draft loaded. Pick up where you left off.');
      } catch (e) { toast('That file is not an Easy CV Builder draft.'); }
    };
    r.readAsText(file);
  }
  function banner(msg) { const b = $('builderBanner'); if (!msg) { b.hidden = true; return; } b.hidden = false; b.textContent = msg; }

  /* ---------- importing an old CV ---------- */
  async function importOld(file, intoBuilder) {
    toast('Reading your CV on this device…', 8000);
    try {
      const prev = intoBuilder && state.doc ? state.doc : null;
      const d = await E.importFile(file, E.newDoc());
      d.pending = undefined;
      if (prev) {
        E.applyTemplate(d, prev.tpl); d.paper = prev.paper; d.pages = prev.pages; d.fit = prev.fit;
        ensureBlank(d); state.doc = d; state.showInvalid = false; state.open = new Set(['person', 'sec-education']);
        enterBuilder();
        banner('We read your old CV on this device. Please check every section, because automatic reading is not perfect.');
      } else {
        state.pending = d; state.changing = false; showHome(false);
        $('gallery').scrollIntoView({ behavior: 'smooth' });
      }
      const st = d._importStats || {};
      toast('Done. Found ' + (st.sections || 0) + ' sections. Please check the details.', 4500);
    } catch (e) {
      toast(e && e.message ? e.message : 'Sorry, that file could not be read.', 6000);
    }
  }

  /* ---------- photo ---------- */
  function handlePhoto(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = function () {
      const img = new Image();
      img.onload = function () {
        const max = 520, s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        state.doc.person.photo = c.toDataURL('image/jpeg', 0.86);
        state.doc.person.showPhoto = true; state.doc.touched.photo = true;
        renderForm(); changed();
      };
      img.onerror = function () { toast('That image could not be read.'); };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* ---------- downloads ---------- */
  function validate() {
    const m = E.missingFields(state.doc);
    if (!m.length) return true;
    state.showInvalid = true;
    state.open.add('person'); state.open.add('sec-education');
    if (!state.doc.sections.education.on) state.doc.sections.education.on = true;
    if (!state.doc.sections.education.items.length) state.doc.sections.education.items = [E.newItem('entry')];
    setTab('edit'); renderForm();
    toast('Please fill in: ' + m.map(function (x) { return x.label; }).join(', ') + '.', 5000);
    const first = $(m[0].id);
    if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (first.focus && first.tagName !== 'DIV') setTimeout(function () { first.focus({ preventScroll: true }); }, 350); }
    return false;
  }
  let oldTitle = '';
  async function downloadPDF() {
    if (!validate()) return;
    const d = state.doc, t = E.tplById(d.tpl);
    const f = E.fit(d);
    $('print-root').innerHTML = E.renderCV(d, f.k);
    $('pagestyle').textContent = '@page{size:' + (d.paper === 'Letter' ? 'letter' : 'A4') + ';margin:' + (t.kind === 'fixed' ? '0' : E.MARGIN_MM + 'mm 0') + '}';
    try { await document.fonts.ready; } catch (e) { /* ignore */ }
    oldTitle = document.title;
    document.title = (slug(d.person.name) || 'CV') + '_CV';
    countDownload();
    toast('In the print window, choose “Save as PDF” as the destination.', 6000);
    setTimeout(function () { window.print(); }, 250);
  }
  window.addEventListener('afterprint', function () {
    if (oldTitle) { document.title = oldTitle; oldTitle = ''; }
    $('print-root').innerHTML = '';
  });
  async function downloadDOCX() {
    if (!validate()) return;
    try {
      toast('Preparing your Word file…', 2500);
      const blob = await E.exportDocx(state.doc);
      download(blob, (slug(state.doc.person.name) || 'CV') + '_CV.docx');
      countDownload();
      toast('Word file downloaded. The layout is a close, editable version of the template.', 5000);
    } catch (e) { toast('Sorry, the Word file could not be made. ' + (e && e.message ? e.message : ''), 6000); }
  }

  /* ---------- events: gallery and modal ---------- */
  $('filters').addEventListener('click', function (e) {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    state.filter = b.dataset.f; renderFilters(); renderGallery();
  });
  $('gallery').addEventListener('click', function (e) {
    const c = e.target.closest('.card'); if (c) openModal(+c.dataset.i);
  });
  $('mClose').addEventListener('click', closeModal);
  $('mBackdrop').addEventListener('click', closeModal);
  $('mPrev').addEventListener('click', function () { modalStep(-1); });
  $('mNext').addEventListener('click', function () { modalStep(1); });
  $('mPhoto').addEventListener('change', renderModal);
  $('mUse').addEventListener('click', function () { useTemplate(state.modalList[state.modalIdx].id); });
  document.addEventListener('keydown', function (e) {
    if ($('modal').hidden) return;
    if (e.key === 'Escape') closeModal();
    else if (e.key === 'ArrowLeft') modalStep(-1);
    else if (e.key === 'ArrowRight') modalStep(1);
  });
  (function swipe() {
    let x0 = null, y0 = null; const st = $('mStage');
    st.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    st.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) modalStep(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  /* ---------- events: top-level buttons ---------- */
  $('btnUpload').addEventListener('click', function () { $('fileCV').dataset.into = ''; $('fileCV').click(); });
  $('btnImport').addEventListener('click', function () {
    if (state.dirty && !confirm('Importing replaces what you have entered so far. Continue?')) return;
    $('fileCV').dataset.into = '1'; $('fileCV').click();
  });
  $('fileCV').addEventListener('change', function (e) {
    const f = e.target.files[0]; const into = e.target.dataset.into === '1'; e.target.value = '';
    if (f) importOld(f, into);
  });
  $('btnMore').addEventListener('click', function () { const o = document.body.classList.toggle('moreopen'); this.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  $('btnOpenDraft').addEventListener('click', function () { $('fileDraft').click(); });
  $('btnLoadDraft').addEventListener('click', function () { $('fileDraft').click(); });
  $('fileDraft').addEventListener('change', function (e) { const f = e.target.files[0]; e.target.value = ''; if (f) openDraftFile(f); });
  $('btnSaveDraft').addEventListener('click', saveDraftFile);
  $('btnChange').addEventListener('click', function () { showHome(true); });
  $('btnBack').addEventListener('click', function () { showHome(true); });
  ['btnPDF', 'btnPDF2'].forEach(function (id) { $(id).addEventListener('click', downloadPDF); });
  ['btnDOCX', 'btnDOCX2'].forEach(function (id) { $(id).addEventListener('click', downloadDOCX); });
  $('selPaper').addEventListener('change', function () { state.doc.paper = this.value; changed(); });
  $('selPages').addEventListener('change', function () { state.doc.pages = +this.value; changed(); });
  $('chkFit').addEventListener('change', function () { state.doc.fit = this.checked; changed(); });
  $('chkRemember').addEventListener('change', function () {
    state.remember = this.checked;
    if (this.checked) { lsSet('ecb_remember', '1'); persist(); toast('Your progress will be kept in this browser only.'); }
    else { lsDel('ecb_remember'); lsDel('ecb_draft'); toast('Saved progress removed from this browser.'); }
  });
  $('btnClear').addEventListener('click', function () {
    lsDel('ecb_draft'); lsDel('ecb_remember'); state.remember = false; $('chkRemember').checked = false; toast('Saved data cleared from this browser.');
  });
  function setTab(tab) {
    $('bgrid').dataset.tab = tab;
    document.querySelectorAll('#mobTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    if (tab === 'preview') renderPreview();
    window.scrollTo(0, 0);
  }
  $('mobTabs').addEventListener('click', function (e) { const b = e.target.closest('button[data-tab]'); if (b) setTab(b.dataset.tab); });

  /* ---------- events: the form ---------- */
  const form = $('formcol');
  form.addEventListener('input', function (e) {
    const el = e.target; const path = el.dataset && el.dataset.path;
    if (el.dataset && el.dataset.grow) grow(el);
    if (!path) return;
    const d = state.doc;
    const v = el.type === 'checkbox' ? el.checked : (el.type === 'range' ? +el.value : el.value);
    setPath(d, path, v);
    if (/^sections\.[^.]+\.title$/.test(path)) d.sections[path.split('.')[1]].renamed = true;
    if (path === 'person.showPhoto') d.touched.photo = true;
    if (path === 'person.showPersonal') d.touched.personal = true;
    if (el.type === 'range' && el.nextElementSibling) el.nextElementSibling.textContent = v;
    const structural = el.type === 'checkbox' || /\.title$/.test(path) && false;
    if (/^sections\.[^.]+\.on$/.test(path)) {
      const k = path.split('.')[1], s = d.sections[k];
      if (v && ['entry', 'list', 'skills', 'refs'].indexOf(s.kind) >= 0 && !s.items.length) s.items = [E.newItem(s.kind)];
      if (v) state.open.add('sec-' + k);
    }
    if (/\.title$/.test(path) && path.indexOf('sections.') === 0) {
      const h = el.closest('.fc') && el.closest('.fc').querySelector('.fh h3'); if (h) h.textContent = el.value;
    }
    if (structural) renderForm();
    changed();
  });
  form.addEventListener('focusin', function (e) { if (e.target.tagName === 'TEXTAREA') state.lastFocus = e.target; });

  function move(arr, i, n) { const j = i + n; if (j < 0 || j >= arr.length) return; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  function focusLater(sel) { setTimeout(function () { const el = form.querySelector(sel); if (el) { el.focus(); } }, 30); }
  form.addEventListener('click', function (e) {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, d = state.doc, key = b.dataset.key, i = +b.dataset.i;
    if (act === 'toggle') {
      if (e.target.closest('button,label,input')) return;
      const id = b.dataset.id; if (state.open.has(id)) state.open.delete(id); else state.open.add(id);
      renderForm(); return;
    }
    if (e.target.closest('label.sw')) return;
    const sec = key && d.sections[key];
    switch (act) {
      case 'sec-up': move(d.order, d.order.indexOf(key), -1); break;
      case 'sec-down': move(d.order, d.order.indexOf(key), 1); break;
      case 'item-add': sec.items.push(E.newItem(sec.kind)); state.open.add('sec-' + key); break;
      case 'item-del':
        if (sec.items.length === 1) sec.items[0] = E.newItem(sec.kind); else sec.items.splice(i, 1); break;
      case 'item-up': move(sec.items, i, -1); break;
      case 'item-down': move(sec.items, i, 1); break;
      case 'b-add': sec.items[i].b.push(''); break;
      case 'b-del': sec.items[i].b.splice(+b.dataset.bi, 1); if (!sec.items[i].b.length) sec.items[i].b = ['']; break;
      case 'link-add': d.person.links.push({ label: b.dataset.l, url: '' }); break;
      case 'link-del': d.person.links.splice(i, 1); break;
      case 'photo-pick': $('filePhoto').click(); return;
      case 'photo-del': d.person.photo = ''; d.person.showPhoto = false; break;
      case 'sec-del':
        if (!confirm('Delete this section and everything in it?')) return;
        delete d.sections[key]; d.order = d.order.filter(function (k) { return k !== key; }); break;
      case 'custom-add': {
        const title = ($('newSecTitle').value || '').trim() || 'Custom Section', kind = $('newSecKind').value;
        const k = 'c_' + (++d.customCount);
        d.sections[k] = { on: true, title: title, renamed: true, kind: kind, items: kind === 'text' ? [] : [E.newItem(kind)], text: '', onRequest: false, labels: E.SECTION_DEFS.experience.labels };
        d.order.push(k); state.open.add('sec-' + k); break;
      }
      case 'fmt': case 'sym': {
        const entry = b.closest('.entry');
        let ta = state.lastFocus && entry && entry.contains(state.lastFocus) ? state.lastFocus : (entry && entry.querySelector('textarea'));
        if (!ta) return;
        const s = ta.selectionStart, en = ta.selectionEnd, sel = ta.value.slice(s, en);
        let ins;
        if (act === 'sym') ins = b.dataset.s;
        else { const w = b.dataset.w; const close = w === '**' ? '**' : '}'; ins = w + (sel || 'text') + close; }
        ta.setRangeText(ins, s, en, 'end'); ta.focus();
        ta.dispatchEvent(new Event('input', { bubbles: true })); return;
      }
      default: return;
    }
    renderForm(); changed();
    if (act === 'b-add') { const ents = form.querySelectorAll('.entry[data-key="' + key + '"][data-i="' + i + '"] .brow textarea'); if (ents.length) ents[ents.length - 1].focus(); }
    if (act === 'item-add') { const n = form.querySelectorAll('.entry[data-key="' + key + '"], #sec-' + key + ' .lrow'); const last = n[n.length - 1]; if (last) { const inp = last.querySelector('input'); if (inp) inp.focus(); last.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
    if (act === 'link-add') { const ins = form.querySelectorAll('#card-links .lrow'); const last = ins[ins.length - 1]; if (last) last.querySelectorAll('input')[1].focus(); }
  });
  $('filePhoto').addEventListener('change', function (e) { const f = e.target.files[0]; e.target.value = ''; handlePhoto(f); });

  /* ---------- page level ---------- */
  window.addEventListener('beforeunload', function (e) {
    if (state.view === 'builder' && state.dirty && !state.savedFile && !state.remember) { e.preventDefault(); e.returnValue = ''; }
  });
  window.addEventListener('resize', debounce(function () {
    if (state.view === 'home') scaleThumbs();
    if (!$('modal').hidden) layoutModal();
    if (state.view === 'builder') renderPreview();
  }, 150));

  /* ---------- start ---------- */
  function init() {
    state.remember = lsGet('ecb_remember') === '1';
    let restored = false;
    if (state.remember) {
      try {
        const raw = lsGet('ecb_draft');
        if (raw) { state.doc = migrate(JSON.parse(raw)); restored = true; }
      } catch (e) { state.doc = null; }
    }
    renderFilters(); renderGallery();
    if (restored) { state.open = new Set(['person']); enterBuilder(); banner('Welcome back. Your saved progress was restored on this device.'); }
    else show('home');
    initCounters();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (state.view === 'home') { renderGallery(); } });
  }
  window.ECB_APP = { state: state, show: show, showHome: showHome, enterBuilder: enterBuilder, useTemplate: useTemplate, renderPreview: renderPreview, renderForm: renderForm };
  init();
})();
