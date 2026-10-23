/* Easy CV Builder - data model, section definitions and sample data */
(function (global) {
  'use strict';

  /* kinds: text | entry | list | skills | refs */
  const SECTION_DEFS = {
    summary:           { title: 'Summary', kind: 'text', ph: 'Write 2 to 4 lines about yourself, your strengths and what you are looking for.' },
    research_interests:{ title: 'Research Interests', kind: 'text', ph: 'Research area one, research area two, research area three' },
    education:         { title: 'Education', kind: 'entry', labels: { p: 'Institution', s: 'Degree and major', loc: 'Location', note: 'CGPA / GPA / results', ds: 'Start', de: 'End' } },
    experience:        { title: 'Experience', kind: 'entry', labels: { p: 'Organization', s: 'Designation / role', loc: 'Location', note: 'Short note (optional)' } },
    research:          { title: 'Research Experience', kind: 'entry', labels: { p: 'Lab / organization', s: 'Role', loc: 'Location', note: 'Short note (optional)' } },
    projects:          { title: 'Projects', kind: 'entry', labels: { p: 'Project title', s: 'Tools / subtitle', loc: 'Link or location', note: 'Short note (optional)' } },
    leadership:        { title: 'Leadership & Activities', kind: 'entry', labels: { p: 'Club / organization', s: 'Role', loc: 'Location', note: 'Short note (optional)' } },
    training:          { title: 'Training & Workshops', kind: 'entry', labels: { p: 'Training name', s: 'Institute / organizer', loc: 'Location', note: 'Short note (optional)' } },
    volunteer:         { title: 'Volunteer Experience', kind: 'entry', labels: { p: 'Organization', s: 'Role', loc: 'Location', note: 'Short note (optional)' } },
    awards:            { title: 'Honors & Awards', kind: 'list', ph: 'Award or scholarship name, awarding body, year' },
    certs:             { title: 'Certifications', kind: 'list', ph: 'Certification name, issuer, year' },
    publications:      { title: 'Publications', kind: 'list', ph: 'Authors. "Title." Journal or conference, year. (Status)' },
    tests:             { title: 'Test Scores', kind: 'list', ph: 'IELTS: 7.5 (Reading 8.0, Writing 7.0 ...)' },
    skills:            { title: 'Skills', kind: 'skills' },
    softskills:        { title: 'Soft Skills', kind: 'list', ph: 'Teamwork' },
    languages:         { title: 'Languages', kind: 'list', ph: 'English - Fluent' },
    hobbies:           { title: 'Hobbies', kind: 'list', ph: 'Photography' },
    references:        { title: 'References', kind: 'refs' }
  };

  const LINK_PRESETS = ['LinkedIn', 'Google Scholar', 'GitHub', 'ResearchGate', 'ORCID', 'Website'];

  function newItem(kind) {
    if (kind === 'entry') return { p: '', s: '', loc: '', ds: '', de: '', cur: false, note: '', b: [''] };
    if (kind === 'list') return { t: '' };
    if (kind === 'skills') return { label: '', text: '', level: 0 };
    if (kind === 'refs') return { name: '', title: '', org: '', email: '', phone: '' };
    return {};
  }

  function newDoc(tplId) {
    const sections = {};
    Object.keys(SECTION_DEFS).forEach(function (k) {
      const d = SECTION_DEFS[k];
      sections[k] = { on: false, title: d.title, renamed: false, kind: d.kind, items: [], text: '', onRequest: false };
    });
    return {
      v: 1,
      tpl: tplId || 't2',
      paper: 'A4',
      pages: 1,
      fit: true,
      person: {
        name: '', title: '', email: '', phone: '', loc: '', target: '',
        links: [], photo: '', showPhoto: false, photoColor: false,
        showPersonal: false, dob: '', nationality: '', father: ''
      },
      sections: sections,
      order: Object.keys(SECTION_DEFS),
      customCount: 0,
      touched: { photo: false, personal: false }
    };
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* tiny inline markup: **bold**, ^{sup}, _{sub} */
  function rich(s) {
    let h = esc(s);
    h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    h = h.replace(/\^\{(.+?)\}/g, '<sup>$1</sup>');
    h = h.replace(/_\{(.+?)\}/g, '<sub>$1</sub>');
    return h;
  }
  function nonEmpty(v) { return v != null && String(v).trim() !== ''; }
  function dateText(it) {
    const a = (it.ds || '').trim();
    const b = it.cur ? 'Present' : (it.de || '').trim();
    if (a && b) return a + ' – ' + b;
    return a || b || '';
  }
  function usable(sec) {
    if (!sec || !sec.on) return [];
    if (sec.kind === 'entry') {
      return sec.items.filter(function (it) { return nonEmpty(it.p) || nonEmpty(it.s) || nonEmpty(it.loc) || nonEmpty(it.note) || it.b.some(nonEmpty); });
    }
    if (sec.kind === 'list') return sec.items.filter(function (it) { return nonEmpty(it.t); });
    if (sec.kind === 'skills') return sec.items.filter(function (it) { return nonEmpty(it.label) || nonEmpty(it.text); });
    if (sec.kind === 'refs') return sec.items.filter(function (it) { return nonEmpty(it.name) || nonEmpty(it.title) || nonEmpty(it.org) || nonEmpty(it.email) || nonEmpty(it.phone); });
    return [];
  }
  function hasContent(sec) {
    if (!sec || !sec.on) return false;
    if (sec.kind === 'text') return nonEmpty(sec.text);
    if (sec.kind === 'refs' && sec.onRequest) return true;
    return usable(sec).length > 0;
  }
  function cloneDoc(d) { return JSON.parse(JSON.stringify(d)); }

  /* turn what people type into a working link: adds https://, accepts a bare handle when the label says LinkedIn/GitHub/ORCID, removes spaces and trailing dots */
  function normalizeUrl(u, label) {
    u = String(u || '').replace(/[\u200b\s]+/g, ' ').trim().replace(/^<|>$/g, '').replace(/[.,;]+$/, '').replace(/\s/g, '');
    if (!u) return '';
    if (/^(mailto:|tel:)/i.test(u)) return u;
    const lb = String(label || '').toLowerCase();
    if (!/^https?:\/\//i.test(u) && !/\./.test(u.split('/')[0])) {
      const h = u.replace(/^@/, '').replace(/^\/+/, '');
      if (/linkedin/.test(lb)) return 'https://www.linkedin.com/' + (/^(in|pub|company)\//i.test(h) ? '' : 'in/') + h;
      if (/github/.test(lb)) return 'https://github.com/' + h;
      if (/orcid/.test(lb)) return 'https://orcid.org/' + h;
    }
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
    return u;
  }
  function validUrl(u) {
    try { const x = new URL(normalizeUrl(u)); return /\./.test(x.hostname); } catch (e) { return false; }
  }
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((e || '').trim()); }

  /* mandatory: name, email, phone, one education entry (institution + degree) */
  function missingFields(doc) {
    const m = [];
    const p = doc.person;
    if (!nonEmpty(p.name)) m.push({ id: 'f-name', label: 'Full name' });
    if (!validEmail(p.email)) m.push({ id: 'f-email', label: 'A valid email address' });
    if (!nonEmpty(p.phone)) m.push({ id: 'f-phone', label: 'Phone number' });
    const ed = (doc.sections.education.items || []).filter(function (it) { return nonEmpty(it.p) && nonEmpty(it.s); });
    if (!ed.length) m.push({ id: 'sec-education', label: 'At least one education entry (institution and degree)' });
    return m;
  }

  /* ---------- sample data for previews (only name and universities are real) ---------- */
  const SIL = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><rect width="100" height="120" fill="#cfd6dd"/><circle cx="50" cy="46" r="20" fill="#8b97a3"/><path d="M8 120c3-32 20-46 42-46s39 14 42 46z" fill="#8b97a3"/></svg>');

  function sampleDoc(tplId) {
    const d = newDoc(tplId);
    const p = d.person;
    p.name = 'Md Shadman Sakib Showrov';
    p.title = 'Target Job Title';
    p.email = 'name@example.com';
    p.phone = '+1 (555) 010-0000';
    p.loc = 'City, Country';
    p.target = 'Program Name, Target University / Scholarship';
    p.links = [
      { label: 'LinkedIn', url: 'linkedin.com/in/yourname' },
      { label: 'Google Scholar', url: 'scholar.google.com/citations' },
      { label: 'GitHub', url: 'github.com/yourname' }
    ];
    p.photo = SIL; p.showPhoto = true; p.photoColor = true;
    p.dob = 'DD Month YYYY'; p.nationality = 'Your Nationality'; p.father = "Father's Full Name"; p.showPersonal = true;
    const S = d.sections;
    const B = [
      'Led a small team to deliver a sample project two weeks ahead of schedule.',
      'Improved a key performance metric by 25% through careful testing and iteration.',
      'Prepared clear technical reports and presented results to supervisors.'
    ];
    const ent = function (p_, s_, loc, ds, de, note, b, cur) { return { p: p_, s: s_, loc: loc, ds: ds, de: de, cur: !!cur, note: note || '', b: b }; };
    function on(k) { S[k].on = true; }
    S.summary.text = 'Motivated engineering student with a solid foundation in circuits, programming and research, looking to apply technical skills and teamwork to real-world problems.'; on('summary');
    S.research_interests.text = 'Research Area One, Research Area Two, Research Area Three'; on('research_interests');
    S.education.items = [
      ent('University of Texas at Dallas', 'Degree Name, Major', 'Richardson, TX, USA', '20XX', '20XX', 'CGPA: 0.00 / 4.00', ['Relevant courses: Course One, Course Two, Course Three']),
      ent('Bangladesh University of Engineering and Technology (BUET)', 'Degree Name, Major', 'Dhaka, Bangladesh', '20XX', '20XX', 'CGPA: 0.00 / 4.00', ['Thesis: Sample thesis title'])
    ]; on('education');
    S.experience.items = [
      ent('Organization Name', 'Position Title', 'City, Country', 'Jan 20XX', '', '', B, true),
      ent('Organization Name', 'Intern', 'City, Country', 'Jun 20XX', 'Aug 20XX', '', B.slice(0, 2))
    ]; on('experience');
    S.research.items = [ent('Lab or Group Name', 'Research Assistant', 'University', 'Jan 20XX', '', '', B, true)]; on('research');
    S.projects.items = [
      ent('Project Title', 'Tools Used', '', 'May 20XX', 'Sep 20XX', '', B),
      ent('Project Title', 'Tools Used', '', 'Jan 20XX', 'Apr 20XX', '', B.slice(0, 2))
    ]; on('projects');
    S.leadership.items = [ent('Club or Society Name', 'Role Title', '', '20XX', '20XX', '', B.slice(0, 2))]; on('leadership');
    S.training.items = [ent('Training Name', 'Institute Name', '', 'Month 20XX', '', '', [B[2]])]; on('training');
    S.volunteer.items = [ent('Organization Name', 'Volunteer Role', '', '20XX', '20XX', '', B.slice(0, 1))];
    S.awards.items = [{ t: 'Award or Scholarship Name – Awarding Body, 20XX' }, { t: "Dean's List – 20XX" }]; on('awards');
    S.certs.items = [{ t: 'Certification Name – Issuer, 20XX' }, { t: 'Certification Name – Issuer, 20XX' }]; on('certs');
    S.publications.items = [
      { t: '**Showrov, M. S. S.**, Author, A. "Sample Paper Title." Journal Name, 20XX. (Published)' },
      { t: 'Author, A., **Showrov, M. S. S.** "Another Sample Title." Conference Name, 20XX. (Under review)' }
    ]; on('publications');
    S.tests.items = [{ t: 'IELTS: 0.0  |  TOEFL: 000  |  GRE: 000' }]; on('tests');
    S.skills.items = [
      { label: 'Programming', text: 'Python, C++, MATLAB, SQL', level: 90 },
      { label: 'Tools', text: 'Tool One, Tool Two, Tool Three', level: 75 },
      { label: 'Lab Skills', text: 'Skill One, Skill Two', level: 60 },
      { label: 'Writing', text: 'Technical reports, papers', level: 80 }
    ]; on('skills');
    S.softskills.items = [{ t: 'Teamwork' }, { t: 'Time Management' }, { t: 'Communication' }, { t: 'Problem Solving' }]; on('softskills');
    S.languages.items = [{ t: 'English – Fluent' }, { t: 'Bengali – Native' }]; on('languages');
    S.hobbies.items = [{ t: 'Photography' }, { t: 'Football' }, { t: 'Cooking' }]; on('hobbies');
    S.references.items = [
      { name: 'Referee Name', title: 'Title', org: 'Institution', email: 'name@example.com', phone: '+1 (555) 010-0001' },
      { name: 'Referee Name', title: 'Title', org: 'Organization', email: 'name@example.com', phone: '+1 (555) 010-0002' }
    ]; on('references');
    return d;
  }

  global.ECB = global.ECB || {};
  Object.assign(global.ECB, {
    SECTION_DEFS: SECTION_DEFS, LINK_PRESETS: LINK_PRESETS, newItem: newItem, newDoc: newDoc,
    esc: esc, rich: rich, nonEmpty: nonEmpty, dateText: dateText, usable: usable, hasContent: hasContent,
    cloneDoc: cloneDoc, normalizeUrl: normalizeUrl, validUrl: validUrl, validEmail: validEmail,
    missingFields: missingFields, sampleDoc: sampleDoc, SIL: SIL
  });
})(window);
