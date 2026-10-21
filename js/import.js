/* Easy CV Builder - read an old CV (PDF or Word) in the browser and sort it into fields.
   Everything happens on the user's device. Rule-based, so the result always needs a quick review. */
(function (global) {
  'use strict';
  const E = global.ECB;
  const nonEmpty = E.nonEmpty;
  const SCRIPT_URL = (document.currentScript && document.currentScript.src) || global.location.href;

  /* ---------- reading files ---------- */
  async function pdfLines(buf) {
    const pdfjs = await import('../vendor/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdf.worker.min.mjs', SCRIPT_URL).href;
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const lines = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const tc = await page.getTextContent();
      const rows = [];
      tc.items.forEach(function (it) {
        if (!it.str || !it.str.trim()) { if (it.str === ' ') { /* spacing item */ } return; }
        const y = it.transform[5], x = it.transform[4];
        let row = rows.filter(function (r) { return Math.abs(r.y - y) < 2.6; })[0];
        if (!row) { row = { y: y, items: [] }; rows.push(row); }
        row.items.push({ x: x, w: it.width || 0, s: it.str });
      });
      rows.sort(function (a, b) { return b.y - a.y; });
      rows.forEach(function (r) {
        r.items.sort(function (a, b) { return a.x - b.x; });
        let s = '', end = null;
        r.items.forEach(function (it) {
          if (end !== null) { const gap = it.x - end; s += gap > 28 ? '\t' : (gap > 1.2 ? ' ' : ''); }
          s += it.s; end = it.x + it.w;
        });
        lines.push(s.replace(/[ ]{2,}/g, ' ').trim());
      });
      lines.push('');
    }
    return lines;
  }
  async function docxLines(buf) {
    if (!global.JSZip) throw new Error('The Word reader did not load.');
    const zip = await global.JSZip.loadAsync(buf);
    const f = zip.file('word/document.xml');
    if (!f) throw new Error('This file does not look like a Word document.');
    const xml = new DOMParser().parseFromString(await f.async('string'), 'application/xml');
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const lines = [];
    const emit = function (s, listed) {
      s.split('\n').forEach(function (part, j) {
        part = part.replace(/[ ]{2,}/g, ' ').trim();
        lines.push(listed && j === 0 && part ? '\u2022 ' + part : part);
      });
    };
    const para = function (p) {
      let s = '';
      const listed = p.getElementsByTagNameNS(W, 'numPr').length > 0 && !p.querySelector('p p');
      const walk = function (node) {
        for (let c = node.firstChild; c; c = c.nextSibling) {
          if (c.nodeType !== 1) continue;
          const ln = c.localName;
          if (ln === 'Fallback') continue;
          if (ln === 't') s += c.textContent;
          else if (ln === 'tab') s += '\t';
          else if (ln === 'br') s += '\n';
          else if (ln === 'p') { emit(s, false); s = ''; para(c); }
          else walk(c);
        }
      };
      walk(p);
      emit(s, listed);
    };
    const all = xml.getElementsByTagNameNS(W, 'p');
    for (let i = 0; i < all.length; i++) {
      let top = true;
      for (let a = all[i].parentNode; a; a = a.parentNode) { if (a.localName === 'p') { top = false; break; } }
      let fb = false;
      for (let a = all[i].parentNode; a; a = a.parentNode) { if (a.localName === 'Fallback') { fb = true; break; } }
      if (top && !fb) para(all[i]);
    }
    return lines;
  }

  /* ---------- parsing ---------- */
  const HEAD = {
    summary: ['summary', 'professional summary', 'profile', 'career objective', 'objective', 'executive summary', 'about me', 'personal statement', 'career summary', 'profile summary'],
    research_interests: ['research interest', 'research interests', 'areas of interest'],
    education: ['education', 'academic background', 'educational qualification', 'educational qualifications', 'academic qualification', 'academic qualifications', 'qualifications', 'academic record'],
    experience: ['experience', 'work experience', 'professional experience', 'professional experiences', 'employment', 'employment history', 'work history', 'internship', 'internships', 'related experience', 'additional experience', 'industry experience', 'teaching experience'],
    research: ['research experience', 'research', 'research work'],
    projects: ['projects', 'academic projects', 'personal projects', 'selected projects', 'project experience', 'undergraduate thesis', 'thesis', 'key technical projects and research', 'key technical projects', 'technical projects', 'projects and research', 'key projects', 'selected projects and research'],
    leadership: ['leadership', 'leadership and extracurriculars', 'leadership & extracurriculars', 'extracurriculars', 'extracurricular', 'leadership and extracurricular', 'leadership & extracurricular activities', 'leadership and extracurricular activities', 'extracurricular activities', 'extra curricular activities', 'extra-curricular activities', 'activities', 'leadership and involvement', 'involvement', 'co-curricular activities'],
    training: ['training', 'trainings', 'professional training', 'trainings & workshops', 'trainings and workshops', 'training & workshops', 'workshops', 'courses', 'professional development'],
    volunteer: ['volunteer', 'volunteering', 'volunteer experience', 'volunteer work', 'community service'],
    awards: ['awards', 'honors', 'honours', 'honors and awards', 'honors & awards', 'achievements', 'awards and scholarships', 'scholarships', 'credentials and awards', 'awards & honors', 'awards and honors', 'accomplishments'],
    certs: ['certifications', 'certification', 'certificates', 'licenses', 'selective certifications', 'certifications and licenses', 'selected certifications'],
    publications: ['publications', 'publication', 'research publication', 'research publications', 'research publications and projects', 'papers', 'journal publications', 'conference papers', 'publications and presentations', 'presentations'],
    tests: ['test scores', 'test score', 'standardized tests', 'language tests', 'test results', 'english proficiency'],
    skills: ['skills', 'technical skills', 'computer skills', 'additional skills', 'skills summary', 'skills and qualifications', 'skills / qualifications', 'core skills', 'key skills', 'tools', 'software skills', 'skills & interests', 'skills and tools'],
    softskills: ['soft skills'],
    languages: ['languages', 'language proficiency', 'language skills'],
    hobbies: ['hobbies', 'interests', 'hobbies and interests', 'hobbies & interests'],
    references: ['references', 'referees', 'reference'],
    personal: ['additional information', 'personal information', 'personal details', 'personal data', 'personal profile']
  };
  const HEADMAP = {};
  Object.keys(HEAD).forEach(function (k) { HEAD[k].forEach(function (h) { HEADMAP[h] = k; }); });
  function headKey(line) {
    if (!line || line.length > 55 || /[.@]/.test(line.replace(/&|\//g, ''))) return null;
    const n = line.replace(/\t/g, ' ').replace(/[:|_—–\-]+$/g, '').replace(/[^A-Za-z&/ ]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    return HEADMAP[n] || null;
  }

  const MON = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?,?';
  const YR = '(?:19|20)\\d{2}';
  const ONE = '(?:' + MON + '\\s+)?' + YR;
  const RANGE = new RegExp('(' + ONE + ')\\s*(?:[\\u2013\\u2014-]|to)\\s*(' + ONE + '|Present|Current|Ongoing|Now|Expected[^\\t]*)', 'i');
  const SINGLE = new RegExp('(?:Expected\\s+)?' + ONE, 'i');
  const BUL = /^\s*(?:[•●▪■□‣⁃◦∙·▫–—*-]|o(?=\s))\s+/;
  const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
  const PHONE = /(?:\+?\d[\d\s().-]{8,}\d)/;
  const URL_RE = /(?:https?:\/\/|www\.)[^\s,;|)]+|(?:linkedin\.com|github\.com|scholar\.google\.com|researchgate\.net|orcid\.org)[^\s,;|)]*/gi;

  function stripBullet(s) { return s.replace(BUL, '').trim(); }
  function isBullet(s) { return BUL.test(s); }
  function toDates(s) {
    const m = s.match(RANGE);
    if (m) {
      const present = /present|current|ongoing|now/i.test(m[2]);
      return { ds: m[1].trim(), de: present ? '' : m[2].trim(), cur: present, rest: s.replace(m[0], ' ').replace(/[()|]/g, ' ').replace(/\s+/g, ' ').trim() };
    }
    const one = s.match(SINGLE);
    if (one && s.length < 70) return { ds: one[0].trim(), de: '', cur: false, rest: s.replace(one[0], ' ').replace(/[()|]/g, ' ').replace(/\s+/g, ' ').trim() };
    return null;
  }
  function labelFor(u) {
    if (/linkedin/i.test(u)) return 'LinkedIn';
    if (/github/i.test(u)) return 'GitHub';
    if (/scholar\.google/i.test(u)) return 'Google Scholar';
    if (/researchgate/i.test(u)) return 'ResearchGate';
    if (/orcid/i.test(u)) return 'ORCID';
    return 'Website';
  }

  function parseEntries(lines) {
    const items = [];
    let cur = null;
    const fresh = function () { cur = { p: '', s: '', loc: '', ds: '', de: '', cur: false, note: '', b: [] }; items.push(cur); return cur; };
    lines.forEach(function (raw) {
      const line = raw.trim();
      if (!line) return;
      if (isBullet(line)) {
        if (!cur) fresh();
        cur.b.push(stripBullet(line));
        return;
      }
      const text = line.replace(/\t+/g, '  ');
      if (cur && cur.b.length) {
        const last = cur.b[cur.b.length - 1];
        const looksTitle = RANGE.test(text) || (text.length < 70 && /^[A-Z0-9]/.test(text) && /[A-Za-z]/.test(text) && !/[a-z]\s+[a-z]+\s+[a-z]+\s+[a-z]+/.test(text) && /[.!?)]$/.test(last));
        if (!looksTitle || /^[a-z(]/.test(text)) { cur.b[cur.b.length - 1] = last + ' ' + text; return; }
      }
      if (!cur || cur.b.length) fresh();
      let d = toDates(text), body = text;
      if (d) { if (!cur.ds && !cur.de) { cur.ds = d.ds; cur.de = d.de; cur.cur = d.cur; } body = d.rest; }
      body = body.replace(/\s{2,}/g, ' | ');
      const parts = body.split(/\s\|\s/).map(function (x) { return x.trim(); }).filter(Boolean);
      parts.forEach(function (part) {
        if (/\b(cgpa|gpa|grade|result|percentage|honou?rs?|summa|magna)\b/i.test(part) && !cur.note) cur.note = part;
        else if (!cur.p) cur.p = part;
        else if (!cur.s) cur.s = part;
        else if (!cur.loc && part.length < 50) cur.loc = part;
        else cur.note = cur.note ? cur.note + ' ' + part : part;
      });
    });
    items.forEach(function (it) { if (!it.b.length) it.b = ['']; });
    return items;
  }

  /* education: each school is one block (institution, location, degree, dates, CGPA) */
  const EDU_INST = /\b(universit\w*|college|institute|institution|school|academy|polytechnic|madrasa\w*|buet|iit|iut|bracu|nsu|cadet)\b/i;
  const EDU_DEG = /\b(bachelor\w*|master\w*|b\.?\s?sc\.?|m\.?\s?sc\.?|b\.?\s?eng\.?|m\.?\s?eng\.?|b\.?\s?tech|m\.?\s?tech|ph\.?\s?d\.?|doctor\w*|diploma|higher secondary|secondary school certificate|secondary|hsc|ssc|a[- ]levels?|o[- ]levels?|associate|mba|bba|degree|honou?rs|undergraduate|graduate)\b/i;
  const EDU_RES = /\b(cgpa|gpa|grade point|percentage|class rank|result|first class|distinction)\b/i;
  const EDU_RES_TAKE = /((?:cgpa|gpa|grade point average|percentage|result)s?\s*[:\-]?\s*[\d.]+\s*(?:\/|out of)?\s*[\d.]*(?:\s*%)?)/i;
  function parseEducation(lines) {
    const items = []; let cur = null;
    const blank = function () { return { p: '', s: '', loc: '', ds: '', de: '', cur: false, note: '', b: [] }; };
    const need = function (field) { if (!cur || (field && cur[field])) { cur = blank(); items.push(cur); } return cur; };
    function piece(part) {
      part = part.trim(); if (!part) return;
      const rm = part.match(EDU_RES_TAKE);
      if (rm) {
        const rest = (part.slice(0, rm.index) + ' ' + part.slice(rm.index + rm[0].length)).replace(/^[\s,;:|\-–]+|[\s,;:|\-–]+$/g, '');
        need(); if (!cur.note) cur.note = rm[1].trim(); else cur.b.push(rm[1].trim());
        if (rest) piece(rest);
        return;
      }
      if (EDU_RES.test(part) && part.length < 60) { need(); if (!cur.note) cur.note = part; else cur.b.push(part); return; }
      /* LaTeX-style line where the city follows the school name without a comma: "... Technology Dhaka, Bangladesh" */
      const glued = part.match(/^(.*\b(?:University|College|Institute|School|Academy|Technology|Engineering|Sciences?|Polytechnic|Madrasa|Madrasah))\s+([A-Z][a-z]+),\s*([A-Z][A-Za-z .]+)$/);
      if (glued && !/\b(?:at|of|in|and|for)$/i.test(glued[1])) part = glued[1] + ', ' + glued[2] + ', ' + glued[3];
      const hasInst = EDU_INST.test(part), hasDeg = EDU_DEG.test(part);
      if (hasInst && hasDeg && part.indexOf(',') > 0) {
        const ps = part.split(/,\s*/); let dg = [], ins = '', lc = [];
        ps.forEach(function (x) { if (!ins && EDU_INST.test(x)) ins = x; else if (!ins) dg.push(x); else lc.push(x); });
        if (ins && dg.length) {
          if (!cur || cur.p || cur.s) { cur = blank(); items.push(cur); }
          cur.s = dg.join(', '); cur.p = ins; if (lc.length) cur.loc = lc.join(', '); return;
        }
      }
      if (hasInst && !(hasDeg && /^(bachelor|master|b\.?\s?sc|m\.?\s?sc|diploma|higher secondary|ph\.?d|secondary)/i.test(part))) {
        const c = part.indexOf(',');
        need('p');
        if (c > 3 && c < part.length - 2) { cur.p = part.slice(0, c).trim(); if (!cur.loc) cur.loc = part.slice(c + 1).trim(); } else cur.p = part;
        return;
      }
      if (hasDeg) { need('s'); cur.s = part; return; }
      if (!cur) { need(); }
      if (!cur.loc && part.length < 50 && !/[.!?]$/.test(part) && /^[A-Z]/.test(part) && part.split(/\s+/).length <= 6) { cur.loc = part; return; }
      cur.b.push(part);
    }
    lines.forEach(function (raw) {
      const line = raw.trim(); if (!line) return;
      if (isBullet(line)) {
        const t = stripBullet(line);
        /* a bullet that names a school or college starts the next education entry (it is not a note of the previous one) */
        if (EDU_RES.test(t) || EDU_RES_TAKE.test(t) || (cur && cur.p && EDU_INST.test(t) && t.length < 90 && /^[A-Z]/.test(t) && !/[.!?]$/.test(t))) piece(t); else { need(); cur.b.push(t); }
        return;
      }
      let text = line.replace(/\t+/g, '  '), d = toDates(text);
      /* dates on a new school line belong to that new school, not to the one above */
      if (d && cur && (cur.ds || cur.de || cur.cur) && EDU_INST.test(d.rest)) { cur = blank(); items.push(cur); }
      if (d) { need(); if (!cur.ds && !cur.de && !cur.cur) { cur.ds = d.ds; cur.de = d.de; cur.cur = d.cur; } text = d.rest; }
      text.replace(/\s{2,}/g, ' | ').split(/\s\|\s/).forEach(piece);
    });
    /* repair: a school name stuck to the end of the previous entry's result or notes moves to the entry that has no school */
    items.forEach(function (it, i) {
      if (!i || it.p) return;
      const prev = items[i - 1];
      const m = (prev.note || '').match(EDU_RES_TAKE);
      const tail = m ? prev.note.slice(m.index + m[0].length).replace(/^[\s,;:|\-–]+/, '').trim() : '';
      let src = null;
      if (tail && EDU_INST.test(tail)) { src = tail; prev.note = m[1].trim(); }
      else if (prev.b.length && EDU_INST.test(prev.b[prev.b.length - 1]) && !EDU_RES.test(prev.b[prev.b.length - 1])) { src = prev.b.pop(); if (!prev.b.length) prev.b = ['']; }
      if (!src) return;
      const c = src.indexOf(',');
      if (c > 3 && c < src.length - 2) { it.p = src.slice(0, c).trim(); if (!it.loc) it.loc = src.slice(c + 1).trim(); } else it.p = src.trim();
    });
    /* tidy every field: single spaces, no empty brackets, no stray separators */
    const tidy = function (x) { return String(x || '').replace(/[\t\u00a0]+/g, ' ').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').replace(/^[\s,;:|\-\u2013\u2014]+|[\s,;:|\-\u2013\u2014]+$/g, '').trim(); };
    items.forEach(function (it) { ['p', 's', 'loc', 'note'].forEach(function (k) { it[k] = tidy(it[k]); }); it.b = it.b.map(tidy).filter(Boolean); });
    items.forEach(function (it) { if (!it.b.length) it.b = ['']; });
    return items;
  }
  function parseList(lines) {
    const out = [];
    lines.forEach(function (raw) {
      const line = raw.trim().replace(/\t+/g, '  ');
      if (!line) return;
      const t = stripBullet(line);
      if (out.length && !isBullet(line) && /^[a-z(]/.test(t)) out[out.length - 1].t += ' ' + t;
      else out.push({ t: t });
    });
    return out;
  }
  function parseSkills(lines) {
    const out = [];
    lines.forEach(function (raw) {
      const t = stripBullet(raw.trim().replace(/\t+/g, ' '));
      if (!t) return;
      const m = t.match(/^([^:]{2,40}):\s*(.+)$/);
      if (m) out.push({ label: m[1].trim(), text: m[2].trim(), level: 0 });
      else if (out.length && /^[a-z(]/.test(t)) out[out.length - 1].text += ' ' + t;
      else out.push({ label: '', text: t, level: 0 });
    });
    return out;
  }
  function parseRefs(lines) {
    const out = []; let cur = null;
    lines.forEach(function (raw) {
      const t = raw.trim().replace(/\t+/g, '  '); if (!t) { cur = null; return; }
      if (!cur) { cur = { name: '', title: '', org: '', email: '', phone: '' }; out.push(cur); }
      const em = t.match(EMAIL), ph = t.match(PHONE);
      if (em) cur.email = em[0];
      if (ph && !em) cur.phone = ph[0].trim();
      if (!em && !ph) { if (!cur.name) cur.name = t; else if (!cur.title) cur.title = t; else cur.org = cur.org ? cur.org + ', ' + t : t; }
      if (em && cur.name) cur = null;
    });
    return out.filter(function (r) { return nonEmpty(r.name) || nonEmpty(r.email); });
  }

  function parse(lines, docIn) {
    const doc = docIn || E.newDoc('t2');
    const p = doc.person;
    const all = lines.join('\n');
    const stats = { sections: 0, entries: 0, unsorted: 0 };

    /* header information */
    const em = all.match(EMAIL); if (em) p.email = em[0];
    const head = lines.slice(0, 14).join('\n');
    const phm = head.match(PHONE); if (phm) p.phone = phm[0].trim();
    const seen = {};
    (all.match(URL_RE) || []).forEach(function (u) {
      u = u.replace(/[.,;]+$/, '');
      if (EMAIL.test(u) || seen[u.toLowerCase()]) return;
      seen[u.toLowerCase()] = 1;
      if (p.links.length < 6) p.links.push({ label: labelFor(u), url: u });
    });
    const personal = [];
    let bodyLines = lines.slice();
    bodyLines = bodyLines.filter(function (l) {
      const m = l.match(/^(date of birth|dob|nationality|father'?s? name|father)\s*[:\-]\s*(.+)$/i);
      if (m) { personal.push([m[1].toLowerCase(), m[2].trim()]); return false; }
      return true;
    });
    personal.forEach(function (r) {
      if (/birth|dob/.test(r[0])) p.dob = r[1]; else if (/nation/.test(r[0])) p.nationality = r[1]; else p.father = r[1];
    });
    if (personal.length) { p.showPersonal = true; doc.touched.personal = true; }

    /* split into sections */
    let firstHead = bodyLines.findIndex(function (l) { return headKey(l); });
    if (firstHead < 0) firstHead = bodyLines.length;
    const top = bodyLines.slice(0, firstHead).filter(nonEmpty);
    const nameWords = function (l) { return l.split(/\s+/); };
    const looksName = function (l) {
      const w = nameWords(l.replace(/\t+/g, ' ').trim());
      return w.length >= 2 && w.length <= 5 && l.length < 45 && !/[,@\d]/.test(l) && w.every(function (x) { return /^[A-Z\u00C0-\u00DE][A-Za-z\u00C0-\u00FF.'\u2019-]*$/.test(x); });
    };
    const nm = top.slice(0, 14).filter(looksName)[0] || lines.slice(0, 30).filter(looksName)[0] || top.filter(function (l) { return !EMAIL.test(l) && !/\d/.test(l) && nameWords(l).length >= 2 && nameWords(l).length <= 6 && l.length < 50; })[0];
    if (nm) p.name = nm.replace(/\t+/g, ' ').trim();
    let used = nm;
    const capRatio = function (l) { const w = l.split(/\s+/); return w.filter(function (x) { return /^[A-Z]/.test(x); }).length / w.length; };
    const tl = top.filter(function (l) { return capRatio(l) >= 0.6 && !/information|experience|education|skills|training|references|summary|projects|profile|objective/i.test(l) && l.split(/\s+/).length <= 7 && l !== used && !EMAIL.test(l) && !PHONE.test(l) && !/\d/.test(l) && l.length < 70 && l.length > 3 && !URL_RE.test(l) && !/linkedin|github|scholar|researchgate|website/i.test(l); })[0];
    URL_RE.lastIndex = 0;
    if (tl) {
      if (/,/.test(tl) && tl.split(/\s+/).length <= 5) p.loc = tl.trim(); else p.title = tl.replace(/\t+/g, ' ').trim();
    }
    const blocks = [];
    let curB = null;
    bodyLines.slice(firstHead).forEach(function (l) {
      const k = headKey(l);
      if (k) { curB = { key: k, head: l.replace(/[:\t]+$/g, '').trim(), lines: [] }; blocks.push(curB); }
      else if (curB) curB.lines.push(l);
    });
    const S = doc.sections;
    let unsorted = [];
    blocks.forEach(function (b) {
      const lines2 = b.lines;
      let key = b.key;
      if (key === 'personal') {
        lines2.forEach(function (l) {
          const m = l.match(/^([^:]{3,25}):\s*(.+)$/);
          if (m && /birth|dob/i.test(m[1])) p.dob = m[2]; else if (m && /nation/i.test(m[1])) p.nationality = m[2];
          else if (m && /father/i.test(m[1])) p.father = m[2];
        });
        if (p.dob || p.nationality || p.father) { p.showPersonal = true; doc.touched.personal = true; }
        return;
      }
      const sec = S[key];
      if (!sec) return;
      if (sec.kind === 'text') { const t = lines2.map(function (x) { return x.trim(); }).filter(Boolean).join(' '); if (t) { sec.text = sec.text ? sec.text + ' ' + t : t; sec.on = true; stats.sections++; } return; }
      let items = [];
      if (key === 'education') items = parseEducation(lines2);
      else if (sec.kind === 'entry') items = parseEntries(lines2);
      else if (sec.kind === 'list') items = parseList(lines2);
      else if (sec.kind === 'skills') items = parseSkills(lines2);
      else if (sec.kind === 'refs') items = parseRefs(lines2);
      if (!items.length) return;
      sec.items = sec.items.concat(items); sec.on = true; stats.sections++; stats.entries += items.length;
    });
    /* anything before the first heading that is not header material goes to the summary */
    const rest = top.filter(function (l) { return l !== used && l !== tl && !EMAIL.test(l) && !PHONE.test(l) && l.length > 60; });
    if (rest.length && !S.summary.text) { S.summary.text = rest.join(' '); S.summary.on = true; }
    doc._importStats = stats;
    return doc;
  }

  async function readLines(file) {
    const buf = await file.arrayBuffer();
    const name = (file.name || '').toLowerCase();
    let lines;
    if (/\.pdf$/.test(name) || file.type === 'application/pdf') lines = await pdfLines(buf);
    else if (/\.docx$/.test(name)) lines = await docxLines(buf);
    else throw new Error('Please choose a PDF or a Word (.docx) file.');
    if (lines.join('').trim().length < 30) throw new Error('No readable text was found. This looks like a scanned or image-only file. Please upload a text-based PDF or Word file, or type your details in.');
    return lines;
  }
  async function importFile(file, docIn) { return parse(await readLines(file), docIn); }

  E.readLines = readLines;
  E.importFile = importFile;
  E._importParse = parse;
})(window);
