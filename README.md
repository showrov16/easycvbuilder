# Easy CV Builder

A free CV builder that runs entirely in the visitor's browser. 12 templates, PDF and Word (.docx)
download, import of an old CV (PDF or Word), save and open drafts, A4 / US Letter, 1 or 2 pages.
No server, no database, no account. Nothing a visitor types is uploaded or stored.

(c) 2026 Md Shadman Sakib Showrov. All rights reserved.

## Put it on GitHub Pages (free)

1. Sign in at github.com and create a new **public** repository, for example `easy-cv-builder`.
2. Click **Add file > Upload files**. Open this folder on your computer, select **everything inside it**
   (index.html, the css, js, vendor, fonts and tools folders, .nojekyll and this README) and drag it in.
   Make sure `index.html` ends up at the top level of the repository, not inside another folder.
3. Click **Commit changes**.
4. Go to **Settings > Pages**. Under "Build and deployment" choose **Deploy from a branch**,
   branch **main**, folder **/ (root)**, then **Save**.
5. After a minute or two the site is live at `https://YOUR-USERNAME.github.io/easy-cv-builder/`.

To show it inside Google Sites: **Insert > Embed > By URL**, paste the link above.

## What is in the folder

| Path | What it is |
|---|---|
| `index.html` | The page |
| `css/site.css` | Website styles (soft blue background, gallery, form) |
| `css/templates.css` | Styles of the 12 CV templates (generated, see below) |
| `css/templates.src.css`, `tools/build-css.py` | Source of the template styles and the small script that converts it. Only needed if you edit the templates |
| `js/data.js` | Data model, sections, mandatory-field check, sample data |
| `js/templates.js` | The 12 templates, page-fit logic |
| `js/export-docx.js` | Word export |
| `js/import.js` | Reads an old CV (PDF or Word) and sorts it into fields |
| `js/app.js` | The website itself |
| `vendor/` | Free libraries: docx (Word export), pdf.js (reading PDFs), JSZip (reading Word files) |
| `fonts/` | Carlito and Liberation Serif (open licence) so CVs look the same on every device |

## Notes

* **PDF download** uses the browser's print window ("Save as PDF"), which keeps the text selectable and
  clickable. On phones, choose "Save as PDF" or "Print > share/save".
* **Counters** use the free Abacus service (abacus.jasoncameron.dev). Only an anonymous "add one" is sent.
  If the service is down, the counters show a dash and everything else works. Counts are approximate.
  The counter names are set at the top of `js/app.js` (`NS`).
* **Importing an old CV** is rule-based, so it works best on simple, text-based CVs. Users review the result.
* **Fonts and libraries** keep their own licences (SIL OFL for the fonts, MIT/Apache for the libraries).
