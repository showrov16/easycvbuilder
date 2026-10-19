/* Easy CV Builder - menu, job site list, experiences, contact, footer icons */
(function () {
  'use strict';
  const $ = function (id) { return document.getElementById(id); };
  const A = window.ECB_APP;
  const CFG = window.ECB_CONFIG || {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { return /^https?:\/\//i.test(u) ? u : ''; }

  /* ---------- social icons ---------- */
  const ICON = {
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M13.5 21v-7.2h2.4l.4-2.9h-2.8V9.1c0-.8.3-1.4 1.4-1.4h1.5V5.1c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v2.9h2.5V21z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M17.8 4h2.9l-6.3 7.2L21.800 20h-5.800l-4.500-5.900L6.300 20H3.400l6.700-7.700L3 4h5.900l4.100 5.400zm-1 14.300h1.600L7.900 5.600H6.200z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M6.9 9.3H4v9.4h2.9zM5.4 4.800a1.700 1.700 0 100 3.400 1.700 1.700 0 000-3.400zM18.700 13.500c0-2.600-1.400-4.400-3.600-4.400-1.200 0-2 .6-2.400 1.200V9.300H9.900v9.400h2.900v-5c0-1.300.6-2.100 1.700-2.100s1.500.8 1.500 2.100v5h2.900z"/></svg>'
  };
  function socialLinks() {
    const out = [];
    if (safeUrl(CFG.facebook)) out.push('<a class="so fb" href="' + esc(CFG.facebook) + '" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook">' + ICON.facebook + '</a>');
    if (safeUrl(CFG.x)) out.push('<a class="so xx" href="' + esc(CFG.x) + '" target="_blank" rel="noopener noreferrer" aria-label="X" title="X">' + ICON.x + '</a>');
    if (safeUrl(CFG.linkedin)) out.push('<a class="so li" href="' + esc(CFG.linkedin) + '" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn">' + ICON.linkedin + '</a>');
    return out.join('');
  }
  $('footSocial').innerHTML = socialLinks();
  $('contactSocial').innerHTML = socialLinks() || '<p class="hint">Contact links will appear here soon.</p>';
  if (CFG.owner) $('ownerName').textContent = CFG.owner;

  /* ---------- job sites ---------- */
  const JOBS = [
    { id: 'bangladesh', name: 'Bangladesh', note: 'Job portals used in Bangladesh.', items: [
      ['Bdjobs', 'https://www.bdjobs.com', 'The largest job portal in Bangladesh.'],
      ['Chakri.com', 'https://www.chakri.com', 'Jobs from many companies and fields.'],
      ['Skill.Jobs', 'https://skill.jobs', 'Job listings and career tools.'],
      ['Careerjet Bangladesh', 'https://www.careerjet.com.bd', 'Search that gathers listings from many sites.'],
      ['BRAC careers', 'https://www.brac.net/career', 'Jobs at BRAC and its organisations.'] ] },
    { id: 'companies', name: 'Company career pages', special: 'companies', note: 'Multinational and large companies in Bangladesh. "Website" opens the company site, where you can find its Careers link. "Careers" searches for its open jobs.' },
    { id: 'small', name: 'Small industries & local jobs', special: 'small', note: 'Smaller companies often hire through local sites, Facebook and newspapers.' },
    { id: 'international', name: 'International', note: 'Big global job sites.', items: [
      ['LinkedIn Jobs', 'https://www.linkedin.com/jobs', 'Jobs, plus a place to show your profile to recruiters.'],
      ['Indeed', 'https://www.indeed.com', 'Search jobs in many countries.'],
      ['Glassdoor', 'https://www.glassdoor.com/Job', 'Jobs, with company reviews and salary information.'],
      ['Wellfound', 'https://wellfound.com/jobs', 'Jobs at startups.'],
      ['USAJOBS', 'https://www.usajobs.gov', 'US federal government jobs. Many are only for US citizens.'] ] },
    { id: 'internships', name: 'Internships & new graduates', note: 'For students and early-career roles.', items: [
      ['Handshake', 'https://joinhandshake.com', 'Internships and graduate jobs, mostly through US universities.'],
      ['RippleMatch', 'https://ripplematch.com', 'Matches students and new graduates with employers.'],
      ['Simplify', 'https://simplify.jobs', 'Tracks applications and lists internships.'],
      ['LinkedIn Jobs', 'https://www.linkedin.com/jobs', 'Filter by "Internship" or "Entry level".'] ] },
    { id: 'academic', name: 'Academic & research', note: 'Research jobs, PhD positions and scholarships.', items: [
      ['Academic Positions', 'https://academicpositions.com', 'University and research jobs worldwide.'],
      ['jobs.ac.uk', 'https://www.jobs.ac.uk', 'Academic and research jobs, mostly in the UK.'],
      ['HigherEdJobs', 'https://www.higheredjobs.com', 'Jobs at US colleges and universities.'],
      ['EURAXESS', 'https://euraxess.ec.europa.eu/jobs', 'Research jobs and funding in Europe.'],
      ['Nature Careers', 'https://www.nature.com/naturecareers', 'Science jobs.'],
      ['FindAPhD', 'https://www.findaphd.com', 'PhD positions and funded projects.'],
      ['ScholarshipPortal', 'https://www.scholarshipportal.com', 'Scholarships for study abroad.'],
      ['DAAD', 'https://www.daad.de/en', 'Study and scholarship information for Germany.'] ] },
    { id: 'tech', name: 'Engineering & tech', note: 'For engineers, programmers and technical roles.', items: [
      ['IEEE Job Site', 'https://jobs.ieee.org', 'Electrical, electronics and computing jobs.'],
      ['Dice', 'https://www.dice.com', 'Technology jobs, mostly in the US.'],
      ['Wellfound', 'https://wellfound.com/jobs', 'Startup jobs.'] ] },
    { id: 'remote', name: 'Remote work', note: 'Jobs you can do from home. Read each offer carefully.', items: [
      ['Remote OK', 'https://remoteok.com', 'Remote jobs, mostly in tech.'],
      ['We Work Remotely', 'https://weworkremotely.com', 'Remote jobs in many fields.'],
      ['Remote.co', 'https://remote.co', 'Remote jobs and advice.'] ] },
    { id: 'ngo', name: 'NGO & development', note: 'Non-profit, development and United Nations work.', items: [
      ['ReliefWeb', 'https://reliefweb.int/jobs', 'Humanitarian and development jobs.'],
      ['Devex', 'https://www.devex.com/jobs', 'International development jobs.'],
      ['UN Careers', 'https://careers.un.org', 'Jobs at the United Nations.'],
      ['Impactpool', 'https://www.impactpool.org', 'Jobs in global development and public service.'] ] }
  ];
  let jobSel = 'all';
  function renderJobMenu() {
    $('ddJobsList').innerHTML = '<a href="#/jobs">All job sites</a>' + JOBS.map(function (g) { return '<a href="#/jobs/' + g.id + '">' + esc(g.name) + '</a>'; }).join('');
  }
  const CO = window.ECB_COMPANIES || { sectors: [], list: [], small: [] };
  function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function careersUrl(name) { return 'https://www.google.com/search?q=' + encodeURIComponent(name + ' Bangladesh careers jobs'); }
  function sectorName(k) { const s = CO.sectors.filter(function (x) { return x[0] === k; })[0]; return s ? s[1] : ''; }
  function coCard(c) {
    return '<div class="jcard co"><strong>' + esc(c[0]) + '</strong><span class="sec">' + esc(sectorName(c[1])) + '</span><div class="cobtn">' +
      '<a href="' + esc(c[2]) + '" target="_blank" rel="noopener noreferrer">Website &#8599;</a>' +
      '<a class="pri" href="' + esc(careersUrl(c[0])) + '" target="_blank" rel="noopener noreferrer">Careers &#8599;</a></div></div>';
  }
  function searchCompanies(q) {
    const n = norm(q); if (!n) return [];
    const short = n.length <= 2;
    const res = [];
    CO.list.forEach(function (c) {
      const names = [c[0]].concat(String(c[3] || '').split(',')).map(norm).filter(Boolean);
      let best = 0;
      names.forEach(function (x) {
        const words = x.split(' ');
        if (x === n) best = Math.max(best, 4);
        else if (x.indexOf(n) === 0 || words.some(function (w) { return w.indexOf(n) === 0; })) best = Math.max(best, 3);
        else if (!short && x.indexOf(n) >= 0) best = Math.max(best, 2);
        else if (!short && n.split(' ').every(function (t) { return x.indexOf(t) >= 0; })) best = Math.max(best, 1);
      });
      if (best) res.push([best, c]);
    });
    res.sort(function (a, b) { return b[0] - a[0] || a[1][0].localeCompare(b[1][0]); });
    return res.map(function (r) { return r[1]; });
  }
  function companiesHTML() {
    return CO.sectors.map(function (s) {
      const items = CO.list.filter(function (c) { return c[1] === s[0]; });
      return items.length ? '<h3 class="h3">' + esc(s[1]) + '</h3><div class="jgrid">' + items.map(coCard).join('') + '</div>' : '';
    }).join('');
  }
  function smallHTML() {
    return '<div class="jgrid">' + CO.small.map(function (it) {
      return '<a class="jcard" href="' + esc(it[1]) + '" target="_blank" rel="noopener noreferrer"><strong>' + esc(it[0]) + ' <span aria-hidden="true">&#8599;</span></strong><span>' + esc(it[2]) + '</span></a>';
    }).join('') + '</div>';
  }
  function renderJobs() {
    $('jobFilters').innerHTML = [['all', 'All']].concat(JOBS.map(function (g) { return [g.id, g.name]; })).map(function (f) {
      return '<button type="button" role="tab" data-g="' + f[0] + '" class="' + (jobSel === f[0] ? 'on' : '') + '">' + esc(f[1]) + '</button>';
    }).join('');
    const q = $('coSearch').value;
    if (norm(q)) {
      const r = searchCompanies(q);
      $('jobList').innerHTML = '<section class="jgroup"><h2 class="h2">Search results for &ldquo;' + esc(q.trim()) + '&rdquo;</h2>' +
        (r.length ? '<div class="jgrid">' + r.map(coCard).join('') + '</div>'
          : '<p class="hint">We could not find that name in our list. Try the full company name, or search for its jobs directly:</p><p><a class="btn primary" href="' + esc(careersUrl(q.trim())) + '" target="_blank" rel="noopener noreferrer">Search &ldquo;' + esc(q.trim()) + '&rdquo; careers &#8599;</a></p>') + '</section>';
      return;
    }
    $('jobList').innerHTML = JOBS.filter(function (g) { return jobSel === 'all' || jobSel === g.id; }).map(function (g) {
      let body;
      if (g.special === 'companies') body = companiesHTML();
      else if (g.special === 'small') body = smallHTML();
      else body = '<div class="jgrid">' + g.items.map(function (it) {
        return '<a class="jcard" href="' + esc(it[1]) + '" target="_blank" rel="noopener noreferrer"><strong>' + esc(it[0]) + ' <span aria-hidden="true">&#8599;</span></strong><span>' + esc(it[2]) + '</span></a>';
      }).join('') + '</div>';
      return '<section class="jgroup" id="jg-' + g.id + '"><h2 class="h2">' + esc(g.name) + '</h2><p class="hint">' + esc(g.note) + '</p>' + body + '</section>';
    }).join('');
  }
  $('coSearch').addEventListener('input', renderJobs);
  $('coForm').addEventListener('submit', function (e) { e.preventDefault(); renderJobs(); });
  $('coClear').addEventListener('click', function () { $('coSearch').value = ''; renderJobs(); $('coSearch').focus(); });
  $('jobFilters').addEventListener('click', function (e) {
    const b = e.target.closest('button[data-g]'); if (!b) return;
    location.hash = b.dataset.g === 'all' ? '#/jobs' : '#/jobs/' + b.dataset.g;
  });

  /* ---------- experiences ---------- */
  let expLoaded = false;
  function parseLines(txt) {
    const out = [];
    String(txt || '').split(/\r?\n/).forEach(function (l) {
      l = l.trim(); if (!l || l.charAt(0) !== '{') return;
      try { const o = JSON.parse(l); if (o && typeof o.text === 'string' && o.text.trim()) out.push(o); } catch (e) { /* skip a broken line */ }
    });
    return out;
  }
  async function loadExperiences() {
    const box = $('expList'); let items = [];
    try {
      const r = await fetch(new URL('data/experiences.txt', location.href.split('#')[0]).href, { cache: 'no-cache' });
      if (r.ok) items = parseLines(await r.text());
    } catch (e) { /* offline */ }
    expLoaded = true;
    if (!items.length) { box.innerHTML = '<p class="hint">No experiences shown yet. Be the first to share yours.</p>'; return; }
    box.innerHTML = items.slice().reverse().map(function (o) {
      const who = (o.name && o.name.trim()) || 'Anonymous';
      return '<figure class="quote"><blockquote>' + esc(o.text) + '</blockquote><figcaption><strong>' + esc(who) + '</strong>' + (o.role ? ' &middot; ' + esc(o.role) : '') + (o.date ? ' <span>' + esc(o.date) + '</span>' : '') + '</figcaption></figure>';
    }).join('');
  }
  $('expText').addEventListener('input', function () { $('expCount').textContent = this.value.length + ' / 600'; });
  function expMsg(t, ok) { const m = $('expMsg'); m.hidden = !t; m.textContent = t || ''; m.className = 'msg ' + (ok ? 'ok' : 'bad'); }
  $('expForm').addEventListener('submit', async function (e) {
    e.preventDefault(); expMsg('');
    const text = $('expText').value.trim(), name = $('expName').value.trim(), role = $('expRole').value.trim();
    if ($('expHoney').value) return;
    if (text.length < 10) { expMsg('Please write at least a few words about your experience.'); return; }
    if (!$('expOK').checked) { expMsg('Please tick the box to agree that your words may be shown.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CFG.email || '')) { expMsg('Sharing is not switched on yet. Please check back soon.'); return; }
    const d = new Date(); const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const line = JSON.stringify({ name: name, role: role, text: text, date: date });
    const btn = $('expSend'); btn.disabled = true; btn.textContent = 'Sending...';
    try {
      const r = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(CFG.email), {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ _subject: 'New experience for Easy CV Builder', _template: 'table', _captcha: 'false', name: name || 'Anonymous', role: role, experience: text,
          'TO APPROVE - copy this one line into data/experiences.txt': line })
      });
      const j = await r.json().catch(function () { return {}; });
      if (!r.ok || String(j.success) === 'false') throw new Error('send failed');
      $('expForm').reset(); $('expCount').textContent = '0 / 600';
      expMsg('Thank you! Your experience was sent. It will appear here after it is approved.', true);
    } catch (err) {
      expMsg('We could not send it. Please try again in a moment, or email it to the owner from the Contact page.');
    }
    btn.disabled = false; btn.textContent = 'Submit for approval';
  });

  /* ---------- menu and routing ---------- */
  const PAGES = { jobs: 'viewJobs', check: 'viewCheck', experiences: 'viewExp', contact: 'viewContact' };
  function closeMenu() { document.body.classList.remove('menuopen'); $('navToggle').setAttribute('aria-expanded', 'false'); }
  $('navToggle').addEventListener('click', function () { const o = document.body.classList.toggle('menuopen'); this.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  $('menu').addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
  document.querySelectorAll('.foot a[href^="#/"]').forEach(function (a) { a.addEventListener('click', closeMenu); });
  /* the logo and every "Create CV" link always lead to the main page (template gallery) */
  function goHome() {
    closeMenu();
    if (document.body.dataset.page || (location.hash && location.hash !== '#/' && location.hash !== '#')) {
      if (location.hash !== '#/') location.hash = '#/'; else route();
    } else { A.showHome(!!A.state.doc); }
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[href="#/"]');
    if (!a) return;
    e.preventDefault(); goHome();
  });

  function route() {
    const h = (location.hash || '#/').replace(/^#\/?/, '').split('/');
    const page = h[0] || 'home';
    document.querySelectorAll('.menu [data-nav]').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === page); });
    if (!PAGES[page]) {
      if (document.body.dataset.page) { delete document.body.dataset.page; A.showHome(!!A.state.doc); }
      return;
    }
    document.body.dataset.page = page;
    $('viewHome').hidden = true; $('viewBuilder').hidden = true;
    document.querySelectorAll('.xview').forEach(function (v) { v.hidden = v.id !== PAGES[page]; });
    if (page === 'jobs') { jobSel = JOBS.some(function (g) { return g.id === h[1]; }) ? h[1] : 'all'; renderJobs(); }
    if (page === 'experiences' && !expLoaded) loadExperiences();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  renderJobMenu();
  route();
})();
