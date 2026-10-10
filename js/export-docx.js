/* Easy CV Builder - Word (.docx) export, built in the browser with the free docx library */
(function (global) {
  'use strict';
  const E = global.ECB;
  const nonEmpty = E.nonEmpty, dateText = E.dateText, usable = E.usable, hasContent = E.hasContent;

  const LAY = { t1: 'rf', t2: 'od', t3: 'rf', t4: 'org', t5: 'dash', t6: 'sp', t7: 'rf', t8: 'org', t9: 'dash', t10: 'od', t11: 'plain', t12: 'plain' };
  const EDU_LAY = { t5: 'org', t6: 'org' };
  const PAGES = { A4: { w: 11906, h: 16838 }, Letter: { w: 12240, h: 15840 } };

  function join(a, s) { return a.filter(nonEmpty).join(s); }

  /* ---------- text runs from the tiny markup ---------- */
  function runs(D, text, o) {
    o = o || {};
    const out = [];
    String(text == null ? '' : text).split(/(\*\*.+?\*\*|\^\{.+?\}|_\{.+?\})/).forEach(function (part) {
      if (!part) return;
      let t = part, extra = {};
      if (/^\*\*.+\*\*$/.test(part)) { t = part.slice(2, -2); extra.bold = true; }
      else if (/^\^\{.+\}$/.test(part)) { t = part.slice(2, -1); extra.superScript = true; }
      else if (/^_\{.+\}$/.test(part)) { t = part.slice(2, -1); extra.subScript = true; }
      out.push(new D.TextRun(Object.assign({ text: o.upper ? t.toUpperCase() : t }, o.run || {}, extra)));
    });
    return out;
  }

  function dataUrlToBytes(u) {
    const b = atob(u.split(',')[1]); const a = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return a;
  }
  /* crop to the wanted aspect and optionally convert to greyscale; returns {data, w, h} */
  function prepPhoto(p, aspect, gray) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.onload = function () {
        const W = 360, H = Math.round(W / aspect);
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d');
        const s = Math.max(W / img.width, H / img.height);
        const w = img.width * s, h = img.height * s;
        x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        if (gray) {
          const d = x.getImageData(0, 0, W, H);
          for (let i = 0; i < d.data.length; i += 4) {
            const g = d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11;
            d.data[i] = d.data[i + 1] = d.data[i + 2] = g;
          }
          x.putImageData(d, 0, 0);
        }
        resolve({ data: dataUrlToBytes(c.toDataURL('image/png')), w: W, h: H });
      };
      img.onerror = function () { resolve(null); };
      img.src = p;
    });
  }

  async function build(doc) {
    const D = global.docx;
    if (!D) throw new Error('The Word export library did not load.');
    const t = E.tplById(doc.tpl);
    const cfg = t.docx || { font: 'Calibri', layout: 'single', accent: '000000', head: 'rule' };
    const pg = PAGES[doc.paper] || PAGES.A4;
    const lay = LAY[t.id] || 'od';
    const p = doc.person;
    const FONT = cfg.font;
    const SZ = 20;                      /* 10 pt body */
    const ACC = cfg.accent || '000000';
    const two = cfg.layout === 'two';
    const marginLR = two ? 540 : 1000;
    const marginTB = cfg.band && !two ? 0 : (two ? 540 : 794);
    const contentW = pg.w - 2 * marginLR;
    const NB = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const NOB = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

    const base = { font: FONT, size: SZ };
    function R(text, o) { return runs(D, text, { run: Object.assign({}, base, o && o.run), upper: o && o.upper }); }
    function para(children, o) {
      o = o || {};
      return new D.Paragraph(Object.assign({ children: children, spacing: { before: o.before || 0, after: o.after == null ? 20 : o.after, line: 250 } }, o.p || {}));
    }
    function links(color, sep) {
      const ls = E.helpers.linksList(doc), out = [];
      ls.forEach(function (l, i) {
        if (i) out.push(new D.TextRun({ text: sep || '  ·  ', font: FONT, size: SZ - 2, color: color }));
        out.push(new D.ExternalHyperlink({ link: E.normalizeUrl(l.url), children: [new D.TextRun({ text: E.helpers.linkLabel(l), font: FONT, size: SZ - 2, color: color, underline: {} })] }));
      });
      return out;
    }
    function tabbed(left, right, w, o) {
      o = o || {};
      return new D.Paragraph({
        children: left.concat([new D.TextRun({ children: [new D.Tab()] })]).concat(right),
        tabStops: [{ type: D.TabStopType.RIGHT, position: w }],
        keepNext: !!o.keepNext, spacing: { before: o.before || 0, after: o.after == null ? 0 : o.after, line: 250 }
      });
    }

    /* ---------- sections ---------- */
    function heading(title, w, o) {
      o = o || {};
      const upper = cfg.upper || cfg.small;
      const color = o.color || cfg.headColor || '000000';
      const props = { keepNext: true, spacing: { before: 200, after: 70 } };
      let kids = R(title, { upper: upper, run: { bold: true, size: 22, color: o.light ? 'FFFFFF' : color } });
      if (cfg.head === 'rule' && !o.light) props.border = { bottom: { style: D.BorderStyle.SINGLE, size: 6, space: 1, color: cfg.headColor ? ACC : '000000' } };
      if (cfg.head === 'bar' && !o.light) { props.shading = { type: D.ShadingType.CLEAR, fill: '111111', color: 'auto' }; kids = R(' ' + title, { upper: true, run: { bold: true, size: 22, color: 'FFFFFF' } }); }
      return new D.Paragraph(Object.assign({ children: kids }, props));
    }
    function bullet(text, w, o) {
      return new D.Paragraph({ children: R(text, o), numbering: { reference: 'bul', level: 0 }, spacing: { before: 0, after: 10, line: 250 } });
    }
    function entryParas(it, layout, w, o) {
      const date = dateText(it), pp = it.p || '', s = it.s || '', loc = it.loc || '', note = it.note || '';
      const out = [];
      const B = function (x) { return R(x, { run: { bold: true, color: o && o.color } }); };
      const I = function (x) { return R(x, { run: { italics: true, color: o && o.color } }); };
      const Nn = function (x) { return R(x, { run: { color: o && o.color } }); };
      if (layout === 'compact') { out.push(tabbed(Nn(join([s, pp], ', ')), Nn(date), w)); return out; }
      if (layout === 'org') {
        out.push(tabbed(B(pp), Nn(loc), w, { keepNext: true }));
        if (nonEmpty(s) || date) out.push(tabbed(I(s), Nn(date), w));
      } else if (layout === 'od') {
        out.push(tabbed(B(join([pp, loc], ', ')), Nn(date), w, { keepNext: true }));
        if (nonEmpty(s)) out.push(para(I(s)));
      } else if (layout === 'dash') {
        out.push(tabbed(B(pp).concat(nonEmpty(s) ? R(' — ' + s, { run: { color: o && o.color } }) : []), Nn(date), w, { keepNext: true }));
        if (nonEmpty(loc)) out.push(para(I(loc)));
      } else if (layout === 'sp') {
        out.push(tabbed(B(join([s, pp], ', ')), Nn(date), w, { keepNext: true }));
        if (nonEmpty(loc)) out.push(para(I(loc)));
      } else if (layout === 'rf') {
        out.push(tabbed(B(s || pp), Nn(date), w, { keepNext: true }));
        const l2 = nonEmpty(s) ? join([pp, loc], ' – ') : loc;
        if (nonEmpty(l2)) out.push(para(I(l2)));
      } else {
        out.push(tabbed(B(pp || s), Nn(date), w, { keepNext: true }));
        const l2 = nonEmpty(pp) ? join([s, loc, note], ' · ') : join([loc, note], ' · ');
        if (nonEmpty(l2)) out.push(para(Nn(l2)));
        note && 0;
      }
      if (nonEmpty(note) && ['org', 'od', 'dash', 'sp', 'rf'].indexOf(layout) >= 0) out.push(para(I(note)));
      (it.b || []).filter(nonEmpty).forEach(function (b) { out.push(bullet(b, w, { run: { color: o && o.color } })); });
      out[out.length - 1] = out[out.length - 1];
      return out;
    }
    function refsBlock(sec, items, w, o) {
      const out = [];
      if (sec.onRequest) out.push(para(R('Available on request', { run: { italics: true } })));
      if (!items.length) return out;
      const cells = items.map(function (r) {
        const lines = [];
        if (nonEmpty(r.name)) lines.push(para(R(r.name, { run: { bold: true, color: o && o.color } })));
        const l2 = join([r.title, r.org], ', ');
        if (nonEmpty(l2)) lines.push(para(R(l2, { run: { color: o && o.color } })));
        if (nonEmpty(r.phone)) lines.push(para(R(r.phone, { run: { color: o && o.color } })));
        if (nonEmpty(r.email)) lines.push(para(R(r.email, { run: { color: o && o.color } })));
        return lines;
      });
      const half = Math.floor(w / 2), rows = [];
      for (let i = 0; i < cells.length; i += 2) {
        const mk = function (c) { return new D.TableCell({ width: { size: half, type: D.WidthType.DXA }, borders: { top: NB, bottom: NB, left: NB, right: NB }, margins: { top: 40, bottom: 40, left: 0, right: 80 }, children: c && c.length ? c : [para([])] }); };
        rows.push(new D.TableRow({ cantSplit: true, children: [mk(cells[i]), mk(cells[i + 1])] }));
      }
      out.push(new D.Table({ width: { size: w, type: D.WidthType.DXA }, columnWidths: [half, w - half], borders: NOB, rows: rows }));
      return out;
    }
    function sectionParas(key, w, o) {
      o = o || {};
      const sec = doc.sections[key];
      if (!hasContent(sec)) return [];
      const color = o.color;
      const out = [heading(sec.title, w, { light: o.light, color: o.headColor })];
      const it = usable(sec);
      if (sec.kind === 'text') out.push(new D.Paragraph({ children: R(sec.text, { run: { color: color } }), spacing: { after: 40, line: 250 } }));
      else if (sec.kind === 'entry') {
        const l = (key === 'education' && EDU_LAY[t.id]) || (key === 'leadership' && t.id === 't6' ? 'compact' : lay);
        it.forEach(function (x, i) { entryParas(x, l, w, { color: color }).forEach(function (q) { out.push(q); }); out.push(para([], { after: 50 })); });
      } else if (sec.kind === 'list') it.forEach(function (x) { out.push(bullet(x.t, w, { run: { color: color } })); });
      else if (sec.kind === 'skills') it.forEach(function (x) {
        out.push(para((nonEmpty(x.label) ? R(x.label + (nonEmpty(x.text) ? ': ' : ''), { run: { bold: true, color: color } }) : []).concat(R(x.text, { run: { color: color } }))));
      });
      else if (sec.kind === 'refs') refsBlock(sec, it, w, { color: color }).forEach(function (q) { out.push(q); });
      return out;
    }
    function manySections(keys, w, o) {
      let out = [];
      keys.forEach(function (k) { out = out.concat(sectionParas(k, w, o)); });
      return out;
    }
    function keysOf(exclude, only) {
      return doc.order.filter(function (k) { return hasContent(doc.sections[k]) && (!exclude || exclude.indexOf(k) < 0) && (!only || only.indexOf(k) >= 0); });
    }

    /* ---------- header pieces ---------- */
    const contact = join([p.loc, p.phone, p.email], '  ·  ');
    const pers = E.helpers.personalRows(doc).map(function (r) { return r[0] + ': ' + r[1]; });
    async function photoRun(aspect, height) {
      if (!p.showPhoto || !p.photo) return null;
      const ph = await prepPhoto(p.photo, aspect, !p.photoColor);
      if (!ph) return null;
      return new D.ImageRun({ type: 'png', data: ph.data, transformation: { width: Math.round(height * aspect), height: height } });
    }
    function cell(children, w, shade, margins) {
      return new D.TableCell({
        width: { size: w, type: D.WidthType.DXA }, borders: { top: NB, bottom: NB, left: NB, right: NB },
        shading: shade ? { type: D.ShadingType.CLEAR, fill: shade, color: 'auto' } : undefined,
        margins: margins || { top: 0, bottom: 0, left: 100, right: 100 }, children: children.length ? children : [para([])]
      });
    }

    const kids = [];
    const WHITE = 'FFFFFF';

    if (!two) {
      const center = !!cfg.center;
      if (cfg.band) { /* T9: dark band */
        const photoR = null;
        const left = [para(R(p.name || 'Your Name', { run: { bold: true, size: 44, color: WHITE } })), para(R(p.title || '', { run: { size: 24, color: 'DDDDDD' } }))];
        const right = [];
        [join([p.email, p.phone], '  ·  '), p.loc].filter(nonEmpty).forEach(function (x) { right.push(para(R(x, { run: { size: 18, color: WHITE } }), { p: { alignment: D.AlignmentType.RIGHT } })); });
        if (E.helpers.linksList(doc).length) right.push(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: links(WHITE, '  ·  ') }));
        const lw = Math.round(pg.w * 0.55), rw = pg.w - lw;
        kids.push(new D.Table({
          width: { size: pg.w, type: D.WidthType.DXA }, columnWidths: [lw, rw], borders: NOB, indent: { size: -marginLR, type: D.WidthType.DXA },
          rows: [new D.TableRow({ children: [cell(left, lw, cfg.band, { top: 300, bottom: 300, left: marginLR, right: 100 }), cell(right, rw, cfg.band, { top: 300, bottom: 300, left: 100, right: marginLR })] })]
        }));
      } else if (center) {
        kids.push(para(R(p.name || 'Your Name', { run: { bold: true, size: 52, smallCaps: !!cfg.small } }), { p: { alignment: D.AlignmentType.CENTER }, after: 30 }));
        if (nonEmpty(p.title)) kids.push(para(R(p.title, { run: { size: 24 } }), { p: { alignment: D.AlignmentType.CENTER } }));
        const cl = join([contact].concat(pers.length ? [pers.join('  ·  ')] : []), '  ·  ');
        if (nonEmpty(cl)) kids.push(para(R(cl, { run: { size: SZ - 2 } }), { p: { alignment: D.AlignmentType.CENTER } }));
        if (E.helpers.linksList(doc).length) kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: links('000000') }));
        if (t.id === 't12' && nonEmpty(p.target)) kids.push(para(R('Applying for: ' + p.target, { run: { italics: true } }), { p: { alignment: D.AlignmentType.CENTER }, before: 40 }));
      } else {
        const left = [para(R(p.name || 'Your Name', { run: { bold: true, size: 52 } }), { after: 30 })];
        if (nonEmpty(p.title)) left.push(para(R(p.title, { run: { size: 24 } })));
        const cl = join([contact].concat(pers.length ? [pers.join('  ·  ')] : []), '  ·  ');
        if (nonEmpty(cl)) left.push(para(R(cl, { run: { size: SZ - 2 } })));
        if (E.helpers.linksList(doc).length) left.push(new D.Paragraph({ children: links('000000') }));
        const pr = await photoRun(0.86, 95);
        if (pr) {
          const rw = 1700, lw = contentW - rw;
          kids.push(new D.Table({
            width: { size: contentW, type: D.WidthType.DXA }, columnWidths: [lw, rw], borders: NOB,
            rows: [new D.TableRow({ children: [cell(left, lw, null, { top: 0, bottom: 0, left: 0, right: 100 }), cell([new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [pr] })], rw, null, { top: 0, bottom: 0, left: 0, right: 0 })] })]
          }));
        } else left.forEach(function (x) { kids.push(x); });
      }
      const keys = keysOf(cfg.center && t.id === 't12' ? ['summary'] : null);
      if (t.id === 't12' && hasContent(doc.sections.summary)) kids.push(para(R(doc.sections.summary.text, { run: { italics: true } }), { p: { alignment: D.AlignmentType.CENTER }, before: 80, after: 40 }));
      const bodyW = contentW;
      const body = manySections(keys, bodyW, {});
      const padded = cfg.band ? [new D.Paragraph({ children: [], spacing: { after: 0 } })] : [];
      body.forEach(function (x) { kids.push(x); });
      void padded;
    } else {
      const side = cfg.side || [];
      const sideW = Math.round(contentW * (t.id === 't3' ? 0.31 : t.id === 't10' ? 0.30 : 0.28));
      const mainW = contentW - sideW;
      const shade = cfg.sideShade || null;
      const sideText = cfg.sideText || '000000';
      const sideInner = sideW - 300, mainInner = mainW - 300;
      const sideKids = [], mainKids = [];
      const light = !!cfg.sideText;   /* dark sidebar: white text, heading without rule */
      if (t.id === 't1') { /* band on top */
        const pr = await photoRun(0.84, 100);
        const left = [para(R(p.name || 'Your Name', { run: { bold: true, size: 48, color: WHITE } })), para(R(p.title || '', { run: { size: 24, color: '7CC4FF' } }))];
        if (hasContent(doc.sections.summary)) left.push(para(R(doc.sections.summary.text, { run: { size: 18, color: 'E2E8F0' } }), { before: 60 }));
        const right = [];
        [['Email', p.email], ['Phone', p.phone], ['Address', p.loc]].forEach(function (r) { if (nonEmpty(r[1])) { right.push(para(R(r[0], { run: { bold: true, size: 17, color: '7CC4FF' } }), { after: 0 })); right.push(para(R(r[1], { run: { size: 18, color: 'E2E8F0' } }), { after: 40 })); } });
        E.helpers.linksList(doc).forEach(function (l) { right.push(para(R(E.helpers.linkLabel(l), { run: { bold: true, size: 17, color: '7CC4FF' } }), { after: 0 })); right.push(new D.Paragraph({ spacing: { after: 40 }, children: [new D.ExternalHyperlink({ link: E.normalizeUrl(l.url), children: [new D.TextRun({ text: String(l.url).replace(/^https?:\/\//, ''), font: FONT, size: 18, color: 'E2E8F0', underline: {} })] })] })); });
        const cw = [pr ? 1700 : 0, 0, 3000];
        cw[1] = pg.w - cw[0] - cw[2];
        const rowCells = [];
        if (pr) rowCells.push(cell([new D.Paragraph({ children: [pr] })], cw[0], cfg.band, { top: 300, bottom: 300, left: marginLR, right: 100 }));
        rowCells.push(cell(left, pr ? cw[1] : cw[1] + 0, cfg.band, { top: 300, bottom: 300, left: pr ? 100 : marginLR, right: 200 }));
        rowCells.push(cell(right, cw[2], cfg.band, { top: 300, bottom: 300, left: 100, right: marginLR }));
        kids.push(new D.Table({ width: { size: pg.w, type: D.WidthType.DXA }, columnWidths: pr ? cw : [cw[1], cw[2]], borders: NOB, indent: { size: -marginLR, type: D.WidthType.DXA }, rows: [new D.TableRow({ children: rowCells })] }));
        kids.push(new D.Paragraph({ children: [], spacing: { after: 60 } }));
        if (pers.length) { sideKids.push(heading('Additional Information', sideInner)); pers.forEach(function (x) { sideKids.push(para(R(x))); }); }
      } else if (t.id === 't7') {
        const pr = await photoRun(1, 90);
        const words = String(p.title || '');
        const left = [para(R(p.name || 'Your Name', { run: { size: 50 }, upper: true }), { after: 30 })];
        if (words) left.push(para(R(words, { run: { size: 24 }, upper: true })));
        const cl = join([contact], '');
        if (nonEmpty(cl)) left.push(para(R(cl, { run: { size: SZ - 2 } })));
        if (E.helpers.linksList(doc).length) left.push(new D.Paragraph({ children: links('000000') }));
        if (pr) {
          const rw = 1500, lw = contentW - rw;
          kids.push(new D.Table({ width: { size: contentW, type: D.WidthType.DXA }, columnWidths: [rw, lw], borders: NOB, rows: [new D.TableRow({ children: [cell([new D.Paragraph({ children: [pr] })], rw, null, { top: 0, bottom: 0, left: 0, right: 100 }), cell(left, lw, null, { top: 0, bottom: 0, left: 100, right: 0 })] })] }));
        } else left.forEach(function (x) { kids.push(x); });
        kids.push(new D.Paragraph({ children: [], spacing: { after: 60 } }));
        if (pers.length) { sideKids.push(heading('Personal', sideInner, { color: ACC })); pers.forEach(function (x) { sideKids.push(para(R(x))); }); }
      } else {
        /* t3, t10: photo + contact in the sidebar, name in the main column */
        const pr = await photoRun(t.id === 't3' ? 1 : 0.86, t.id === 't3' ? 100 : 110);
        if (pr) sideKids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 120 }, children: [pr] }));
        const c = sideText;
        sideKids.push(heading('Contact', sideInner, { light: light, color: light ? WHITE : undefined }));
        [p.loc, p.phone, p.email].filter(nonEmpty).forEach(function (x) { sideKids.push(para(R(x, { run: { color: c } }))); });
        E.helpers.linksList(doc).forEach(function (l) { sideKids.push(new D.Paragraph({ spacing: { after: 20 }, children: [new D.ExternalHyperlink({ link: E.normalizeUrl(l.url), children: [new D.TextRun({ text: E.helpers.linkLabel(l), font: FONT, size: SZ, color: c, underline: {} })] })] })); });
        if (pers.length) { sideKids.push(heading('Personal Details', sideInner, { light: light, color: light ? WHITE : undefined })); pers.forEach(function (x) { sideKids.push(para(R(x, { run: { color: c } }))); }); }
        mainKids.push(para(R(p.name || 'Your Name', { run: { bold: true, size: 56 } }), { after: 40 }));
        if (nonEmpty(p.title)) mainKids.push(para(R(p.title, { run: { size: 26 } }), { after: 80 }));
      }
      const sk = keysOf(null, side);
      const sideOpt = light ? { light: true, color: WHITE, headColor: WHITE } : {};
      manySections(sk, sideInner, sideOpt).forEach(function (x) { sideKids.push(x); });
      manySections(keysOf(side.concat(t.id === 't1' ? ['summary'] : [])), mainInner, {}).forEach(function (x) { mainKids.push(x); });
      const full = shade && !t.band;
      kids.push(new D.Table({
        width: { size: contentW, type: D.WidthType.DXA }, columnWidths: [sideW, mainW], borders: NOB,
        rows: [new D.TableRow({ children: [cell(sideKids, sideW, shade, { top: 200, bottom: 200, left: 150, right: 150 }), cell(mainKids, mainW, null, { top: 200, bottom: 100, left: 250, right: 100 })] })]
      }));
      void full;
    }

    const document_ = new D.Document({
      creator: 'Easy CV Builder', title: (p.name || 'CV') + ' - CV',
      styles: { default: { document: { run: { font: FONT, size: SZ } } } },
      numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: '•', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 300, hanging: 200 } } } }] }] },
      sections: [{
        properties: { page: { size: { width: pg.w, height: pg.h }, margin: { top: marginTB, bottom: two ? 400 : Math.max(marginTB, 600), left: marginLR, right: marginLR } } },
        children: kids
      }]
    });
    return D.Packer.toBlob(document_);
  }

  E.exportDocx = build;
})(window);
