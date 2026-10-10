/* Easy CV Builder - the 12 templates (render functions) and page-fit logic */
(function (global) {
  'use strict';
  const E = global.ECB;
  const esc = E.esc, rich = E.rich, nonEmpty = E.nonEmpty, dateText = E.dateText, usable = E.usable, hasContent = E.hasContent;

  const MARGIN_MM = 14; /* top and bottom print margin for flowing templates */

  /* ---------- small builders ---------- */
  function bullets(it) {
    const b = (it.b || []).filter(nonEmpty);
    return b.length ? '<ul class="b">' + b.map(function (x) { return '<li>' + rich(x) + '</li>'; }).join('') + '</ul>' : '';
  }
  function join(parts, sep) { return parts.filter(nonEmpty).join(sep); }
  function linkLabel(l) { return nonEmpty(l.label) ? l.label : String(l.url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''); }
  function linksList(doc) { return doc.person.links.filter(function (l) { return nonEmpty(l.url); }); }
  function linksHTML(doc, sep, showUrl) {
    const a = linksList(doc).map(function (l) {
      const txt = showUrl ? String(l.url).replace(/^https?:\/\//, '').replace(/\/$/, '') : linkLabel(l);
      return '<a href="' + esc(E.normalizeUrl(l.url)) + '">' + esc(txt) + '</a>';
    });
    return a.join(sep == null ? ' · ' : sep);
  }
  function contactParts(doc, withLoc) {
    const p = doc.person;
    return [withLoc === false ? '' : p.loc, p.phone, p.email].filter(nonEmpty).map(esc);
  }
  function personalRows(doc) {
    const p = doc.person; if (!p.showPersonal) return [];
    const r = [];
    if (nonEmpty(p.dob)) r.push(['Date of Birth', p.dob]);
    if (nonEmpty(p.nationality)) r.push(['Nationality', p.nationality]);
    if (nonEmpty(p.father)) r.push(["Father's Name", p.father]);
    return r;
  }
  function personalLine(doc) { return personalRows(doc).map(function (r) { return esc(r[0] + ': ' + r[1]); }).join(' · '); }
  function photo(doc, cls) {
    const p = doc.person;
    if (!p.showPhoto || !p.photo) return '';
    const st = p.photoColor ? '' : ' style="filter:grayscale(1)"';
    return '<div class="ph ' + (cls || '') + '"><img src="' + esc(p.photo) + '" alt=""' + st + '></div>';
  }

  /* entry layouts */
  function entry(it, layout) {
    const date = dateText(it), p = it.p || '', s = it.s || '', loc = it.loc || '', note = it.note || '';
    const bl = bullets(it);
    const noteH = nonEmpty(note) ? '<div class="note">' + rich(note) + '</div>' : '';
    let h = '';
    if (layout === 'org') { /* org + location / role italic + date */
      h += '<div class="row"><b>' + rich(p) + '</b><span>' + esc(loc) + '</span></div>';
      if (nonEmpty(s) || date) h += '<div class="row"><i>' + rich(s) + '</i><span>' + esc(date) + '</span></div>';
    } else if (layout === 'od') { /* org, location + date / role italic */
      h += '<div class="row"><b>' + rich(join([p, loc], ', ')) + '</b><span>' + esc(date) + '</span></div>';
      if (nonEmpty(s)) h += '<div class="role"><i>' + rich(s) + '</i></div>';
    } else if (layout === 'dash') { /* Title - Tools + date */
      h += '<div class="row"><b>' + rich(p) + (nonEmpty(s) ? ' <span class="dsh">— ' + rich(s) + '</span>' : '') + '</b><span>' + esc(date) + '</span></div>';
      if (nonEmpty(loc)) h += '<div class="role"><i>' + esc(loc) + '</i></div>';
    } else if (layout === 'sp') { /* role, org + date */
      h += '<div class="row"><b>' + rich(join([s, p], ', ')) + '</b><span>' + esc(date) + '</span></div>';
      if (nonEmpty(loc)) h += '<div class="role"><i>' + esc(loc) + '</i></div>';
    } else if (layout === 'compact') {
      return '<div class="row cmp"><span>' + rich(join([s, p], ', ')) + '</span><span>' + esc(date) + '</span></div>';
    } else if (layout === 'stack') { /* T1 */
      h += '<b>' + rich(s || p) + '</b>';
      if (nonEmpty(s) && nonEmpty(p)) h += '<i>' + rich(p) + '</i>';
      const sm = join([loc, date], ' · ');
      if (nonEmpty(sm)) h += '<small>' + esc(sm) + '</small>';
      return '<div class="it">' + h + noteH + bl + '</div>';
    } else if (layout === 'rf') { /* T3 role first, org - location | date */
      h += '<b>' + rich(s || p) + '</b>';
      h += '<div class="row"><span>' + rich(nonEmpty(s) ? join([p, loc], ' – ') : loc) + '</span><span>' + esc(date) + '</span></div>';
    } else if (layout === 'bd') { /* T7 */
      h += '<b>' + rich(s || p) + '</b>';
      const sm = join([nonEmpty(s) ? p : '', loc], ', ') + (date ? (nonEmpty(join([nonEmpty(s) ? p : '', loc], ', ')) ? ' | ' : '') + date : '');
      if (nonEmpty(sm)) h += '<small>' + esc(sm) + '</small>';
    } else if (layout === 'ed') { /* T7 education */
      h += '<b>' + rich(s || p) + '</b>' + (nonEmpty(s) ? esc(p) : '') + (date ? '<br>' + esc(date) : '') + (nonEmpty(note) ? '<br>' + esc(note) : '');
      return '<div class="ed">' + h + bl + '</div>';
    } else if (layout === 'b9') { /* T9 */
      h += '<div class="row"><b>' + rich(p) + (nonEmpty(s) ? ' <span class="sub">| ' + rich(s) + '</span>' : '') + '</b><span>' + esc(date) + '</span></div>';
      if (nonEmpty(loc)) h += '<div class="role"><i>' + esc(loc) + '</i></div>';
    } else { /* 'plain': line1 bold + date, line2 detail */
      h += '<div class="row"><b>' + rich(p || s) + '</b><span>' + esc(date) + '</span></div>';
      const l2 = nonEmpty(p) ? join([s, loc, note], ' · ') : join([loc, note], ' · ');
      if (nonEmpty(l2)) h += '<div class="role">' + rich(l2) + '</div>';
      return '<div class="e">' + h + bl + '</div>';
    }
    return '<div class="e">' + h + noteH + bl + '</div>';
  }

  function skillsHTML(items, mode) {
    if (mode === 'grid') {
      const toks = [];
      items.forEach(function (it) {
        if (nonEmpty(it.text)) String(it.text).split(',').forEach(function (t) { if (nonEmpty(t)) toks.push(t.trim()); });
        else toks.push(it.label);
      });
      return '<ul class="grid">' + toks.map(function (t) { return '<li>' + rich(t) + '</li>'; }).join('') + '</ul>';
    }
    if (mode === 'bars') {
      return items.map(function (it) {
        const lv = Math.max(0, Math.min(100, +it.level || 0));
        const name = nonEmpty(it.label) ? it.label : it.text;
        if (lv > 0) return '<div class="bar"><span>' + rich(name) + '</span><div><i style="width:' + lv + '%"></i></div></div>';
        return '<div class="sk">' + (nonEmpty(it.label) ? '<b>' + rich(it.label) + ':</b> ' : '') + rich(it.text) + '</div>';
      }).join('');
    }
    if (mode === 'list') {
      return '<ul class="b">' + items.map(function (it) { return '<li>' + rich(join([it.label, it.text], ': ')) + '</li>'; }).join('') + '</ul>';
    }
    if (mode === 'sg') {
      return '<div class="sg">' + items.map(function (it) { return '<b>' + rich(it.label) + '</b><span>' + rich(it.text) + '</span>'; }).join('') + '</div>';
    }
    return items.map(function (it) {
      return '<div class="sk">' + (nonEmpty(it.label) ? '<b>' + rich(it.label) + ':</b> ' : '') + rich(it.text) + '</div>';
    }).join('');
  }

  function refsHTML(sec, items) {
    let h = '';
    if (sec.onRequest) h += '<div class="req">Available on request</div>';
    if (items.length) {
      h += '<div class="refs">' + items.map(function (r) {
        return '<div class="ref">' + (nonEmpty(r.name) ? '<b>' + esc(r.name) + '</b>' : '') +
          (nonEmpty(join([r.title, r.org], ', ')) ? '<br>' + esc(join([r.title, r.org], ', ')) : '') +
          (nonEmpty(r.phone) ? '<br>' + esc(r.phone) : '') +
          (nonEmpty(r.email) ? '<br>' + esc(r.email) : '') + '</div>';
      }).join('') + '</div>';
    }
    return h;
  }

  function secBody(doc, key, o) {
    const sec = doc.sections[key];
    const it = usable(sec);
    o = o || {};
    if (sec.kind === 'text') return '<p class="txt">' + rich(sec.text) + '</p>';
    if (sec.kind === 'entry') {
      const lay = (o.layout && (o.layout[key] || o.layout.def)) || 'plain';
      if (key === 'education' && o.eduTable) {
        return '<table><tr><th>Degree</th><th>Institution</th><th>Year</th><th>Result</th></tr>' + it.map(function (x) {
          return '<tr><td>' + rich(x.s) + '</td><td>' + rich(x.p) + '</td><td>' + esc(dateText(x)) + '</td><td>' + rich(x.note) + '</td></tr>';
        }).join('') + '</table>' + it.map(function (x) { return bullets(x); }).join('');
      }
      return it.map(function (x) { return entry(x, lay); }).join('');
    }
    if (sec.kind === 'list') return '<ul class="b' + (o.listCls ? ' ' + o.listCls : '') + '">' + it.map(function (x) { return '<li>' + rich(x.t) + '</li>'; }).join('') + '</ul>';
    if (sec.kind === 'skills') return skillsHTML(it, (o.skills && (o.skills[key] || o.skills.def)) || 'lines');
    if (sec.kind === 'refs') return refsHTML(sec, it);
    return '';
  }
  function section(doc, key, o) {
    if (!hasContent(doc.sections[key])) return '';
    o = o || {};
    const tag = o.h || 'h2';
    return '<section class="s s-' + key + '"><' + tag + '>' + esc(doc.sections[key].title) + '</' + tag + '><div class="sb">' + secBody(doc, key, o) + '</div></section>';
  }
  function keysOf(doc, exclude, only) {
    return doc.order.filter(function (k) {
      return doc.sections[k] && hasContent(doc.sections[k]) && (!exclude || exclude.indexOf(k) < 0) && (!only || only.indexOf(k) >= 0);
    });
  }
  function sections(doc, keys, o) { return keys.map(function (k) { return section(doc, k, o); }).join(''); }
  function nameOf(doc) { return esc(doc.person.name || 'Your Name'); }
  function titleOf(doc) { return esc(doc.person.title || ''); }

  /* ---------- the templates ---------- */
  const T = [];

  /* 1: header band, two columns (colour) */
  T.push({
    id: 't1', name: 'Header band, two columns', audience: 'Undergrad', groups: ['undergrad'], paper: 'A4', pages: 1, kind: 'fixed', base: 12.2,
    photo: true, personal: true, color: true,
    order: ['summary', 'education', 'experience', 'leadership', 'training', 'awards', 'volunteer', 'skills', 'languages', 'hobbies', 'certs', 'projects', 'references'],
    on: ['summary', 'education', 'experience', 'leadership', 'training', 'awards', 'skills', 'languages', 'references'],
    docx: { font: 'Calibri', layout: 'two', side: ['education', 'skills', 'languages', 'hobbies'], accent: '2F80ED', head: 'rule', headColor: '1E293B', band: '1E293B' },
    render: function (doc) {
      const p = doc.person, S = doc.sections;
      const side = ['education', 'skills', 'languages', 'hobbies'];
      const ct = [];
      if (nonEmpty(p.email)) ct.push('<b>Email</b><br>' + esc(p.email));
      if (nonEmpty(p.phone)) ct.push('<b>Phone</b><br>' + esc(p.phone));
      if (nonEmpty(p.loc)) ct.push('<b>Address</b><br>' + esc(p.loc));
      linksList(doc).forEach(function (l) { ct.push('<b>' + esc(linkLabel(l)) + '</b><br><a href="' + esc(E.normalizeUrl(l.url)) + '">' + esc(String(l.url).replace(/^https?:\/\//, '')) + '</a>'); });
      const pr = personalRows(doc);
      const o = { layout: { def: 'stack' }, skills: { def: 'bars' }, listCls: '' };
      const c1 = (pr.length ? '<section class="s"><h2>Additional Information</h2><div class="sb"><p class="txt">' + pr.map(function (r) { return esc(r[0] + ': ' + r[1]); }).join('<br>') + '</p></div></section>' : '') +
        sections(doc, keysOf(doc, null, side), o);
      const c2 = sections(doc, keysOf(doc, side.concat(['summary'])), o);
      return '<div class="band">' + photo(doc) + '<div class="who"><h1>' + nameOf(doc) + '</h1><div class="ttl">' + titleOf(doc) + '</div>' +
        (hasContent(S.summary) ? '<p>' + rich(S.summary.text) + '</p>' : '') + '</div><div class="ct">' + ct.join('<br>') + '</div></div>' +
        '<div class="cols"><div class="c1">' + c1 + '</div><div class="c2">' + c2 + '</div></div>';
    }
  });

  /* 2: plain single column, photo top right */
  T.push({
    id: 't2', name: 'Plain single column, photo top right', audience: 'Undergrad · ATS-friendly', groups: ['undergrad'], paper: 'A4', pages: 1, kind: 'flow', base: 12,
    photo: true, personal: false,
    order: ['education', 'experience', 'leadership', 'training', 'skills', 'languages', 'awards', 'references', 'projects', 'certs', 'volunteer', 'hobbies'],
    on: ['education', 'experience', 'leadership', 'training', 'skills', 'languages', 'awards', 'references'],
    titles: { skills: 'Additional Skills' },
    docx: { font: 'Calibri', layout: 'single', accent: '000000', head: 'rule' },
    render: function (doc) {
      const p = doc.person;
      const cl = join(contactParts(doc).concat(personalLine(doc) ? [personalLine(doc)] : []), ' · ');
      const o = { layout: { def: 'od', education: 'od' }, skills: { def: 'lines' } };
      return '<div class="hd"><div><h1>' + nameOf(doc) + '</h1>' + (p.title ? '<div class="sub">' + titleOf(doc) + '</div>' : '') +
        '<div class="cl">' + cl + '</div>' + (linksList(doc).length ? '<div class="cl">' + linksHTML(doc) + '</div>' : '') + '</div>' + photo(doc) + '</div>' +
        sections(doc, keysOf(doc), o);
    }
  });

  /* 3: dark sidebar, circular photo (colour) */
  T.push({
    id: 't3', name: 'Dark sidebar, circular photo', audience: 'Undergrad · modern', groups: ['undergrad'], paper: 'A4', pages: 1, kind: 'fixed', base: 12.4,
    photo: true, personal: false, color: true,
    order: ['summary', 'experience', 'education', 'certs', 'projects', 'training', 'leadership', 'awards', 'references', 'skills', 'languages', 'hobbies'],
    on: ['summary', 'experience', 'education', 'certs', 'references', 'skills', 'languages', 'hobbies'],
    titles: { summary: 'Profile' },
    docx: { font: 'Calibri', layout: 'two', side: ['skills', 'languages', 'hobbies'], accent: '1C2431', head: 'plain', sideShade: '1C2431', sideText: 'FFFFFF' },
    render: function (doc) {
      const p = doc.person;
      const side = ['skills', 'languages', 'hobbies'];
      const c = [];
      if (nonEmpty(p.loc)) c.push('<p><b>Address</b>' + esc(p.loc) + '</p>');
      if (nonEmpty(p.phone)) c.push('<p><b>Phone</b>' + esc(p.phone) + '</p>');
      if (nonEmpty(p.email)) c.push('<p><b>Email</b>' + esc(p.email) + '</p>');
      linksList(doc).forEach(function (l) { c.push('<p><b>' + esc(linkLabel(l)) + '</b><a href="' + esc(E.normalizeUrl(l.url)) + '">' + esc(String(l.url).replace(/^https?:\/\//, '')) + '</a></p>'); });
      personalRows(doc).forEach(function (r) { c.push('<p><b>' + esc(r[0]) + '</b>' + esc(r[1]) + '</p>'); });
      const so = { h: 'h3', skills: { def: 'list' } };
      const mo = { layout: { def: 'rf' } };
      return '<div class="sb0">' + photo(doc) + '<h3>Contact</h3>' + c.join('') + sections(doc, keysOf(doc, null, side), so) + '</div>' +
        '<div class="mn"><h1>' + nameOf(doc) + '</h1><div class="ttl">' + titleOf(doc) + '</div>' + sections(doc, keysOf(doc, side), mo) + '</div>';
    }
  });

  /* 4: academic, LaTeX-style */
  T.push({
    id: 't4', name: 'Academic, LaTeX-style', audience: 'Abroad application', groups: ['abroad'], paper: 'A4', pages: 2, kind: 'flow', base: 12.2,
    photo: false, personal: false,
    order: ['education', 'research_interests', 'research', 'publications', 'experience', 'projects', 'skills', 'awards', 'leadership', 'tests', 'certs', 'references'],
    on: ['education', 'research_interests', 'research', 'publications', 'experience', 'projects', 'skills', 'awards', 'tests', 'certs', 'references'],
    titles: { research_interests: 'Research Interest', experience: 'Professional Experiences', projects: 'Academic Projects', skills: 'Skills Summary', tests: 'Test Score', certs: 'Selective Certifications', references: 'References' },
    docx: { font: 'Times New Roman', layout: 'single', accent: '000000', head: 'rule', center: true, small: true },
    render: function (doc) {
      const o = { layout: { def: 'org' }, skills: { def: 'lines' } };
      return '<h1>' + nameOf(doc) + '</h1><div class="c">' + join(contactParts(doc, false).concat(personalLine(doc) ? [personalLine(doc)] : []), ' · ') + '</div>' +
        (linksList(doc).length ? '<div class="c">' + linksHTML(doc) + '</div>' : '') + sections(doc, keysOf(doc), o);
    }
  });

  /* 5: US one-page, dense bullets */
  T.push({
    id: 't5', name: 'US one-page, dense bullets', audience: 'Internship / full-time · US', groups: ['us'], paper: 'Letter', pages: 1, kind: 'flow', base: 12.2,
    photo: false, personal: false,
    order: ['education', 'skills', 'research', 'experience', 'projects', 'leadership', 'awards', 'certs', 'publications'],
    on: ['education', 'skills', 'experience', 'projects'],
    titles: { skills: 'Technical Skills', projects: 'Academic Projects' },
    docx: { font: 'Calibri', layout: 'single', accent: '000000', head: 'rule', center: true, upper: true },
    render: function (doc) {
      const o = { layout: { def: 'dash', education: 'org' }, skills: { def: 'lines' } };
      return '<h1>' + nameOf(doc) + '</h1><div class="c">' + join(contactParts(doc).concat(linksList(doc).length ? [linksHTML(doc, ' • ')] : []), ' • ') + '</div>' + sections(doc, keysOf(doc), o);
    }
  });

  /* 6: summary and skills grid */
  T.push({
    id: 't6', name: 'Summary and skills grid', audience: 'Graduate · academic / abroad', groups: ['abroad', 'us'], paper: 'Letter', pages: 2, kind: 'flow', base: 12.2,
    photo: false, personal: false,
    order: ['summary', 'skills', 'research', 'experience', 'leadership', 'publications', 'education', 'certs', 'tests', 'awards', 'projects', 'references'],
    on: ['summary', 'skills', 'research', 'experience', 'leadership', 'publications', 'education', 'certs', 'tests', 'references'],
    titles: { summary: 'Professional Summary', skills: 'Skills / Qualifications', research: 'Related Experience', experience: 'Additional Experience', leadership: 'Leadership and Involvement', publications: 'Publications and Presentations', certs: 'Certifications' },
    docx: { font: 'Times New Roman', layout: 'single', accent: '000000', head: 'rule', center: true, upper: true },
    render: function (doc) {
      const o = { layout: { def: 'sp', education: 'org', leadership: 'compact' }, skills: { def: 'grid' }, listCls: '' };
      return '<h1>' + nameOf(doc) + '</h1><div class="c">' + join(contactParts(doc).concat(linksList(doc).length ? [linksHTML(doc)] : []), ' · ') + '</div>' + sections(doc, keysOf(doc), o);
    }
  });

  /* 7: Bangladesh undergrad, narrow left column with bars (colour) */
  T.push({
    id: 't7', name: 'Narrow left column, skill bars', audience: 'Undergrad · Bangladesh', groups: ['undergrad', 'bd'], paper: 'A4', pages: 1, kind: 'fixed', base: 12.4,
    photo: true, personal: true, color: true,
    order: ['summary', 'experience', 'certs', 'education', 'softskills', 'skills', 'languages', 'training', 'awards', 'projects', 'leadership', 'references'],
    on: ['summary', 'experience', 'certs', 'education', 'softskills', 'skills', 'languages', 'references'],
    titles: { summary: 'Executive Summary', certs: 'Certificates' },
    docx: { font: 'Calibri', layout: 'two', side: ['education', 'softskills', 'skills', 'languages'], accent: 'D62828', head: 'rule', upper: true },
    render: function (doc) {
      const p = doc.person;
      const side = ['education', 'softskills', 'skills', 'languages'];
      const words = String(p.title || '').trim().split(/\s+/).filter(Boolean);
      const jt = words.length > 1 ? '<div class="jt">' + words.map(function (w) { return '<span>' + esc(w) + '</span>'; }).join('') + '</div>' : '<div class="jt one">' + esc(words[0] || '') + '</div>';
      const ct = contactParts(doc).concat(linksList(doc).map(function (l) { return '<a href="' + esc(E.normalizeUrl(l.url)) + '">' + esc(linkLabel(l)) + '</a>'; }));
      const pr = personalRows(doc);
      const so = { layout: { def: 'ed' }, skills: { def: 'bars' }, listCls: 'sl' };
      const mo = { layout: { def: 'bd' }, listCls: 'cert' };
      const c1 = sections(doc, keysOf(doc, null, side), so) + (pr.length ? '<section class="s"><h2>Personal</h2><div class="sb">' + pr.map(function (r) { return '<div class="ed">' + esc(r[0]) + ': ' + esc(r[1]) + '</div>'; }).join('') + '</div></section>' : '');
      return '<div class="top">' + photo(doc) + '<div class="nm"><h1>' + nameOf(doc) + '</h1>' + jt + '</div></div>' +
        '<div class="ct">' + ct.map(function (c) { return '<span>' + c + '</span>'; }).join('') + '</div>' +
        '<div class="cols"><div class="c1">' + c1 + '</div><div class="c2">' + sections(doc, keysOf(doc, side), mo) + '</div></div>';
    }
  });

  /* 8: US graduate, ATS classic */
  T.push({
    id: 't8', name: 'US graduate, ATS classic', audience: 'Graduate · US', groups: ['us'], paper: 'Letter', pages: 1, kind: 'flow', base: 12.6,
    photo: false, personal: false,
    order: ['education', 'experience', 'projects', 'skills', 'awards', 'certs', 'leadership', 'publications', 'research'],
    on: ['education', 'experience', 'projects', 'skills', 'awards'],
    titles: { awards: 'Honors & Certifications' },
    docx: { font: 'Times New Roman', layout: 'single', accent: '000000', head: 'rule', center: true, upper: true },
    render: function (doc) {
      const o = { layout: { def: 'org' }, skills: { def: 'lines' } };
      return '<h1>' + nameOf(doc) + '</h1><div class="c">' + join(contactParts(doc).concat(linksList(doc).length ? [linksHTML(doc, ' | ')] : []), ' | ') + '</div>' + sections(doc, keysOf(doc), o);
    }
  });

  /* 9: US graduate, modern compact */
  T.push({
    id: 't9', name: 'US graduate, modern compact', audience: 'Graduate · US', groups: ['us'], paper: 'Letter', pages: 1, kind: 'fixed', base: 12.2,
    photo: false, personal: false,
    order: ['summary', 'skills', 'projects', 'experience', 'education', 'awards', 'leadership', 'certs', 'research'],
    on: ['summary', 'skills', 'projects', 'experience', 'education', 'awards'],
    docx: { font: 'Calibri', layout: 'single', accent: '111111', head: 'rule', upper: true, band: '111111' },
    render: function (doc) {
      const p = doc.person;
      const o = { layout: { def: 'b9' }, skills: { def: 'sg' } };
      const rt = [join([p.email, p.phone], ' · '), p.loc, linksHTML(doc, ' · ')].filter(nonEmpty);
      return '<div class="bar0"><div><h1>' + nameOf(doc) + '</h1><div class="ttl">' + titleOf(doc) + '</div></div><div class="rt">' +
        [esc(join([p.email, p.phone], ' · ')), esc(p.loc), linksHTML(doc, ' · ')].filter(nonEmpty).join('<br>') + '</div></div><div class="in">' + sections(doc, keysOf(doc), o) + '</div>';
    }
  });

  /* 10: Bangladesh job-focused */
  T.push({
    id: 't10', name: 'Bangladesh job-focused', audience: 'Undergrad · Bangladesh job', groups: ['undergrad', 'bd'], paper: 'A4', pages: 1, kind: 'fixed', base: 12.4,
    photo: true, personal: true,
    order: ['summary', 'education', 'experience', 'training', 'awards', 'references', 'projects', 'leadership', 'certs', 'skills', 'languages', 'softskills'],
    on: ['summary', 'education', 'experience', 'training', 'awards', 'references', 'skills', 'languages'],
    titles: { summary: 'Career Objective', experience: 'Internship / Experience' },
    docx: { font: 'Calibri', layout: 'two', side: ['skills', 'languages', 'softskills'], accent: '111111', head: 'bar', sideShade: 'EFEFEF', upper: true },
    render: function (doc) {
      const p = doc.person;
      const side = ['skills', 'languages', 'softskills'];
      const pr = personalRows(doc);
      if (nonEmpty(p.loc)) pr.push(['Address', p.loc]);
      const cont = [p.phone, p.email].filter(nonEmpty).map(esc).concat(linksList(doc).map(function (l) { return '<a href="' + esc(E.normalizeUrl(l.url)) + '">' + esc(linkLabel(l)) + '</a>'; }));
      const so = { h: 'h3', skills: { def: 'bars' } };
      const mo = { layout: { def: 'od' }, eduTable: true };
      return '<div class="l">' + photo(doc) +
        (pr.length ? '<h3>Personal Details</h3>' + pr.map(function (r) { return '<p><b>' + esc(r[0]) + '</b>' + esc(r[1]) + '</p>'; }).join('') : '') +
        (cont.length ? '<h3>Contact</h3>' + cont.map(function (c) { return '<p>' + c + '</p>'; }).join('') : '') +
        sections(doc, keysOf(doc, null, side), so) + '</div>' +
        '<div class="r"><h1>' + nameOf(doc) + '</h1><div class="ttl">' + titleOf(doc) + '</div>' + sections(doc, keysOf(doc, side), mo) + '</div>';
    }
  });

  /* 11: academic CV for admissions */
  T.push({
    id: 't11', name: 'Academic CV for admissions', audience: 'Abroad study · MS / PhD', groups: ['abroad'], paper: 'A4', pages: 2, kind: 'flow', base: 12.2,
    photo: false, personal: false,
    order: ['research_interests', 'education', 'research', 'publications', 'projects', 'awards', 'tests', 'skills', 'references', 'experience', 'certs', 'leadership'],
    on: ['research_interests', 'education', 'research', 'publications', 'projects', 'awards', 'tests', 'skills', 'references'],
    titles: { references: 'Referees', research_interests: 'Research Interests', tests: 'Test Scores' },
    docx: { font: 'Calibri', layout: 'single', accent: '000000', head: 'plain', upper: true },
    render: function (doc) {
      const p = doc.person;
      const o = { layout: { def: 'plain' }, skills: { def: 'lines' } };
      const rt = [esc(p.email), esc(p.phone), esc(p.loc)].filter(nonEmpty).join('<br>');
      return '<div class="hd"><h1>' + nameOf(doc) + '</h1><div class="rt">' + rt + '</div></div>' +
        (linksList(doc).length ? '<div class="lk">' + linksHTML(doc, ' ') + '</div>' : '') + sections(doc, keysOf(doc), o);
    }
  });

  /* 12: study-abroad application CV */
  T.push({
    id: 't12', name: 'Study-abroad application CV', audience: 'Abroad study · scholarship / master’s', groups: ['abroad'], paper: 'A4', pages: 2, kind: 'flow', base: 12.2,
    photo: false, personal: false,
    order: ['summary', 'education', 'projects', 'volunteer', 'awards', 'tests', 'skills', 'references', 'experience', 'leadership', 'certs', 'publications'],
    on: ['summary', 'education', 'projects', 'volunteer', 'awards', 'tests', 'skills', 'references'],
    titles: { education: 'Education & Academic Results', volunteer: 'Volunteering & Leadership', awards: 'Awards & Scholarships', tests: 'Language Tests' },
    docx: { font: 'Calibri', layout: 'single', accent: '000000', head: 'rule', center: true, upper: true },
    render: function (doc) {
      const p = doc.person, S = doc.sections;
      const o = { layout: { def: 'plain' }, skills: { def: 'lines' } };
      return '<div class="hd"><h1>' + nameOf(doc) + '</h1>' + (nonEmpty(p.target) ? '<div class="tg">Applying for: ' + esc(p.target) + '</div>' : '') +
        '<div class="c">' + join(contactParts(doc).concat(personalLine(doc) ? [personalLine(doc)] : []).concat(linksList(doc).length ? [linksHTML(doc)] : []), ' · ') + '</div></div>' +
        (hasContent(S.summary) ? '<div class="pf">' + rich(S.summary.text) + '</div>' : '') + sections(doc, keysOf(doc, ['summary']), o);
    }
  });

  /* ---------- page geometry and rendering ---------- */
  const PAPER = {
    A4: { w: '210mm', h: '297mm', pw: 793.7, ph: 1122.5, name: 'A4 (210 × 297 mm)' },
    Letter: { w: '8.5in', h: '11in', pw: 816, ph: 1056, name: 'US Letter (8.5 × 11 in)' }
  };
  function byId(id) { return T.filter(function (t) { return t.id === id; })[0] || T[0]; }

  function renderCV(doc, k, extraCls) {
    const t = byId(doc.tpl), pp = PAPER[doc.paper] || PAPER.A4;
    return '<div class="cv ' + t.id + ' ' + t.kind + (extraCls ? ' ' + extraCls : '') + '" style="--pw:' + pp.w + ';--ph:' + pp.h + ';--b:' + t.base + ';--k:' + (k || 1) + '">' + t.render(doc) + '</div>';
  }

  function measureEl() {
    let m = document.getElementById('measure');
    if (!m) { m = document.createElement('div'); m.id = 'measure'; document.body.appendChild(m); }
    return m;
  }
  function measure(doc, k) {
    const t = byId(doc.tpl), pp = PAPER[doc.paper] || PAPER.A4;
    const m = measureEl();
    m.innerHTML = renderCV(doc, k, 'measure');
    const cv = m.firstChild;
    const h = cv.scrollHeight;
    const marginPx = MARGIN_MM * 3.7795;
    let pages;
    if (t.kind === 'fixed') pages = h > pp.ph + 2 ? Math.ceil(h / pp.ph) : 1;
    else pages = Math.max(1, Math.ceil((h - 1) / ((pp.ph - 2 * marginPx) * 0.985)));
    m.innerHTML = '';
    return { pages: pages, h: h };
  }
  /* shrink the content (never below 78%) until it fits doc.pages */
  function fit(doc) {
    const target = doc.pages || 1;
    let k = 1, r = measure(doc, k);
    const natural = r.pages;
    if (!doc.fit || r.pages <= target) return { k: 1, pages: r.pages, natural: natural, over: r.pages > target, shrunk: false };
    while (r.pages > target && k > 0.78) { k = Math.round((k - 0.02) * 100) / 100; r = measure(doc, k); }
    return { k: k, pages: r.pages, natural: natural, over: r.pages > target, shrunk: k < 1 };
  }

  /* default section order / visibility / titles when a template is chosen */
  function applyTemplate(doc, id, opts) {
    opts = opts || {};
    const t = byId(id);
    doc.tpl = t.id;
    doc.paper = opts.keepPaper ? doc.paper : t.paper;
    doc.pages = t.pages;
    const rest = Object.keys(doc.sections).filter(function (k) { return t.order.indexOf(k) < 0; });
    const custom = doc.order.filter(function (k) { return /^c_/.test(k); });
    doc.order = t.order.concat(rest.filter(function (k) { return !/^c_/.test(k); })).concat(custom);
    Object.keys(doc.sections).forEach(function (k) {
      const s = doc.sections[k];
      const filled = (s.kind === 'text' ? nonEmpty(s.text) : (s.items || []).length > 0) && !/^c_/.test(k) && (s.kind === 'text' ? true : E.usable({ on: true, kind: s.kind, items: s.items }).length > 0);
      if (!/^c_/.test(k)) s.on = t.on.indexOf(k) >= 0 || filled || (s.kind === 'refs' && s.onRequest);
      if (!s.renamed && !/^c_/.test(k)) s.title = (t.titles && t.titles[k]) || E.SECTION_DEFS[k].title;
    });
    if (!doc.touched.photo) doc.person.showPhoto = !!t.photo;
    if (!doc.touched.personal) doc.person.showPersonal = !!t.personal;
    return doc;
  }

  Object.assign(E, {
    TEMPLATES: T, PAPER: PAPER, MARGIN_MM: MARGIN_MM, tplById: byId, renderCV: renderCV, fit: fit, measure: measure, applyTemplate: applyTemplate,
    helpers: { linksList: linksList, linkLabel: linkLabel, personalRows: personalRows, join: join, contactParts: contactParts }
  });
})(window);
