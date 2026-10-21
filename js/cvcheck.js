/* Easy CV Builder - CV check. Compares a CV with a job post and lists improvements.
   Everything runs in the browser. Nothing is uploaded, stored or logged.
   Rule-based (no AI): it is a guide, not a judge. */
(function () {
  'use strict';
  const $ = function (id) { return document.getElementById(id); };
  const E = window.ECB, A = window.ECB_APP;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  let cvFile = null, cvLines = null, useMine = false;

  /* ---------- word lists ---------- */
  const STOP = new Set(('a,about,above,across,after,again,all,also,am,an,and,any,are,as,at,be,because,been,before,being,between,both,but,by,can,could,did,do,does,doing,down,during,each,either,etc,few,for,from,further,had,has,have,having,he,her,here,hers,him,his,how,i,if,in,into,is,it,its,just,may,me,might,more,most,must,my,no,nor,not,now,of,off,on,once,only,or,other,our,out,over,own,same,shall,she,should,so,some,such,than,that,the,their,them,then,there,these,they,this,those,through,to,too,under,until,up,us,very,was,we,were,what,when,where,which,while,who,whom,why,will,with,would,you,your,per,via,within,without,upon,among,whether,well,able,ability,including,include,includes,preferred,required,requirements,requirement,qualification,qualifications,responsibilities,responsibility,candidate,candidates,applicant,applicants,job,position,role,company,team,work,working,works,years,year,experience,experienced,strong,good,excellent,knowledge,skills,skill,ideal,plus,least,minimum,related,relevant,using,use,used,new,high,level,deadline,apply,application,salary,benefits,location,vacancy,duties,looking,seeking,join,opportunity,department,office,time,full,part,etc,like,make,help,need,needs,required,ensure,provide,support,maintain,develop,manage,perform,prepare,assist,various,based,field,fields,degree,bachelor,master,masters,education,educational,subject,subjects,preferably,similar,equivalent,minimum,maximum,age,gender,male,female,bangladesh,dhaka').split(','));
  const SKILLS = ('python,java,javascript,typescript,c++,c#,sql,mysql,postgresql,mongodb,excel,power bi,tableau,matlab,simulink,labview,verilog,vhdl,fpga,arduino,autocad,solidworks,ansys,spss,stata,r programming,sap,erp,jira,git,github,linux,docker,kubernetes,aws,azure,react,node,html,css,php,laravel,django,flask,machine learning,deep learning,data analysis,data science,statistics,communication,leadership,teamwork,problem solving,project management,time management,negotiation,presentation,research,report writing,microsoft office,word,powerpoint,photoshop,illustrator,figma,seo,digital marketing,social media,sales,marketing,accounting,finance,auditing,budgeting,customer service,supply chain,logistics,procurement,quality control,six sigma,lean,hr,recruitment,training,english,bangla,analytical,critical thinking,adaptability,networking,embedded systems,iot,vlsi,circuit design,pcb,power systems,telecommunications,5g,rf,antenna,signal processing,control systems,plc,scada,renewable energy,solar').split(',');
  const VERBS = new Set(('achieved,administered,analyzed,analysed,built,collaborated,completed,conducted,configured,contributed,coordinated,created,decreased,delivered,deployed,designed,developed,directed,drove,earned,established,evaluated,executed,expanded,facilitated,generated,guided,identified,implemented,improved,increased,initiated,integrated,introduced,launched,led,maintained,managed,mentored,modeled,modelled,negotiated,optimized,optimised,organized,organised,oversaw,performed,planned,presented,produced,programmed,proposed,published,reduced,refactored,researched,resolved,saved,secured,simulated,solved,streamlined,supervised,taught,tested,trained,translated,upgraded,validated,wrote,won,assembled,calibrated,fabricated,measured,monitored,prepared,processed,reviewed,sold,tracked,automated,investigated,demonstrated,applied,assisted,operated,installed,debugged,drafted,authored,captained,founded,hosted,raised,ran,served,volunteered,participated,represented,spearheaded').split(','));
  const WEAK = [
    ['responsible for', 'Replace "responsible for" with a strong action verb, for example "Managed", "Built" or "Led".'],
    ['duties included', 'Replace "duties included" with what you achieved.'],
    ['worked on', 'Replace "worked on" with a clearer verb, for example "Designed", "Tested" or "Developed".'],
    ['helped', 'Replace "helped" with what you actually did, and add the result.'],
    ['hard worker', 'Words like "hard worker" are claims. Show it with results instead.'],
    ['team player', 'Words like "team player" are claims. Show it with an example of teamwork.'],
    ['hardworking', 'Words like "hardworking" are claims. Show it with results instead.'],
    ['references available', 'Remove "references available on request". Employers assume it.'],
    ['seeking a challenging', 'Replace "seeking a challenging position" with a specific goal for this job.']
  ];

  /* ---------- reading the inputs ---------- */
  function flattenDoc(doc) {
    const L = [], p = doc.person, secs = [];
    [p.name, p.title, p.email, p.phone, p.loc].forEach(function (x) { if (E.nonEmpty(x)) L.push(x); });
    (p.links || []).forEach(function (l) { if (E.nonEmpty(l.url)) L.push(l.url); });
    doc.order.forEach(function (k) {
      const sec = doc.sections[k]; if (!E.hasContent(sec)) return;
      L.push(String(sec.title || k)); secs.push(sec.title || k);
      if (sec.kind === 'text') { L.push(sec.text); return; }
      E.usable(sec).forEach(function (it) {
        if (sec.kind === 'entry') {
          [it.p, it.s, it.loc, [it.ds, it.cur ? 'Present' : it.de].filter(E.nonEmpty).join(' - '), it.note].forEach(function (x) { if (E.nonEmpty(x)) L.push(x); });
          (it.b || []).filter(E.nonEmpty).forEach(function (b) { L.push('• ' + b); });
        } else if (sec.kind === 'list') L.push('• ' + it.t);
        else if (sec.kind === 'skills') L.push([it.label, it.text].filter(E.nonEmpty).join(': '));
      });
    });
    return L.map(function (l) { return String(l).replace(/\*\*|\^\{|_\{|\}/g, ''); });
  }
  function haveMine() { const d = A && A.state && A.state.doc; return !!(d && E.usable && (E.hasContent(d.sections.education) || E.hasContent(d.sections.experience) || E.nonEmpty(d.person.name))); }
  function syncMine() {
    const m = haveMine();
    $('ckMine').hidden = !m; $('ckMineOr').hidden = !m;
  }
  $('ckCV').addEventListener('change', async function (e) {
    const f = e.target.files[0]; cvFile = f || null; cvLines = null; useMine = false; $('ckMine').classList.remove('on');
    $('ckCVMsg').textContent = f ? 'Selected: ' + f.name : '';
  });
  $('ckMine').addEventListener('click', function () {
    useMine = !useMine; this.classList.toggle('on', useMine);
    if (useMine) { cvFile = null; $('ckCV').value = ''; $('ckCVMsg').textContent = 'Using the CV you are building.'; }
    else $('ckCVMsg').textContent = '';
  });
  $('ckShot').addEventListener('change', async function (e) {
    const f = e.target.files[0]; if (!f) return;
    const msg = $('ckShotMsg'); msg.textContent = 'Reading the screenshot on your device. The first time can take about a minute...';
    try {
      if (!window.Tesseract) await new Promise(function (res, rej) {
        const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
        s.onload = res; s.onerror = function () { rej(new Error('load')); }; document.head.appendChild(s);
      });
      const r = await window.Tesseract.recognize(f, 'eng');
      const t = (r && r.data && r.data.text || '').trim();
      if (t.length < 20) throw new Error('empty');
      $('ckJob').value = t;
      msg.textContent = 'Done. Please read the text above and fix any mistakes before you press Check.';
    } catch (err) {
      msg.textContent = 'We could not read that screenshot. Please paste the text of the job post into the box instead.';
    }
    e.target.value = '';
  });

  /* ---------- analysis ---------- */
  const norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  function stem(w) { return w.replace(/(ing|ed|es|s)$/, function (m, x, off, str) { return str.length - m.length >= 4 ? '' : m; }); }
  function jobKeywords(text) {
    const t = ' ' + norm(text).replace(/[^a-z0-9+#.,\s/&-]/g, ' ') + ' ';
    const out = new Map();
    function add(term, w) { term = term.trim(); if (!term || term.length < 2) return; const k = term; out.set(k, Math.max(out.get(k) || 0, w)); }
    SKILLS.forEach(function (s) {
      const re = new RegExp('(^|[^a-z0-9+#])' + s.replace(/[+.#]/g, '\\$&') + '(?![a-z0-9+#])');
      if (re.test(t)) add(s, 3);
    });
    const re = /(?:experience|proficiency|knowledge|skills?|expertise|familiarity|background|degree|certification|certified)\s+(?:in|with|of|on)\s+([a-z0-9+#&/\- ,]{3,80}?)(?:[.;:\n()]| and\/or| or | and (?=[a-z]+ing )|$)/g;
    let m;
    while ((m = re.exec(t))) {
      m[1].split(/,| and | or |\//).forEach(function (p) {
        const words = p.trim().split(/\s+/).filter(function (w) { return !STOP.has(w); });
        if (words.length && words.length <= 3) add(words.join(' '), 2);
      });
    }
    const freq = {};
    t.split(/[\s/&-]+/).forEach(function (w) { w = w.replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/g, ''); if (w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w)) freq[w] = (freq[w] || 0) + 1; });
    Object.keys(freq).filter(function (w) { return freq[w] >= 2; }).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 12).forEach(function (w) { add(w, 1); });
    // keep the shorter term when a longer phrase only repeats it ("plc programming" -> "plc")
    const arr = Array.from(out.keys());
    const wordIn = function (small, big) { return (' ' + big + ' ').indexOf(' ' + small + ' ') >= 0; };
    return arr.filter(function (k) {
      return !arr.some(function (o) {
        if (o === k) return false;
        if (wordIn(k, o) && out.get(o) >= out.get(k)) return true;   /* a longer, stronger phrase already covers it */
        if (wordIn(o, k) && out.get(o) > out.get(k)) return true;    /* a longer phrase that only repeats a stronger skill */
        return false;
      });
    }).sort(function (a, b) { return out.get(b) - out.get(a); }).slice(0, 28).map(function (k) { return { term: k, w: out.get(k) }; });
  }
  function hasTerm(cvNorm, cvStem, term) {
    if (cvNorm.indexOf(term) >= 0) return true;
    const ts = term.split(/\s+/).map(stem).join(' ');
    return cvStem.indexOf(ts) >= 0;
  }
  function analyse(lines, job, mineDoc) {
    const text = lines.join('\n'), cvN = norm(text), cvS = cvN.split(/\s+/).map(stem).join(' ');
    const words = (text.match(/[A-Za-zঀ-৿0-9+#']+/g) || []).length;
    const items = [];
    function it(level, title, tip) { items.push({ level: level, title: title, tip: tip }); }

    // sections
    const headRe = {
      education: /^(education|academic|qualifications?)\b/i,
      experience: /^(work |professional |relevant |related |internship|employment|experience|research experience)/i,
      projects: /^(academic |personal |selected |key )?projects?\b/i,
      skills: /^(technical |key |core |additional )?skills?\b|^competenc/i,
      summary: /^(summary|profile|objective|career objective|professional summary|about me|executive summary)\b/i
    };
    const found = { education: 0, experience: 0, projects: 0, skills: 0, summary: 0 };
    if (mineDoc) {
      const g = function (k) { return E.hasContent(mineDoc.sections[k]); };
      found.education = g('education'); found.experience = g('experience') || g('internship') || g('research'); found.projects = g('projects'); found.skills = g('skills');
      found.summary = g('summary') || g('objective');
    } else lines.forEach(function (l) { const t = l.trim(); if (t.length > 40 || t.length < 4) return; Object.keys(headRe).forEach(function (k) { if (headRe[k].test(t)) found[k] = 1; }); });
    // contact
    const email = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text), phone = /(\+?\d[\d\s().-]{8,}\d)/.test(text);
    const linkedin = /linkedin\.com/i.test(text), github = /github\.com/i.test(text);
    if (!email) it('fix', 'No email address found', 'Add a professional email address at the top, for example firstname.lastname@gmail.com.');
    if (!phone) it('fix', 'No phone number found', 'Add a phone number with the country code, for example +880 1XXX-XXXXXX.');
    if (!linkedin) it('better', 'No LinkedIn link', 'Add your LinkedIn profile link. Many recruiters look it up.');
    if (!found.education) it('fix', 'No Education section found', 'Add an Education section with your university, degree, dates and CGPA if it is good.');
    if (!found.experience && !found.projects) it('fix', 'No Experience or Projects section found', 'Add internships, jobs, research or projects. If you have little experience, projects and activities are fine.');
    if (!found.skills) it('fix', 'No Skills section found', 'Add a Skills section. Use the same names the job post uses, for example "MATLAB" or "Excel".');
    if (!found.summary && words > 80) it('better', 'No short summary at the top', 'Add 2 to 3 lines at the top that say who you are and what you want, written for this job.');
    // length
    if (words < 150) it('fix', 'The CV looks very short (about ' + words + ' words)', 'Add more detail about what you did and the results.');
    else if (words > 900) it('better', 'The CV looks long (about ' + words + ' words)', 'Most jobs and internships want 1 page. Abroad applications can use 2. Cut older or less relevant items.');
    else it('ok', 'Length looks fine (about ' + words + ' words)', '');
    // bullets
    let bullets = lines.filter(function (l) { return /^\s*[•●▪–—*\-·]\s*\S/.test(l); }).map(function (l) { return l.replace(/^\s*[^\w(]+\s*/, '').trim(); });
    if (bullets.length >= 3) {
      const starts = bullets.filter(function (b) { return VERBS.has(norm(b.split(/\s+/)[0]).replace(/[^a-z]/g, '')); }).length;
      const nums = bullets.filter(function (b) { return /\d/.test(b); }).length;
      const longB = bullets.filter(function (b) { return b.split(/\s+/).length > 32; }).length;
      if (starts / bullets.length < 0.5) it('better', 'Many bullet points do not start with an action verb (' + starts + ' of ' + bullets.length + ' do)', 'Start each bullet with a verb in the past tense, for example "Designed", "Built", "Reduced".');
      else it('ok', 'Most bullet points start with an action verb', '');
      if (nums / bullets.length < 0.3) it('better', 'Few bullet points have numbers (' + nums + ' of ' + bullets.length + ')', 'Add numbers where you can: how many, how much, how fast, how big. For example "cut testing time by 25%".');
      else it('ok', 'Good use of numbers in bullet points', '');
      if (longB) it('better', longB + ' bullet point' + (longB > 1 ? 's are' : ' is') + ' very long', 'Keep bullets to 1 or 2 lines. Put the result first.');
    } else if (found.experience || found.projects) it('better', 'Bullet points were not detected', 'Describe each job or project in short bullet points. The check could not find them, which can also happen with some PDF designs.');
    // weak phrases
    const low = cvN;
    WEAK.forEach(function (w) { if (low.indexOf(w[0]) >= 0) it('better', 'Weak wording: "' + w[0] + '"', w[1]); });
    const pron = (text.match(/\b(I|my|me)\b/g) || []).length;
    if (pron > 3) it('better', 'The CV uses "I" or "my" ' + pron + ' times', 'Write without "I" or "my". For example "Led a team of 4" instead of "I led my team of 4".');
    // dates
    const years = (text.match(/\b(19|20)\d{2}\b/g) || []).length;
    if (years < 2 && (found.education || found.experience)) it('better', 'Few dates found', 'Add dates (month and year) to education, jobs and projects so recruiters can follow your timeline.');
    // personal details for abroad
    const personal = /(date of birth|d\.?o\.?b\b|father'?s name|mother'?s name|marital status|religion|nid\b|national id|passport (no|number))/i.test(text);
    if (personal) it('info', 'Personal details found (date of birth, father\'s name, religion or similar)', 'These are common in Bangladeshi CVs. For US, UK and Europe applications, remove them. Some Bangladeshi employers still like them.');
    // job match
    let match = null;
    if (job && job.trim().length > 30) {
      const kws = jobKeywords(job), got = [], miss = [];
      let tot = 0, have = 0;
      kws.forEach(function (k) { tot += k.w; if (hasTerm(cvN, cvS, k.term)) { have += k.w; got.push(k.term); } else miss.push(k); });
      const yrs = job.match(/(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs?)/i);
      const degree = /(ph\.?d|doctorate)/i.test(job) ? 'PhD' : /(master|msc|m\.sc|mba|m\.s\.)/i.test(job) ? "Master's" : /(bachelor|bsc|b\.sc|b\.s\.|undergraduate|graduate)/i.test(job) ? "Bachelor's" : '';
      match = { score: tot ? Math.round(100 * have / tot) : null, got: got, miss: miss.map(function (k) { return k.term; }), total: kws.length, yrs: yrs ? yrs[1] : '', degree: degree };
      if (miss.length) it('fix', 'Keywords from the job post that are missing from your CV (' + miss.length + ')', 'If you really have these skills, add them to your Skills section and to the bullets where you used them. Use the same wording as the job post. Do not add skills you do not have.');
      if (match.yrs) it('info', 'The job post mentions ' + match.yrs + ' year(s)', 'Check that your experience, including internships and projects, is shown clearly and that you meet this.');
      if (match.degree) it('info', 'The job post mentions a ' + match.degree + ' degree', 'Make sure your Education section shows your degree name and year clearly.');
    }
    // score (general quality)
    const pts = { fix: 12, better: 5, info: 0, ok: 0 };
    let q = 100; items.forEach(function (x) { q -= pts[x.level]; });
    return { words: words, items: items, match: match, quality: Math.max(20, q) };
  }

  /* ---------- show ---------- */
  function ring(label, val, sub) {
    const c = val >= 75 ? 'good' : val >= 50 ? 'mid' : 'low';
    return '<div class="ring ' + c + '"><div class="rv">' + val + '<small>/100</small></div><div class="rl">' + esc(label) + '</div><div class="rs">' + esc(sub) + '</div><div class="bar2"><i style="width:' + val + '%"></i></div></div>';
  }
  function render(r) {
    const o = $('ckOut'); let h = '<div class="rings">';
    if (r.match && r.match.score != null) h += ring('Match with the job post', r.match.score, r.match.score >= 75 ? 'Strong match' : r.match.score >= 50 ? 'Partly matches' : 'Needs work');
    h += ring('General CV quality', r.quality, r.quality >= 80 ? 'Looks good' : r.quality >= 60 ? 'Some things to improve' : 'Needs work') + '</div>';
    if (r.match) {
      h += '<div class="fc"><div class="fb open"><h2 class="h2">Keywords from the job post</h2><div class="chips">' +
        r.match.got.map(function (k) { return '<span class="chip ok">' + esc(k) + '</span>'; }).join('') +
        r.match.miss.map(function (k) { return '<span class="chip miss">' + esc(k) + '</span>'; }).join('') +
        '</div><p class="hint">Green: found in your CV. Red: not found. Keywords are picked automatically, so ignore any that do not matter.</p></div></div>';
    } else h += '<p class="hint">No job post was added, so only the general check was done.</p>';
    const order = { fix: 0, better: 1, info: 2, ok: 3 }, lab = { fix: 'Fix first', better: 'Improve', info: 'Good to know', ok: 'Looks good' };
    let list = r.items.slice().sort(function (a, b) { return order[a.level] - order[b.level]; });
    h += '<div class="fc"><div class="fb open"><h2 class="h2">Improvement areas</h2><ul class="imps">' + list.map(function (x) {
      return '<li class="' + x.level + '"><span class="tag2">' + lab[x.level] + '</span><div><strong>' + esc(x.title) + '</strong>' + (x.tip ? '<p>' + esc(x.tip) + '</p>' : '') + '</div></li>';
    }).join('') + '</ul></div></div>';
    h += '<p class="note">This is an automatic guide, not a judge. It compares words and checks common problems. It does not understand meaning, does not check spelling, and cannot know your real experience. Use it as a checklist, then decide for yourself.</p>';
    h += '<p><a class="btn primary" href="#/">Improve my CV in the builder</a></p>';
    o.innerHTML = h; o.hidden = false; o.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('ckGo').addEventListener('click', async function () {
    const btn = this, msg = $('ckCVMsg');
    if (!useMine && !cvFile) { msg.textContent = 'Please upload your CV first.'; return; }
    btn.disabled = true; btn.textContent = 'Checking...';
    try {
      let lines, mineDoc = null;
      if (useMine) { mineDoc = A.state.doc; lines = flattenDoc(mineDoc); }
      else { if (!cvLines) cvLines = await E.readLines(cvFile); lines = cvLines; }
      render(analyse(lines, $('ckJob').value, mineDoc)); msg.textContent = '';
    } catch (err) { msg.textContent = (err && err.message) || 'We could not read that file.'; }
    btn.disabled = false; btn.textContent = 'Check my CV';
  });
  window.addEventListener('hashchange', function () { if (location.hash.indexOf('#/check') === 0) syncMine(); });
  syncMine();
  window.ECB_CHECK = { analyse: analyse, jobKeywords: jobKeywords, flattenDoc: flattenDoc, haveMine: haveMine };
})();
