# CV Builder

A complete, responsive CV Builder website. Log in with your name and email, pick from 15 resume templates, fill in a guided form, and download a professional CV as a PDF — all from your phone or computer.

## Files

```
CV-BUILDER/
│
├── index.html        Home page + usage manual
├── login.html         Login (name + email)
├── templates.html      Template gallery (15 designs)
├── cv-form.html        CV data entry form
├── preview.html         CV preview + PDF download
├── resumes.html          My Resumes dashboard
├── style.css              Shared design system
├── script.js               All application logic
├── database.sql             MySQL schema for future backend use
└── README.md
```

One folder, no build step, no dependencies to install.

## Running it locally

1. Download and extract the `CV-BUILDER` folder.
2. Open the folder in VS Code (or any editor).
3. Open `index.html` in a browser — double-click it, or use a local server
   (e.g. the VS Code "Live Server" extension) for the smoothest experience.
4. That's it. Everything runs in the browser; no backend is required.

## How the site works

- **Login** — enter your name and email; no password. Your session is kept in
  `localStorage` so you stay logged in on this device/browser.
- **Templates** — 15 designs across 4 layout styles (sidebar, banner, minimal,
  elegant), each with its own color palette.
- **CV Form** — add education, skills, projects, experience, certifications,
  achievements, languages, hobbies, strengths, and a profile photo. Use
  **🔄 Reset** to clear the form, or **🚀 Generate CV** to build your resume.
- **Preview** — see your CV rendered in the chosen template, then **✏️ Edit CV**
  or **📥 Download CV as PDF**.
- **My Resumes** — every CV you generate is saved on this device. Preview, edit,
  download, or delete any of them at any time.

All data (login info, templates, CVs) is stored in the browser's `localStorage`,
under these keys: `cvb_users`, `cvb_currentUser`, `cvb_resumes`,
`cvb_currentResumeId`, `cvb_selectedTemplate`. Clearing your browser storage
clears your saved resumes.

## Deploying to GitHub Pages

1. Create a new GitHub repository.
2. Upload every file inside `CV-BUILDER/` to the repository root (keep them
   all in one folder — do not nest them further).
3. In the repository, go to **Settings → Pages**.
4. Under **Build and deployment**, set the source to **Deploy from a branch**,
   choose the `main` branch and the `/ (root)` folder, then save.
5. GitHub will publish the site at
   `https://<your-username>.github.io/<repository-name>/`.
6. Open that link — the CV Builder works exactly as it does locally, because
   everything runs client-side with `localStorage`.

No server, database, or environment variables are needed for this version.

## About `database.sql`

GitHub Pages can only serve static files, so it cannot run MySQL or
server-side code. `database.sql` is included for **future backend
development** — if you later build a PHP, Node.js/Express, or similar
backend, this file creates the `cv_builder_db` database and all matching
tables (`users`, `resumes`, `education`, `skills`, `projects`, `experience`,
`certifications`, `achievements`, `languages`, `hobbies`, `strengths`) with
proper primary keys, foreign keys, and timestamps, ready for you to connect.

Until then, the live site keeps using `localStorage` — this is "Mode 1" in
the code, and it's what's active by default.

## PDF downloads on mobile

Downloading a CV uses the browser's standard download system (via
`html2canvas` + `jsPDF`, loaded from a CDN). On Android and iPhone, the PDF
saves to the normal Downloads location, and you can find it afterwards in
your **Files** app or **Downloads** folder — the site never tries to write
directly to internal storage, which browsers don't allow.

## Notes

- Templates are original CSS-based designs, not copies of any specific
  commercial resume template.
- No passwords are stored — login only collects a name and email.
- Tested layout breakpoints: desktop, laptop, tablet, and mobile (sidebar
  collapses into a hamburger menu below 900px width).
