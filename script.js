/* ===================================================================
   CV BUILDER — script.js
   Shared logic for every page: storage helpers, auth, sidebar,
   template gallery, dynamic CV form, resume preview rendering,
   PDF export and the My Resumes dashboard.
=================================================================== */

/* ---------------------------------------------------------------
   Storage keys & low-level helpers
--------------------------------------------------------------- */
const LS = {
  users: 'cvb_users',
  currentUser: 'cvb_currentUser',
  resumes: 'cvb_resumes',
  currentResumeId: 'cvb_currentResumeId',
  selectedTemplate: 'cvb_selectedTemplate'
};

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('Storage read failed for', key, e);
    return fallback;
  }
}
function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Storage write failed for', key, e);
    return false;
  }
}

function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/* ---------------------------------------------------------------
   Users / auth
--------------------------------------------------------------- */
function getUsers() { return readLS(LS.users, []); }
function saveUsers(list) { writeLS(LS.users, list); }

function getCurrentUser() { return readLS(LS.currentUser, null); }
function setCurrentUser(user) { writeLS(LS.currentUser, user); }
function clearCurrentUser() { localStorage.removeItem(LS.currentUser); }

function loginUser(name, email) {
  const users = getUsers();
  let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user) {
    user.name = name; // keep name fresh
  } else {
    user = { id: uid('user'), name, email, createdAt: new Date().toISOString() };
    users.push(user);
  }
  saveUsers(users);
  setCurrentUser({ id: user.id, name: user.name, email: user.email });
  return user;
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

/* ---------------------------------------------------------------
   Resumes
--------------------------------------------------------------- */
function getAllResumes() { return readLS(LS.resumes, []); }
function saveAllResumes(list) { writeLS(LS.resumes, list); }

function getMyResumes() {
  const user = getCurrentUser();
  if (!user) return [];
  return getAllResumes().filter(r => r.userId === user.id);
}

function getResumeById(id) {
  return getAllResumes().find(r => r.id === id) || null;
}

function upsertResume(resume) {
  const all = getAllResumes();
  const idx = all.findIndex(r => r.id === resume.id);
  if (idx >= 0) {
    all[idx] = resume;
  } else {
    all.push(resume);
  }
  saveAllResumes(all);
}

function deleteResume(id) {
  const all = getAllResumes().filter(r => r.id !== id);
  saveAllResumes(all);
}

/* ---------------------------------------------------------------
   Templates catalogue — 12 distinct designs across 4 document
   layouts (sidebar / banner / minimal / elegant), each with its
   own palette so every one reads as a separate design.
--------------------------------------------------------------- */
const TEMPLATES = [
  { id: 'modern',      name: 'Modern Resume',        layout: 'sidebar', primary: '#8B2E3A', secondary: '#F7F4EC', desc: 'Ink sidebar with an oxblood highlight.' },
  { id: 'professional',name: 'Professional Resume',  layout: 'banner',  primary: '#1C2431', secondary: '#EFEADC', desc: 'Confident navy header band.' },
  { id: 'minimal',     name: 'Minimal Resume',       layout: 'minimal', primary: '#3B4454', secondary: '#DCD3C0', desc: 'Quiet single column, generous space.' },
  { id: 'creative',    name: 'Creative Resume',      layout: 'sidebar', primary: '#C2703D', secondary: '#FFF7EE', desc: 'Warm terracotta sidebar.' },
  { id: 'corporate',   name: 'Corporate Resume',     layout: 'banner',  primary: '#26415C', secondary: '#E9EEF2', desc: 'Steel-blue banner, boardroom tone.' },
  { id: 'student',     name: 'Student Resume',       layout: 'minimal', primary: '#4B6B58', secondary: '#EAF1EC', desc: 'Sage accents, education-first.' },
  { id: 'fresher',     name: 'Fresher Resume',       layout: 'sidebar', primary: '#4B6B58', secondary: '#F2F7F3', desc: 'Sage sidebar built for first jobs.' },
  { id: 'elegant',     name: 'Elegant Resume',       layout: 'elegant', primary: '#C79A45', secondary: '#181818', desc: 'Near-black canvas, gold rules.' },
  { id: 'simple',      name: 'Simple Resume',        layout: 'minimal', primary: '#8B2E3A', secondary: '#F3E9E8', desc: 'Plain type, one accent rule.' },
  { id: 'colorful',    name: 'Colorful Resume',      layout: 'banner',  primary: '#7A4FA3', secondary: '#F3ECFA', desc: 'Violet banner with playful chips.' },
  { id: 'dark',        name: 'Dark Resume',          layout: 'elegant', primary: '#4B6B58', secondary: '#181818', desc: 'Charcoal canvas, sage highlights.' },
  { id: 'classic',     name: 'Classic Resume',       layout: 'banner',  primary: '#5B4636', secondary: '#F1E9DE', desc: 'Old-ledger brown, serif-forward.' },
  { id: 'blue',        name: 'Blue Professional',    layout: 'sidebar', primary: '#26415C', secondary: '#EFF3F6', desc: 'Steel-blue sidebar, crisp columns.' },
  { id: 'green',       name: 'Green Professional',   layout: 'sidebar', primary: '#3F6B4A', secondary: '#EFF6F1', desc: 'Forest sidebar, growth-minded.' },
  { id: 'clean',       name: 'Clean Modern',         layout: 'minimal', primary: '#26415C', secondary: '#E9EEF2', desc: 'Airy minimal grid, blue rule.' }
];

function getTemplate(id) {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
}

/* ---------------------------------------------------------------
   Sidebar (rendered into #sidebar-root on every protected page)
--------------------------------------------------------------- */
function renderSidebar(activePage) {
  const root = document.getElementById('sidebar-root');
  if (!root) return;
  const user = getCurrentUser();

  root.innerHTML = `
    <button class="hamburger" id="hamburgerBtn" aria-label="Open menu">&#9776;</button>
    <div class="sidebar-scrim" id="sidebarScrim"></div>
    <aside class="sidebar" id="sidebarEl">
      <div class="sidebar-brand">
        <span class="mark">CV</span>
        <span class="tag">BUILDER</span>
      </div>
      <nav class="sidebar-nav">
        <a href="index.html" class="${activePage === 'home' ? 'active' : ''}"><span class="icon">🏠</span> Home</a>
        <a href="login.html" class="${activePage === 'login' ? 'active' : ''}"><span class="icon">🔐</span> Login</a>
        <a href="templates.html" class="${activePage === 'templates' ? 'active' : ''}"><span class="icon">🎨</span> Templates</a>
        <a href="resumes.html" class="${activePage === 'resumes' ? 'active' : ''}"><span class="icon">📄</span> My Resumes</a>
        <a href="#" id="logoutLink"><span class="icon">🚪</span> Logout</a>
      </nav>
      ${user ? `<div class="sidebar-user"><strong>${escapeHtml(user.name)}</strong>${escapeHtml(user.email)}</div>` : ''}
    </aside>
  `;

  const hamburger = document.getElementById('hamburgerBtn');
  const sidebarEl = document.getElementById('sidebarEl');
  const scrim = document.getElementById('sidebarScrim');
  function openSidebar() { sidebarEl.classList.add('open'); scrim.classList.add('show'); }
  function closeSidebar() { sidebarEl.classList.remove('open'); scrim.classList.remove('show'); }
  hamburger.addEventListener('click', openSidebar);
  scrim.addEventListener('click', closeSidebar);
  $all('.sidebar-nav a', sidebarEl).forEach(a => a.addEventListener('click', closeSidebar));

  document.getElementById('logoutLink').addEventListener('click', function (e) {
    e.preventDefault();
    confirmModal(
      'Log out?',
      'You can log back in any time with your name and email. Your saved resumes stay on this device.',
      function () {
        clearCurrentUser();
        showToast('You have successfully logged out.');
        setTimeout(function () { window.location.href = 'login.html'; }, 600);
      }
    );
  });
}

/* ---------------------------------------------------------------
   Toast + confirm modal (shared UI, injected once)
--------------------------------------------------------------- */
function ensureUiPrimitives() {
  if (!document.getElementById('toastEl')) {
    const t = document.createElement('div');
    t.id = 'toastEl';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  if (!document.getElementById('modalBackdrop')) {
    const m = document.createElement('div');
    m.id = 'modalBackdrop';
    m.className = 'modal-backdrop';
    m.innerHTML = `
      <div class="modal-box">
        <h3 id="modalTitle">Are you sure?</h3>
        <p id="modalBody"></p>
        <div class="btn-row">
          <button class="btn btn-danger" id="modalConfirmBtn">Confirm</button>
          <button class="btn btn-secondary" id="modalCancelBtn">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    document.getElementById('modalCancelBtn').addEventListener('click', hideModal);
    m.addEventListener('click', function (e) { if (e.target === m) hideModal(); });
  }
}

function showToast(msg) {
  ensureUiPrimitives();
  const t = document.getElementById('toastEl');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

function hideModal() {
  const m = document.getElementById('modalBackdrop');
  if (m) m.classList.remove('show');
}

function confirmModal(title, body, onConfirm) {
  ensureUiPrimitives();
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').textContent = body;
  const m = document.getElementById('modalBackdrop');
  m.classList.add('show');
  const btn = document.getElementById('modalConfirmBtn');
  const freshBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(freshBtn, btn);
  freshBtn.addEventListener('click', function () {
    hideModal();
    onConfirm && onConfirm();
  });
}

/* ---------------------------------------------------------------
   Email validation
--------------------------------------------------------------- */
function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
}
function isValidPhone(v) {
  return /^[+]?[\d\s()-]{7,16}$/.test(String(v || '').trim());
}

/* ===================================================================
   PAGE INITIALISERS — each page calls the relevant one on load
=================================================================== */

/* ---------- Home page ---------- */
function initHomePage() {
  ensureUiPrimitives();
  renderSidebar('home');
  const user = getCurrentUser();
  const greetEl = document.getElementById('homeGreeting');
  if (greetEl) {
    greetEl.textContent = user ? ('Welcome back, ' + user.name + '.') : 'Welcome to CV Builder';
  }
  const resumes = getMyResumes();
  const countEl = document.getElementById('statResumeCount');
  if (countEl) countEl.textContent = String(resumes.length);
  const tplEl = document.getElementById('statTemplateCount');
  if (tplEl) tplEl.textContent = String(TEMPLATES.length);
  const statusEl = document.getElementById('statLoginStatus');
  if (statusEl) statusEl.textContent = user ? 'Logged in' : 'Not logged in';

  const ctaBtn = document.getElementById('homeCta');
  if (ctaBtn) {
    ctaBtn.textContent = user ? 'Browse templates' : 'Login to get started';
    ctaBtn.href = user ? 'templates.html' : 'login.html';
  }
}

/* ---------- Login page ---------- */
function initLoginPage() {
  ensureUiPrimitives();
  const existing = getCurrentUser();
  const form = document.getElementById('loginForm');
  if (!form) return;

  if (existing) {
    document.getElementById('nameInput').value = existing.name;
    document.getElementById('emailInput').value = existing.email;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const nameField = document.getElementById('nameField');
    const emailField = document.getElementById('emailField');
    const nameInput = document.getElementById('nameInput');
    const emailInput = document.getElementById('emailInput');
    const banner = document.getElementById('loginBanner');

    nameField.classList.remove('error');
    emailField.classList.remove('error');
    banner.className = 'form-banner';

    let ok = true;
    if (!nameInput.value.trim()) { nameField.classList.add('error'); ok = false; }
    if (!isValidEmail(emailInput.value)) { emailField.classList.add('error'); ok = false; }

    if (!ok) {
      banner.textContent = 'Please fix the highlighted fields.';
      banner.classList.add('error', 'show');
      return;
    }

    loginUser(nameInput.value.trim(), emailInput.value.trim());
    banner.textContent = 'Login successful. Redirecting…';
    banner.classList.add('success', 'show');
    setTimeout(function () { window.location.href = 'templates.html'; }, 500);
  });
}

/* ---------- Templates page ---------- */
function initTemplatesPage() {
  ensureUiPrimitives();
  renderSidebar('templates');
  requireAuth();

  const grid = document.getElementById('templateGrid');
  if (!grid) return;

  grid.innerHTML = TEMPLATES.map(function (t) {
    return `
      <div class="tpl-card">
        <div class="tpl-preview" style="background:${t.secondary}">
          <div class="mini-bar" style="width:40%;background:${t.primary}"></div>
          <div class="mini-line" style="width:70%;background:${t.primary}55"></div>
          <div class="mini-line" style="width:55%;background:${t.primary}33"></div>
          <div class="mini-line" style="width:60%;background:${t.primary}33;margin-top:10px"></div>
          <div class="mini-line" style="width:40%;background:${t.primary}33"></div>
        </div>
        <div class="tpl-body">
          <h3>${escapeHtml(t.name)}</h3>
          <p>${escapeHtml(t.desc)}</p>
          <button class="btn btn-primary btn-block use-tpl-btn" data-id="${t.id}">Use Template</button>
        </div>
      </div>`;
  }).join('');

  $all('.use-tpl-btn', grid).forEach(function (btn) {
    btn.addEventListener('click', function () {
      writeLS(LS.selectedTemplate, btn.dataset.id);
      window.location.href = 'cv-form.html?template=' + encodeURIComponent(btn.dataset.id);
    });
  });
}

/* ---------- CV Form page ---------- */
let formState = null;

function blankFormState() {
  return {
    id: null,
    template: readLS(LS.selectedTemplate, 'modern'),
    photo: '',
    fullName: '', phone: '', email: '', location: '',
    objective: '',
    education: [], skills: [], projects: [], experience: [],
    certifications: [], achievements: [], languages: [], hobbies: [], strengths: [],
    declaration: ''
  };
}

function initCvFormPage() {
  ensureUiPrimitives();
  renderSidebar('templates');
  const user = requireAuth();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const editId = params.get('resumeId');
  const tplParam = params.get('template');

  if (editId) {
    const existing = getResumeById(editId);
    if (existing) {
      formState = JSON.parse(JSON.stringify(existing));
    } else {
      formState = blankFormState();
    }
  } else {
    formState = blankFormState();
    if (tplParam) formState.template = tplParam;
  }

  document.getElementById('formHeading').textContent = editId ? 'Edit Your CV' : 'Build Your CV';
  const tplBadge = document.getElementById('activeTemplateBadge');
  if (tplBadge) tplBadge.textContent = getTemplate(formState.template).name;

  // Personal fields
  $('#photoInput').addEventListener('change', handlePhotoSelect);
  $('#removePhotoBtn').addEventListener('click', function () {
    formState.photo = '';
    renderPhotoPreview();
  });
  renderPhotoPreview();

  ['fullName', 'phone', 'email', 'location', 'objective', 'declaration'].forEach(function (key) {
    const el = document.getElementById('f_' + key);
    if (!el) return;
    el.value = formState[key] || '';
    el.addEventListener('input', function () { formState[key] = el.value; });
  });

  // Repeating sections
  setupRecordSection('education', renderEducationRecord, {
    degree: '', school: '', university: '', year: '', grade: ''
  });
  setupRecordSection('projects', renderProjectRecord, {
    name: '', description: '', tech: '', link: ''
  });
  setupRecordSection('experience', renderExperienceRecord, {
    company: '', role: '', duration: '', description: ''
  });
  setupRecordSection('certifications', renderCertificationRecord, {
    name: '', org: '', course: '', year: ''
  });

  // Chip sections
  setupChipSection('skills');
  setupChipSection('achievements');
  setupChipSection('languages');
  setupChipSection('hobbies');
  setupChipSection('strengths');

  renderAllRecordSections();
  renderAllChipSections();

  document.getElementById('cvForm').addEventListener('submit', handleGenerateCv);
  document.getElementById('resetFormBtn').addEventListener('click', function () {
    confirmModal(
      'Reset the form?',
      'This clears every field and the uploaded photo on this page. It cannot be undone.',
      function () {
        const keepTemplate = formState.template;
        const keepId = formState.id;
        formState = blankFormState();
        formState.template = keepTemplate;
        formState.id = keepId;
        document.getElementById('cvForm').reset();
        ['fullName', 'phone', 'email', 'location', 'objective', 'declaration'].forEach(function (key) {
          const el = document.getElementById('f_' + key);
          if (el) el.value = '';
        });
        renderPhotoPreview();
        renderAllRecordSections();
        renderAllChipSections();
        showToast('Form cleared.');
      }
    );
  });
}

function handlePhotoSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!/^image\/(png|jpe?g)$/.test(file.type)) {
    showToast('Please choose a JPG or PNG image.');
    return;
  }

  // Compress the image before storing — prevents localStorage quota errors
  // and keeps the CV file size small, especially on mobile camera photos.
  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = new Image();
    img.onload = function () {
      const MAX_SIZE = 400; // max width/height in pixels — plenty for a resume photo
      let w = img.width;
      let h = img.height;

      if (w > h && w > MAX_SIZE) {
        h = Math.round(h * (MAX_SIZE / w));
        w = MAX_SIZE;
      } else if (h > MAX_SIZE) {
        w = Math.round(w * (MAX_SIZE / h));
        h = MAX_SIZE;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      // JPEG at 0.8 quality keeps photos small (usually 20-60KB instead of several MB)
      const compressed = canvas.toDataURL('image/jpeg', 0.8);
      formState.photo = compressed;
      renderPhotoPreview();
    };
    img.onerror = function () {
      showToast('Could not read that image. Please try a different photo.');
    };
    img.src = ev.target.result;
  };
  reader.onerror = function () {
    showToast('Could not read that file. Please try again.');
  };
  reader.readAsDataURL(file);
}

function renderPhotoPreview() {
  const avatar = document.getElementById('photoAvatar');
  const removeBtn = document.getElementById('removePhotoBtn');
  if (formState.photo) {
    avatar.innerHTML = '<img src="' + formState.photo + '" alt="Profile preview">';
    removeBtn.style.display = 'inline-flex';
  } else {
    avatar.innerHTML = '📷';
    removeBtn.style.display = 'none';
  }
}

/* --- Generic repeating record sections (education / projects / experience / certifications) --- */
const RECORD_RENDERERS = {};
function setupRecordSection(key, renderer, blankRecord) {
  RECORD_RENDERERS[key] = { renderer: renderer, blank: blankRecord };
  const addBtn = document.getElementById('add_' + key);
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      formState[key].push(Object.assign({ _rid: uid('r') }, blankRecord));
      renderRecordSection(key);
    });
  }
}
function renderAllRecordSections() {
  Object.keys(RECORD_RENDERERS).forEach(renderRecordSection);
}
function renderRecordSection(key) {
  const list = document.getElementById('list_' + key);
  if (!list) return;
  const cfg = RECORD_RENDERERS[key];
  if (formState[key].length === 0) {
    list.innerHTML = '<p class="section-sub" style="margin:0;">Nothing added yet. Use the button below to add one.</p>';
    return;
  }
  list.innerHTML = formState[key].map(function (rec, i) {
    return cfg.renderer(rec, i, key);
  }).join('');
  $all('.record-remove', list).forEach(function (btn) {
    btn.addEventListener('click', function () {
      const idx = Number(btn.dataset.idx);
      formState[key].splice(idx, 1);
      renderRecordSection(key);
    });
  });
  $all('[data-field]', list).forEach(function (input) {
    input.addEventListener('input', function () {
      const idx = Number(input.dataset.idx);
      const field = input.dataset.field;
      formState[key][idx][field] = input.value;
    });
  });
}

function renderEducationRecord(rec, i) {
  return `
    <div class="record">
      <div class="record-head"><span>Education ${i + 1}</span><button type="button" class="record-remove" data-idx="${i}">Remove</button></div>
      <div class="form-grid">
        <div class="field"><label>Degree</label><input type="text" data-idx="${i}" data-field="degree" value="${escapeHtml(rec.degree)}" placeholder="B.E. Computer Science"></div>
        <div class="field"><label>College / School Name</label><input type="text" data-idx="${i}" data-field="school" value="${escapeHtml(rec.school)}" placeholder="ABC College of Engineering"></div>
        <div class="field"><label>University / Board</label><input type="text" data-idx="${i}" data-field="university" value="${escapeHtml(rec.university)}" placeholder="Anna University"></div>
        <div class="field"><label>Year of Passing</label><input type="text" data-idx="${i}" data-field="year" value="${escapeHtml(rec.year)}" placeholder="2026"></div>
        <div class="field"><label>Percentage / CGPA</label><input type="text" data-idx="${i}" data-field="grade" value="${escapeHtml(rec.grade)}" placeholder="8.4 CGPA"></div>
      </div>
    </div>`;
}
function renderProjectRecord(rec, i) {
  return `
    <div class="record">
      <div class="record-head"><span>Project ${i + 1}</span><button type="button" class="record-remove" data-idx="${i}">Remove</button></div>
      <div class="field"><label>Project Name</label><input type="text" data-idx="${i}" data-field="name" value="${escapeHtml(rec.name)}" placeholder="Student Leave Management System"></div>
      <div class="field"><label>Description</label><textarea data-idx="${i}" data-field="description" placeholder="What the project does and your role">${escapeHtml(rec.description)}</textarea></div>
      <div class="form-grid">
        <div class="field"><label>Technologies Used</label><input type="text" data-idx="${i}" data-field="tech" value="${escapeHtml(rec.tech)}" placeholder="HTML, CSS, JavaScript, Firebase"></div>
        <div class="field"><label>Project Link (optional)</label><input type="url" data-idx="${i}" data-field="link" value="${escapeHtml(rec.link)}" placeholder="https://github.com/..."></div>
      </div>
    </div>`;
}
function renderExperienceRecord(rec, i) {
  return `
    <div class="record">
      <div class="record-head"><span>Experience ${i + 1}</span><button type="button" class="record-remove" data-idx="${i}">Remove</button></div>
      <div class="form-grid">
        <div class="field"><label>Company Name</label><input type="text" data-idx="${i}" data-field="company" value="${escapeHtml(rec.company)}"></div>
        <div class="field"><label>Job Role</label><input type="text" data-idx="${i}" data-field="role" value="${escapeHtml(rec.role)}"></div>
        <div class="field"><label>Duration</label><input type="text" data-idx="${i}" data-field="duration" value="${escapeHtml(rec.duration)}" placeholder="Jun 2025 – Aug 2025"></div>
      </div>
      <div class="field"><label>Description</label><textarea data-idx="${i}" data-field="description">${escapeHtml(rec.description)}</textarea></div>
    </div>`;
}
function renderCertificationRecord(rec, i) {
  return `
    <div class="record">
      <div class="record-head"><span>Certification ${i + 1}</span><button type="button" class="record-remove" data-idx="${i}">Remove</button></div>
      <div class="form-grid">
        <div class="field"><label>Certification Name</label><input type="text" data-idx="${i}" data-field="name" value="${escapeHtml(rec.name)}"></div>
        <div class="field"><label>Organization</label><input type="text" data-idx="${i}" data-field="org" value="${escapeHtml(rec.org)}"></div>
        <div class="field"><label>Course Name</label><input type="text" data-idx="${i}" data-field="course" value="${escapeHtml(rec.course)}"></div>
        <div class="field"><label>Year</label><input type="text" data-idx="${i}" data-field="year" value="${escapeHtml(rec.year)}"></div>
      </div>
    </div>`;
}

/* --- Generic chip sections (skills / achievements / languages / hobbies / strengths) --- */
function setupChipSection(key) {
  const input = document.getElementById('chipInput_' + key);
  const addBtn = document.getElementById('chipAdd_' + key);
  function addChip() {
    const val = input.value.trim();
    if (!val) return;
    formState[key].push(val);
    input.value = '';
    renderChipSection(key);
    input.focus();
  }
  if (addBtn) addBtn.addEventListener('click', addChip);
  if (input) input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); addChip(); }
  });
}
function renderAllChipSections() {
  ['skills', 'achievements', 'languages', 'hobbies', 'strengths'].forEach(renderChipSection);
}
function renderChipSection(key) {
  const wrap = document.getElementById('chips_' + key);
  if (!wrap) return;
  wrap.innerHTML = formState[key].map(function (val, i) {
    return `<span class="chip">${escapeHtml(val)}<button type="button" data-idx="${i}" data-key="${key}" aria-label="Remove">✕</button></span>`;
  }).join('') || '<span class="hint">Nothing added yet.</span>';
  $all('button[data-key="' + key + '"]', wrap).forEach(function (btn) {
    btn.addEventListener('click', function () {
      formState[key].splice(Number(btn.dataset.idx), 1);
      renderChipSection(key);
    });
  });
}

function handleGenerateCv(e) {
  e.preventDefault();
  const banner = document.getElementById('formBanner');
  banner.className = 'form-banner';
  $all('.field').forEach(function (f) { f.classList.remove('error'); });

  let ok = true;
  const requiredMap = { fullName: 'f_fullName', phone: 'f_phone', email: 'f_email', location: 'f_location' };
  Object.keys(requiredMap).forEach(function (key) {
    const el = document.getElementById(requiredMap[key]);
    if (!formState[key] || !formState[key].trim()) {
      el.closest('.field').classList.add('error');
      ok = false;
    }
  });
  const emailEl = document.getElementById('f_email');
  if (formState.email && !isValidEmail(formState.email)) {
    emailEl.closest('.field').classList.add('error');
    ok = false;
  }
  const phoneEl = document.getElementById('f_phone');
  if (formState.phone && !isValidPhone(formState.phone)) {
    phoneEl.closest('.field').classList.add('error');
    ok = false;
  }

  if (!ok) {
    banner.textContent = 'Please fill all required fields correctly before generating your CV.';
    banner.classList.add('error', 'show');
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const user = getCurrentUser();
  if (!user) {
    banner.textContent = 'Error: Please log in first.';
    banner.classList.add('error', 'show');
    return;
  }

  try {
    const now = new Date().toISOString();
    const resume = Object.assign({}, formState, {
      id: formState.id || uid('resume'),
      userId: user.id,
      title: formState.fullName + ' — ' + getTemplate(formState.template).name,
      createdAt: formState.createdAt || now,
      updatedAt: now
    });

    // Save to localStorage
    upsertResume(resume);
    writeLS(LS.currentResumeId, resume.id);
    
    // Small delay then redirect
    showToast('CV generated!');
    setTimeout(function () {
      window.location.href = 'preview.html?id=' + encodeURIComponent(resume.id);
    }, 500);
    
  } catch (err) {
    console.error('Error generating CV:', err);
    banner.textContent = 'Error: ' + (err.message || 'Could not save CV. Please try again.');
    banner.classList.add('error', 'show');
  }
}

/* ---------- Preview page ---------- */
function initPreviewPage() {
  ensureUiPrimitives();
  renderSidebar('resumes');
  const user = requireAuth();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || readLS(LS.currentResumeId, null);
  const resume = id ? getResumeById(id) : null;

  const stage = document.getElementById('resumeStage');
  if (!resume) {
    stage.innerHTML = '<div class="empty-state"><div class="glyph">📄</div><h3>No resume to preview</h3><p>Build a CV first from the Templates page.</p></div>';
    return;
  }

  document.getElementById('previewHeading').textContent = resume.fullName + '\u2019s CV';
  stage.innerHTML = buildResumeDocumentHtml(resume);
  wrapResumeDocForScaling();
  scaleResumeDocToFit();
  window.addEventListener('resize', scaleResumeDocToFit);
  window.addEventListener('orientationchange', function () { setTimeout(scaleResumeDocToFit, 200); });

  document.getElementById('editCvBtn').addEventListener('click', function () {
    window.location.href = 'cv-form.html?resumeId=' + encodeURIComponent(resume.id);
  });
  document.getElementById('backToResumesBtn').addEventListener('click', function () {
    window.location.href = 'resumes.html';
  });
  document.getElementById('downloadPdfBtn').addEventListener('click', function () {
    downloadResumeAsPdf(resume);
  });

  if (params.get('auto') === 'pdf') {
    setTimeout(function () { downloadResumeAsPdf(resume); }, 400);
  }
}

/* Wrap #resumeDocInner in a scale wrapper (once) so it can be shrunk
   visually on narrow screens without altering its real layout width. */
function wrapResumeDocForScaling() {
  const doc = document.getElementById('resumeDocInner');
  if (!doc || doc.parentNode.id === 'resumeDocScaleWrapper') return;
  const wrapper = document.createElement('div');
  wrapper.id = 'resumeDocScaleWrapper';
  wrapper.className = 'resume-doc-scale-wrapper';
  doc.parentNode.insertBefore(wrapper, doc);
  wrapper.appendChild(doc);
}

/* Scale #resumeDocInner down (via CSS transform) to fit the available
   width on phones/tablets, keeping its internal 780px-wide layout intact
   so sidebar/banner templates never get squished or overlap. The wrapper
   is resized to match so the scaled doc stays centered with no extra
   blank space. PDF export is unaffected since transform doesn't change
   offsetWidth/offsetHeight — html2canvas still captures the full-size doc. */
function scaleResumeDocToFit() {
  const stage = document.getElementById('resumeStage');
  const wrapper = document.getElementById('resumeDocScaleWrapper');
  const doc = document.getElementById('resumeDocInner');
  if (!stage || !wrapper || !doc) return;

  doc.style.transform = 'none';
  const stageStyles = getComputedStyle(stage);
  const availableWidth = stage.clientWidth - parseFloat(stageStyles.paddingLeft) - parseFloat(stageStyles.paddingRight);
  const naturalWidth = doc.offsetWidth || 780;
  const naturalHeight = doc.offsetHeight;
  const scale = Math.min(1, availableWidth / naturalWidth);

  doc.style.transform = 'scale(' + scale + ')';
  wrapper.style.width = Math.round(naturalWidth * scale) + 'px';
  wrapper.style.height = Math.round(naturalHeight * scale) + 'px';
}

/* Build the printable resume markup for a given resume + its template */
function buildResumeDocumentHtml(resume) {
  const tpl = getTemplate(resume.template);
  const p = tpl.primary;

  const eduHtml = resume.education.map(function (r) {
    return `<div class="resume-entry">
      <div class="row1"><span>${escapeHtml(r.degree)}</span><span>${escapeHtml(r.year)}</span></div>
      <div class="row2">${escapeHtml(r.school)}${r.university ? ', ' + escapeHtml(r.university) : ''}${r.grade ? ' — ' + escapeHtml(r.grade) : ''}</div>
    </div>`;
  }).join('');

  const projHtml = resume.projects.map(function (r) {
    return `<div class="resume-entry">
      <div class="row1"><span>${escapeHtml(r.name)}</span></div>
      ${r.tech ? `<div class="row2">${escapeHtml(r.tech)}</div>` : ''}
      ${r.description ? `<p>${escapeHtml(r.description)}</p>` : ''}
      ${r.link ? `<div class="row2">${escapeHtml(r.link)}</div>` : ''}
    </div>`;
  }).join('');

  const expHtml = resume.experience.map(function (r) {
    return `<div class="resume-entry">
      <div class="row1"><span>${escapeHtml(r.role)} — ${escapeHtml(r.company)}</span><span>${escapeHtml(r.duration)}</span></div>
      ${r.description ? `<p>${escapeHtml(r.description)}</p>` : ''}
    </div>`;
  }).join('');

  const certHtml = resume.certifications.map(function (r) {
    return `<div class="resume-entry">
      <div class="row1"><span>${escapeHtml(r.name)}</span><span>${escapeHtml(r.year)}</span></div>
      <div class="row2">${escapeHtml(r.org)}${r.course ? ' — ' + escapeHtml(r.course) : ''}</div>
    </div>`;
  }).join('');

  function tagList(arr, bg, fg) {
    return arr.map(function (v) { return `<span style="background:${bg};color:${fg}">${escapeHtml(v)}</span>`; }).join('');
  }

  const sections = [];
  if (resume.education.length) sections.push({ title: 'Education', html: eduHtml });
  if (resume.skills.length) sections.push({ title: 'Technical Skills', html: `<div class="resume-tags">${tagList(resume.skills, p + '1a', p)}</div>` });
  if (resume.projects.length) sections.push({ title: 'Projects', html: projHtml });
  if (resume.experience.length) sections.push({ title: 'Internship / Work Experience', html: expHtml });
  if (resume.certifications.length) sections.push({ title: 'Certifications / Courses', html: certHtml });
  if (resume.achievements.length) sections.push({ title: 'Achievements', html: `<ul style="margin:0;padding-left:18px;font-size:13.5px;color:#333;">${resume.achievements.map(function (a) { return '<li>' + escapeHtml(a) + '</li>'; }).join('')}</ul>` });
  if (resume.languages.length) sections.push({ title: 'Languages Known', html: `<div class="resume-tags">${tagList(resume.languages, '#eee', '#333')}</div>` });
  if (resume.hobbies.length) sections.push({ title: 'Hobbies / Interests', html: `<div class="resume-tags">${tagList(resume.hobbies, '#eee', '#333')}</div>` });
  if (resume.strengths.length) sections.push({ title: 'Strengths', html: `<div class="resume-tags">${tagList(resume.strengths, '#eee', '#333')}</div>` });
  if (resume.declaration && resume.declaration.trim()) sections.push({ title: 'Declaration', html: `<p style="margin:0;font-size:13px;color:#444;">${escapeHtml(resume.declaration)}</p>` });

  const sectionsHtml = sections.map(function (s) {
    return `<div class="resume-section"><h4 style="color:${p};border-color:${p}">${escapeHtml(s.title)}</h4>${s.html}</div>`;
  }).join('');

  const avatarHtml = resume.photo ? `<img src="${resume.photo}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '👤';
  const roleLine = resume.education[0] ? resume.education[0].degree : '';

  if (tpl.layout === 'sidebar') {
    const sideSections = [];
    if (resume.skills.length) sideSections.push({ title: 'Skills', html: `<div class="resume-tags">${tagList(resume.skills, 'rgba(255,255,255,.16)', '#fff')}</div>` });
    if (resume.languages.length) sideSections.push({ title: 'Languages', html: `<div class="resume-tags">${tagList(resume.languages, 'rgba(255,255,255,.16)', '#fff')}</div>` });
    if (resume.hobbies.length) sideSections.push({ title: 'Hobbies', html: `<div class="resume-tags">${tagList(resume.hobbies, 'rgba(255,255,255,.16)', '#fff')}</div>` });
    if (resume.strengths.length) sideSections.push({ title: 'Strengths', html: `<div class="resume-tags">${tagList(resume.strengths, 'rgba(255,255,255,.16)', '#fff')}</div>` });

    const mainSections = sections.filter(function (s) {
      return !['Technical Skills', 'Languages Known', 'Hobbies / Interests', 'Strengths'].includes(s.title);
    }).map(function (s) {
      return `<div class="resume-section"><h4 style="color:${p};border-color:${p}">${escapeHtml(s.title)}</h4>${s.html}</div>`;
    }).join('');

    return `<div class="resume-doc doc-sidebar-left" id="resumeDocInner">
      <div class="side" style="background:${p}">
        <div class="avatar-lg">${avatarHtml}</div>
        <div class="name">${escapeHtml(resume.fullName)}</div>
        <div class="role-line">${escapeHtml(roleLine)}</div>
        <div class="contact-line">📞 ${escapeHtml(resume.phone)}</div>
        <div class="contact-line">✉️ ${escapeHtml(resume.email)}</div>
        <div class="contact-line">📍 ${escapeHtml(resume.location)}</div>
        ${sideSections.map(function (s) { return `<h4>${s.title}</h4>${s.html}`; }).join('')}
      </div>
      <div class="main-col">
        ${resume.objective ? `<div class="resume-section"><h4 style="color:${p};border-color:${p}">Career Objective</h4><p style="margin:0;font-size:13.5px;color:#333;">${escapeHtml(resume.objective)}</p></div>` : ''}
        ${mainSections}
      </div>
    </div>`;
  }

  if (tpl.layout === 'banner') {
    return `<div class="resume-doc doc-banner" id="resumeDocInner">
      <div class="band" style="background:${p}">
        <div class="avatar-lg">${avatarHtml}</div>
        <div>
          <div class="name">${escapeHtml(resume.fullName)}</div>
          <div class="role-line">${escapeHtml(roleLine)}</div>
          <div class="contact-line">${escapeHtml(resume.phone)} · ${escapeHtml(resume.email)} · ${escapeHtml(resume.location)}</div>
        </div>
      </div>
      <div class="body-2col">
        <div>
          ${resume.objective ? `<div class="resume-section"><h4 style="color:${p};border-color:${p}">Career Objective</h4><p style="margin:0;font-size:13.5px;color:#333;">${escapeHtml(resume.objective)}</p></div>` : ''}
          ${sections.filter(function (s) { return !['Technical Skills', 'Languages Known', 'Hobbies / Interests', 'Strengths'].includes(s.title); }).map(function (s) {
            return `<div class="resume-section"><h4 style="color:${p};border-color:${p}">${escapeHtml(s.title)}</h4>${s.html}</div>`;
          }).join('')}
        </div>
        <div>
          ${sections.filter(function (s) { return ['Technical Skills', 'Languages Known', 'Hobbies / Interests', 'Strengths'].includes(s.title); }).map(function (s) {
            return `<div class="resume-section"><h4 style="color:${p};border-color:${p}">${escapeHtml(s.title)}</h4>${s.html}</div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  if (tpl.layout === 'elegant') {
    return `<div class="resume-doc doc-elegant" id="resumeDocInner">
      <div class="avatar-lg" style="width:70px;height:70px;border-radius:50%;overflow:hidden;background:rgba(255,255,255,.1);margin-bottom:16px;display:flex;align-items:center;justify-content:center;font-size:26px;">${avatarHtml}</div>
      <div class="name">${escapeHtml(resume.fullName)}</div>
      <div class="role-line">${escapeHtml(roleLine)}</div>
      <div class="contact-line">${escapeHtml(resume.phone)} · ${escapeHtml(resume.email)} · ${escapeHtml(resume.location)}</div>
      <div class="header-rule" style="background:${p}"></div>
      ${resume.objective ? `<div class="resume-section"><h4 style="color:${p};border-color:${p}">Career Objective</h4><p style="margin:0;font-size:13.5px;">${escapeHtml(resume.objective)}</p></div>` : ''}
      ${sectionsHtml}
    </div>`;
  }

  // minimal (default)
  return `<div class="resume-doc doc-minimal" id="resumeDocInner">
    ${resume.photo ? `<div class="avatar-lg" style="width:76px;height:76px;border-radius:50%;overflow:hidden;background:#eee;margin-bottom:14px;display:flex;align-items:center;justify-content:center;font-size:26px;">${avatarHtml}</div>` : ''}
    <div class="name">${escapeHtml(resume.fullName)}</div>
    <div class="role-line">${escapeHtml(roleLine)}</div>
    <div class="contact-line">${escapeHtml(resume.phone)} · ${escapeHtml(resume.email)} · ${escapeHtml(resume.location)}</div>
    <div class="header-rule" style="background:${p}"></div>
    ${resume.objective ? `<div class="resume-section"><h4 style="color:${p};border-color:${p}">Career Objective</h4><p style="margin:0;font-size:13.5px;color:#333;">${escapeHtml(resume.objective)}</p></div>` : ''}
    ${sectionsHtml}
  </div>`;
}

/* PDF export using html2canvas + jsPDF (loaded via CDN in preview.html) */
function downloadResumeAsPdf(resume) {
  const node = document.getElementById('resumeDocInner');
  if (!node || !window.html2canvas || !window.jspdf) {
    showToast('PDF library failed to load. Check your connection and try again.');
    return;
  }
  showToast('Preparing your PDF…');

  // On phones the doc is visually shrunk (CSS transform) to fit the screen.
  // Reset that for the capture so html2canvas always grabs the full-size,
  // un-squished layout — then restore the on-screen scale afterwards.
  const previousTransform = node.style.transform;
  node.style.transform = 'none';

  // Get actual resume doc dimensions for accurate scaling
  const docWidth = node.offsetWidth;
  const docHeight = node.offsetHeight;
  
  // A4 dimensions in pixels (at 96dpi: 210mm ≈ 794px, 297mm ≈ 1123px)
  const a4Width = 794;
  const a4Height = 1123;
  
  // Calculate scale to fit A4 page without overflow
  let scale = 1.5;
  if (docHeight > a4Height) {
    scale = (a4Height * 0.95) / docHeight; // 95% to leave margin
  }
  
  window.html2canvas(node, { 
    scale: scale, 
    useCORS: true, 
    backgroundColor: '#ffffff',
    allowTaint: true
  }).then(function (canvas) {
    node.style.transform = previousTransform;
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    
    // Create A4 PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();  // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    
    // Calculate image dimensions to fit A4
    const imgAspect = canvas.width / canvas.height;
    let imgWidth = pdfWidth - 4;  // 4mm margin
    let imgHeight = imgWidth / imgAspect;
    
    // If content is taller than A4, scale down
    if (imgHeight > pdfHeight - 4) {
      imgHeight = pdfHeight - 4;
      imgWidth = imgHeight * imgAspect;
    }
    
    // Center image on page
    const xOffset = (pdfWidth - imgWidth) / 2;
    const yOffset = (pdfHeight - imgHeight) / 2;
    
    // Add image to PDF (single page only)
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
    
    // Save with clean filename
    const safeName = (resume.fullName || 'Resume').trim().replace(/\s+/g, '_');
    pdf.save(safeName + '_CV.pdf');
    showToast('CV downloaded successfully!');
  }).catch(function (err) {
    node.style.transform = previousTransform;
    console.error(err);
    showToast('Could not generate the PDF. Please try again.');
  });
}

/* ---------- My Resumes page ---------- */
function initResumesPage() {
  ensureUiPrimitives();
  renderSidebar('resumes');
  const user = requireAuth();
  if (!user) return;

  renderResumesList();
}

function renderResumesList() {
  const grid = document.getElementById('resumesGrid');
  const empty = document.getElementById('resumesEmpty');
  const resumes = getMyResumes().sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); });

  if (resumes.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  grid.style.display = 'grid';
  empty.style.display = 'none';

  grid.innerHTML = resumes.map(function (r) {
    const tpl = getTemplate(r.template);
    const photo = r.photo ? `<img src="${r.photo}" alt="">` : '👤';
    const date = new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    return `
      <div class="resume-card">
        <div class="resume-card-top">
          <div class="resume-card-photo">${photo}</div>
          <div>
            <div class="resume-card-title">${escapeHtml(r.fullName)}</div>
            <div class="resume-card-meta">${escapeHtml(tpl.name)} · ${date}</div>
          </div>
        </div>
        <div class="resume-card-actions">
          <button class="btn btn-secondary btn-sm act-preview" data-id="${r.id}">👁️ Preview</button>
          <button class="btn btn-secondary btn-sm act-edit" data-id="${r.id}">✏️ Edit</button>
          <button class="btn btn-secondary btn-sm act-download" data-id="${r.id}">📥 Download</button>
          <button class="btn btn-danger btn-sm act-delete" data-id="${r.id}">🗑️ Delete</button>
        </div>
      </div>`;
  }).join('');

  $all('.act-preview', grid).forEach(function (b) { b.addEventListener('click', function () { window.location.href = 'preview.html?id=' + encodeURIComponent(b.dataset.id); }); });
  $all('.act-edit', grid).forEach(function (b) { b.addEventListener('click', function () { window.location.href = 'cv-form.html?resumeId=' + encodeURIComponent(b.dataset.id); }); });
  $all('.act-download', grid).forEach(function (b) {
    b.addEventListener('click', function () { window.location.href = 'preview.html?id=' + encodeURIComponent(b.dataset.id) + '&auto=pdf'; });
  });
  $all('.act-delete', grid).forEach(function (b) {
    b.addEventListener('click', function () {
      confirmModal('Delete this resume?', 'This removes it permanently from this device.', function () {
        deleteResume(b.dataset.id);
        showToast('Resume deleted.');
        renderResumesList();
      });
    });
  });
}