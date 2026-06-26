
/* ══════════════════════════════════════════════════════════════
   GeoTopo Pro — Auth + Project Client
   Injected BEFORE existing app code — does not modify GIS features
   ══════════════════════════════════════════════════════════════ */

const API = (()=>{
  const BASE = '/api';
  let _token = localStorage.getItem('gtp_token') || null;
  let _user  = JSON.parse(localStorage.getItem('gtp_user') || 'null');

  function headers(extra={}) {
    const h = { 'Content-Type':'application/json', ...extra };
    if (_token) h['Authorization'] = 'Bearer '+_token;
    return h;
  }

  async function call(path, opts={}) {
    const r = await fetch(BASE+path, {
      headers: headers(),
      ...opts,
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {})
    });
    const data = await r.json().catch(()=>({ error: 'Réponse invalide' }));
    if (!r.ok) throw new Error(data.error || 'Erreur '+r.status);
    return data;
  }

  return {
    getToken:() => _token,
    getUser: () => _user,
    isLoggedIn: () => !!_token && !!_user,

    async register(email, password, name, plan) {
      const d = await call('/auth/register', { method:'POST', body:{email,password,name,plan} });
      _token = d.token; _user = d.user;
      localStorage.setItem('gtp_token', _token);
      localStorage.setItem('gtp_user', JSON.stringify(_user));
      return d;
    },

    async login(email, password) {
      const d = await call('/auth/login', { method:'POST', body:{email,password} });
      _token = d.token; _user = d.user;
      localStorage.setItem('gtp_token', _token);
      localStorage.setItem('gtp_user', JSON.stringify(_user));
      return d;
    },

    async logout() {
      try { await call('/auth/logout', { method:'POST' }); } catch(_){}
      _token = null; _user = null;
      localStorage.removeItem('gtp_token');
      localStorage.removeItem('gtp_user');
      localStorage.removeItem('gtp_project');
    },

    async me() { return call('/auth/me'); },

    async resetRequest(email) { return call('/auth/reset-request', { method:'POST', body:{email} }); },
    async resetConfirm(token, password) { return call('/auth/reset-confirm', { method:'POST', body:{token,password} }); },

    // Projects
    async listProjects()            { return call('/projects'); },
    async createProject(data)       { return call('/projects', { method:'POST', body:data }); },
    async getProject(id)            { return call('/projects/'+id); },
    async updateProject(id, data)   { return call('/projects/'+id, { method:'PUT', body:data }); },
    async deleteProject(id)         { return call('/projects/'+id, { method:'DELETE' }); },

    // Layers
    async saveLayers(projectId, layers) {
      const results = [];
      for (const layer of layers) {
        const r = await call('/projects/'+projectId+'/layers', { method:'POST', body:layer });
        results.push(r);
      }
      return results;
    },
    async deleteLayer(id) { return call('/layers/'+id, { method:'DELETE' }); },
  };
})();

/* ── Current project state ── */
let currentProject = JSON.parse(localStorage.getItem('gtp_project') || 'null');
let autoSaveTimer  = null;
let isDirty        = false;

function markDirty() {
  isDirty = true;
  const ind = document.getElementById('saveIndicator');
  if (ind) { ind.textContent = '●'; ind.style.color = '#f5a623'; ind.title = 'Modifications non sauvegardées'; }
  // Auto-save after 30 seconds of inactivity
  clearTimeout(autoSaveTimer);
  if (API.isLoggedIn() && currentProject) {
    autoSaveTimer = setTimeout(autoSave, 30000);
  }
}

function markSaved() {
  isDirty = false;
  const ind = document.getElementById('saveIndicator');
  if (ind) { ind.textContent = '✓'; ind.style.color = '#1fd1a8'; ind.title = 'Sauvegardé'; }
}

/* ── Export current map state as layers array ── */
function getCurrentLayers() {
  const layers = [];
  if (typeof drawn === 'undefined') return layers;
  drawn.eachLayer(layer => {
    try {
      const gj = layer.toGeoJSON ? layer.toGeoJSON() : null;
      if (!gj) return;
      layers.push({
        name: layer._gname || (layer._gtype || 'layer'),
        type: 'geojson',
        geojson: gj,
        style: { color: layer._gcolor || '#1fd1a8' },
        visible: 1,
        z_index: layer._gid || 0,
        meta: JSON.stringify({ gid: layer._gid, gtype: layer._gtype })
      });
    } catch(e) {}
  });
  return layers;
}

/* ── Auto-save ── */
async function autoSave() {
  if (!API.isLoggedIn() || !currentProject || !isDirty) return;
  try {
    const c = map.getCenter();
    await API.updateProject(currentProject.id, {
      crs: activeCRS,
      base_map: baseKey,
      center_lat: c.lat,
      center_lon: c.lng,
      zoom: map.getZoom()
    });
    markSaved();
  } catch(e) { console.warn('Auto-save failed:', e); }
}

/* ── Save full project ── */
async function saveProject() {
  if (!API.isLoggedIn()) { showAuthModal('login'); return; }
  if (!currentProject) { showNewProjectModal(); return; }
  try {
    showToast('Sauvegarde…', false, true);
    const c = map.getCenter();
    await API.updateProject(currentProject.id, {
      crs: activeCRS, base_map: baseKey,
      center_lat: c.lat, center_lon: c.lng, zoom: map.getZoom()
    });
    markSaved();
    showToast('✓ Projet sauvegardé');
  } catch(e) { showToast('Erreur: '+e.message, true); }
}

function showToast(msg, isErr, busy) {
  if (typeof toast === 'function') toast(msg, isErr);
}

/* ── Load project ── */
async function loadProject(id) {
  try {
    showToast('Chargement…', false, true);
    const { project, layers } = await API.getProject(id);
    currentProject = project;
    localStorage.setItem('gtp_project', JSON.stringify(project));

    // Restore map state
    if (project.center_lat && project.center_lon)
      map.setView([project.center_lat, project.center_lon], project.zoom || 12);
    if (project.crs && typeof activeCRS !== 'undefined') {
      activeCRS = project.crs;
      // Trigger CRS update
      const crsEl = document.getElementById('crsCurrent');
      if (crsEl) crsEl.textContent = project.crs;
    }

    // Restore layers
    if (typeof drawn !== 'undefined') { drawn.clearLayers(); selectedLayer = null; }
    for (const layer of layers) {
      try {
        const gj = layer.geojson ? JSON.parse(layer.geojson) : null;
        if (!gj) continue;
        const style = layer.style ? JSON.parse(layer.style) : {};
        if (typeof addGeoJSON === 'function') {
          addGeoJSON(gj, style.color || '#1fd1a8');
        }
      } catch(e) { console.warn('Layer restore error:', e); }
    }
    if (typeof renderList === 'function') renderList();
    markSaved();
    showToast('✓ '+project.name+' chargé');
    closeDashboard();
  } catch(e) { showToast('Erreur: '+e.message, true); }
}

/* ══ UI: AUTH MODAL ══════════════════════════════════════════ */
function showAuthModal(tab='login') {
  const existing = document.getElementById('authModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,15,40,.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
  <div style="background:#0d1421;border:1px solid #1e3a5f;border-radius:20px;padding:32px;width:400px;max-width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.6)">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:36px;margin-bottom:8px">⛰</div>
      <div style="font-size:20px;font-weight:800;color:#e2e8f0">GeoTopo Pro</div>
      <div style="font-size:12px;color:#8294b5;margin-top:4px">Plateforme Topographique Professionnelle</div>
    </div>

    <div style="display:flex;gap:4px;background:#0a1628;border-radius:10px;padding:4px;margin-bottom:20px" id="authTabs">
      <button onclick="switchAuthTab('login')" id="tab-login"
        style="flex:1;padding:8px;border-radius:7px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;background:${tab==='login'?'#1e3a5f':'transparent'};color:${tab==='login'?'#e2e8f0':'#8294b5'}">
        Connexion
      </button>
      <button onclick="switchAuthTab('register')" id="tab-register"
        style="flex:1;padding:8px;border-radius:7px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;background:${tab==='register'?'#1e3a5f':'transparent'};color:${tab==='register'?'#e2e8f0':'#8294b5'}">
        Inscription
      </button>
      <button onclick="switchAuthTab('reset')" id="tab-reset"
        style="flex:1;padding:8px;border-radius:7px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;background:${tab==='reset'?'#1e3a5f':'transparent'};color:${tab==='reset'?'#e2e8f0':'#8294b5'}">
        Mot de passe
      </button>
    </div>

    <!-- LOGIN -->
    <div id="form-login" style="display:${tab==='login'?'block':'none'}">
      <input id="loginEmail" type="email" placeholder="Email" style="${inputStyle}"/>
      <input id="loginPass"  type="password" placeholder="Mot de passe" style="${inputStyle}"/>
      <div id="loginErr" style="color:#ef4444;font-size:12px;margin-bottom:8px;display:none"></div>
      <button onclick="doLogin()" style="${btnPrimary}">Se connecter</button>
      <button onclick="doDemo()"  style="${btnSecondary}">🎯 Continuer sans compte</button>
    </div>

    <!-- REGISTER -->
    <div id="form-register" style="display:${tab==='register'?'block':'none'}">
      <input id="regName"  type="text"     placeholder="Nom complet"           style="${inputStyle}"/>
      <input id="regEmail" type="email"    placeholder="Email professionnel"    style="${inputStyle}"/>
      <input id="regPass"  type="password" placeholder="Mot de passe (min 8)"  style="${inputStyle}"/>
      <div style="font-size:11px;color:#8294b5;margin-bottom:10px">Choisir un plan :</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        <div id="plan-free" onclick="selectPlan('free')"
          style="border:2px solid #1e3a5f;border-radius:10px;padding:12px;text-align:center;cursor:pointer;transition:all .15s">
          <div style="font-size:18px;margin-bottom:4px">🆓</div>
          <div style="font-size:12px;font-weight:700;color:#e2e8f0">Gratuit</div>
          <div style="font-size:11px;color:#8294b5">Local uniquement</div>
        </div>
        <div id="plan-annual" onclick="selectPlan('annual')"
          style="border:2px solid #1fd1a8;background:rgba(31,209,168,.08);border-radius:10px;padding:12px;text-align:center;cursor:pointer;transition:all .15s">
          <div style="font-size:18px;margin-bottom:4px">⭐</div>
          <div style="font-size:12px;font-weight:700;color:#1fd1a8">400 MAD/an</div>
          <div style="font-size:11px;color:#8294b5">Cloud + toutes fonctions</div>
        </div>
      </div>
      <div id="regErr" style="color:#ef4444;font-size:12px;margin-bottom:8px;display:none"></div>
      <button onclick="doRegister()" style="${btnPrimary}">Créer mon compte</button>
      <div style="font-size:11px;color:#8294b5;text-align:center;margin-top:8px">✓ 30 jours d'essai gratuit · Sans engagement</div>
    </div>

    <!-- RESET -->
    <div id="form-reset" style="display:${tab==='reset'?'block':'none'}">
      <div id="reset-step1">
        <div style="font-size:12px;color:#8294b5;margin-bottom:12px">Entrez votre email pour recevoir un lien de réinitialisation.</div>
        <input id="resetEmail" type="email" placeholder="Email" style="${inputStyle}"/>
        <div id="resetErr" style="color:#ef4444;font-size:12px;margin-bottom:8px;display:none"></div>
        <button onclick="doResetRequest()" style="${btnPrimary}">Envoyer le lien</button>
      </div>
      <div id="reset-step2" style="display:none">
        <div style="font-size:12px;color:#1fd1a8;margin-bottom:12px">Entrez le token reçu et votre nouveau mot de passe.</div>
        <input id="resetToken"  type="text"     placeholder="Token de réinitialisation" style="${inputStyle}"/>
        <input id="resetNewPass" type="password" placeholder="Nouveau mot de passe"     style="${inputStyle}"/>
        <button onclick="doResetConfirm()" style="${btnPrimary}">Réinitialiser</button>
      </div>
    </div>

    <button onclick="document.getElementById('authModal').remove()" style="display:block;width:100%;padding:8px;background:transparent;border:none;color:#8294b5;font-size:12px;cursor:pointer;margin-top:12px">Fermer</button>
  </div>`;

  const inputStyle = 'width:100%;background:#0a1628;border:1.5px solid #1e3a5f;color:#e2e8f0;border-radius:10px;padding:10px 12px;font-size:13px;outline:none;margin-bottom:10px;box-sizing:border-box;';
  const btnPrimary = 'width:100%;padding:11px;background:#1fd1a8;color:#0d1421;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:8px;';
  const btnSecondary = 'width:100%;padding:11px;background:transparent;color:#8294b5;border:1.5px solid #1e3a5f;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;';

  // Fix inline styles with variables
  modal.innerHTML = modal.innerHTML
    .replace(/\${inputStyle}/g, inputStyle)
    .replace(/\${btnPrimary}/g, btnPrimary)
    .replace(/\${btnSecondary}/g, btnSecondary);

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
}

let selectedPlanVal = 'annual';
function selectPlan(plan) {
  selectedPlanVal = plan;
  ['free','credit','annual'].forEach(p => {
    const el = document.getElementById('plan-'+p);
    if (!el) return;
    el.style.borderColor = (p===plan) ? '#1fd1a8' : '#1e3a5f';
    el.style.background  = (p===plan) ? 'rgba(31,209,168,.08)' : 'transparent';
  });
}

function switchAuthTab(tab) {
  ['login','register','reset'].forEach(t => {
    const f = document.getElementById('form-'+t);
    const b = document.getElementById('tab-'+t);
    if (f) f.style.display = (t===tab) ? 'block' : 'none';
    if (b) {
      b.style.background = (t===tab) ? '#1e3a5f' : 'transparent';
      b.style.color      = (t===tab) ? '#e2e8f0' : '#8294b5';
    }
  });
}

function setAuthErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

async function doLogin() {
  const email = (document.getElementById('loginEmail')||{}).value?.trim();
  const pass  = (document.getElementById('loginPass')||{}).value;
  setAuthErr('loginErr','');
  try {
    await API.login(email, pass);
    document.getElementById('authModal')?.remove();
    updateUserUI();
    toast('✓ Connecté en tant que '+API.getUser()?.name);
    showDashboard();
  } catch(e) { setAuthErr('loginErr', e.message); }
}

async function doRegister() {
  const name  = (document.getElementById('regName')||{}).value?.trim();
  const email = (document.getElementById('regEmail')||{}).value?.trim();
  const pass  = (document.getElementById('regPass')||{}).value;
  setAuthErr('regErr','');
  try {
    await API.register(email, pass, name, selectedPlanVal);
    document.getElementById('authModal')?.remove();
    updateUserUI();
    toast('✓ Compte créé — bienvenue '+name+'!');
    showDashboard();
  } catch(e) { setAuthErr('regErr', e.message); }
}

function doDemo() {
  document.getElementById('authModal')?.remove();
  toast('Mode démo — données locales uniquement');
}

async function doResetRequest() {
  const email = (document.getElementById('resetEmail')||{}).value?.trim();
  setAuthErr('resetErr','');
  try {
    const r = await API.resetRequest(email);
    document.getElementById('reset-step1').style.display = 'none';
    document.getElementById('reset-step2').style.display = 'block';
    if (r.dev_token) console.info('DEV reset token:', r.dev_token);
    toast('Email envoyé (vérifiez la console en mode dev)');
  } catch(e) { setAuthErr('resetErr', e.message); }
}

async function doResetConfirm() {
  const token = (document.getElementById('resetToken')||{}).value?.trim();
  const pass  = (document.getElementById('resetNewPass')||{}).value;
  try {
    await API.resetConfirm(token, pass);
    document.getElementById('authModal')?.remove();
    toast('✓ Mot de passe réinitialisé — reconnectez-vous');
    setTimeout(() => showAuthModal('login'), 500);
  } catch(e) { toast(e.message, true); }
}

/* ══ UI: USER TOPBAR BUTTON ══════════════════════════════════ */
function updateUserUI() {
  const btn = document.getElementById('btnUser');
  if (!btn) return;
  const user = API.getUser();
  if (user) {
    const initials = user.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    btn.textContent = initials;
    btn.style.background = '#1fd1a8';
    btn.style.color = '#0d1421';
    btn.title = user.name+' — '+user.email;
  } else {
    btn.textContent = '👤';
    btn.style.background = 'var(--surface2,#111e35)';
    btn.style.color = 'var(--txt,#e2e8f0)';
    btn.title = 'Connexion / Inscription';
  }
}

function toggleUserMenu() {
  const user = API.getUser();
  if (!user) { showAuthModal('login'); return; }

  const existing = document.getElementById('userDropdown');
  if (existing) { existing.remove(); return; }

  const dd = document.createElement('div');
  dd.id = 'userDropdown';
  dd.style.cssText = 'position:fixed;top:54px;right:10px;z-index:8000;background:#0d1421;border:1px solid #1e3a5f;border-radius:14px;padding:8px;box-shadow:0 8px 30px rgba(0,0,0,.5);min-width:220px';
  dd.innerHTML = `
    <div style="padding:10px 12px;border-bottom:1px solid #1e3a5f;margin-bottom:6px">
      <div style="font-size:13px;font-weight:700;color:#e2e8f0">${user.name}</div>
      <div style="font-size:11px;color:#8294b5">${user.email}</div>
      <div style="display:inline-block;margin-top:6px;padding:2px 10px;background:rgba(31,209,168,.15);color:#1fd1a8;border-radius:20px;font-size:10px;font-weight:700">${user.plan?.toUpperCase()}</div>
    </div>
    ${menuItem('🗂', 'Mes projets', 'showDashboard()')}
    ${menuItem('💾', 'Sauvegarder', 'saveProject()')}
    ${menuItem('📂', 'Ouvrir un projet', 'showDashboard()')}
    <div style="height:1px;background:#1e3a5f;margin:6px 0"></div>
    ${menuItem('🚪', 'Déconnexion', 'doLogout()', '#ef4444')}
  `;
  document.body.appendChild(dd);
  setTimeout(()=>document.addEventListener('click', function h(e){
    if(!dd.contains(e.target)&&e.target!==document.getElementById('btnUser')){dd.remove();document.removeEventListener('click',h);}
  }), 10);
}

function menuItem(icon, label, action, color='#e2e8f0') {
  return `<button onclick="${action};document.getElementById('userDropdown')?.remove()" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;background:transparent;border:none;color:${color};font-size:13px;cursor:pointer;border-radius:8px;transition:background .1s;text-align:left" onmouseover="this.style.background='rgba(255,255,255,.05)'" onmouseout="this.style.background='transparent'"><span>${icon}</span>${label}</button>`;
}

async function doLogout() {
  await API.logout();
  currentProject = null;
  updateUserUI();
  toast('Déconnecté');
}

/* ══ UI: DASHBOARD ═══════════════════════════════════════════ */
function showDashboard() {
  if (!API.isLoggedIn()) { showAuthModal('login'); return; }

  const existing = document.getElementById('dashboard');
  if (existing) { existing.remove(); return; }

  const d = document.createElement('div');
  d.id = 'dashboard';
  d.style.cssText = 'position:fixed;inset:0;z-index:8500;background:rgba(0,15,40,.92);backdrop-filter:blur(8px);display:flex;flex-direction:column;overflow:hidden';
  d.innerHTML = `
  <div style="background:#0d1421;border-bottom:1px solid #1e3a5f;padding:14px 20px;display:flex;align-items:center;gap:14px">
    <span style="font-size:22px">⛰</span>
    <div>
      <div style="font-size:16px;font-weight:800;color:#e2e8f0">GeoTopo Pro — Mes Projets</div>
      <div style="font-size:11px;color:#8294b5">${API.getUser()?.name} · ${API.getUser()?.plan}</div>
    </div>
    <div style="margin-left:auto;display:flex;gap:8px">
      <button onclick="showNewProjectModal()" style="padding:8px 16px;background:#1fd1a8;color:#0d1421;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">+ Nouveau projet</button>
      <button onclick="closeDashboard()" style="padding:8px 14px;background:#1e3a5f;color:#e2e8f0;border:none;border-radius:10px;font-size:13px;cursor:pointer">✕ Fermer</button>
    </div>
  </div>
  <div style="flex:1;overflow-y:auto;padding:20px">
    <div id="projectGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">
      <div style="text-align:center;padding:40px;color:#8294b5">Chargement…</div>
    </div>
  </div>`;

  document.body.appendChild(d);
  loadProjectList();
}

function closeDashboard() {
  document.getElementById('dashboard')?.remove();
}

async function loadProjectList() {
  const grid = document.getElementById('projectGrid');
  if (!grid) return;
  try {
    const { projects } = await API.listProjects();
    if (!projects.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#8294b5">
        <div style="font-size:48px;margin-bottom:12px">📭</div>
        <div style="font-size:15px;font-weight:600">Aucun projet</div>
        <div style="font-size:12px;margin-top:6px">Créez votre premier projet pour commencer</div>
      </div>`;
      return;
    }
    grid.innerHTML = projects.map(p => `
    <div style="background:#0d1421;border:1px solid #1e3a5f;border-radius:14px;padding:16px;transition:border-color .15s;cursor:pointer"
         onmouseover="this.style.borderColor='#1fd1a8'" onmouseout="this.style.borderColor='#1e3a5f'">
      <div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:6px">${esc(p.name)}</div>
      ${p.description?`<div style="font-size:12px;color:#8294b5;margin-bottom:8px">${esc(p.description)}</div>`:''}
      <div style="font-size:10px;color:#4a5a7a;margin-bottom:12px">
        Mis à jour: ${new Date(p.updated_at).toLocaleDateString('fr-FR')}
        · CRS: ${p.crs||'WGS84'}
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="loadProject('${p.id}')" style="flex:1;padding:7px;background:#1fd1a8;color:#0d1421;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📂 Ouvrir</button>
        <button onclick="confirmDeleteProject('${p.id}','${esc(p.name)}')" style="padding:7px 12px;background:rgba(239,68,68,.15);color:#ef4444;border:1px solid rgba(239,68,68,.3);border-radius:8px;font-size:12px;cursor:pointer">🗑</button>
      </div>
    </div>`).join('');
  } catch(e) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#ef4444">Erreur: ${e.message}</div>`;
  }
}

function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

async function confirmDeleteProject(id, name) {
  if (!confirm(`Supprimer "${name}" ?\nCette action est irréversible.`)) return;
  try {
    await API.deleteProject(id);
    if (currentProject?.id === id) { currentProject = null; localStorage.removeItem('gtp_project'); }
    toast('Projet supprimé');
    loadProjectList();
  } catch(e) { toast(e.message, true); }
}

function showNewProjectModal() {
  const name = prompt('Nom du nouveau projet:');
  if (!name?.trim()) return;
  createNewProject(name.trim());
}

async function createNewProject(name) {
  try {
    const c = (typeof map !== 'undefined') ? map.getCenter() : { lat: 28.987, lng: -10.057 };
    const { id } = await API.createProject({
      name,
      crs: (typeof activeCRS !== 'undefined') ? activeCRS : 'EPSG:4326',
      base_map: (typeof baseKey !== 'undefined') ? baseKey : 'osm',
      center_lat: c.lat, center_lon: c.lng,
      zoom: (typeof map !== 'undefined') ? map.getZoom() : 12
    });
    currentProject = { id, name };
    localStorage.setItem('gtp_project', JSON.stringify(currentProject));
    closeDashboard();
    markSaved();
    toast('✓ Projet "'+name+'" créé');
  } catch(e) { toast(e.message, true); }
}

/* ══ HOOK: mark dirty on any draw event ══════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  updateUserUI();

  // Hook draw events to mark dirty — runs after Leaflet initializes
  setTimeout(() => {
    if (typeof map !== 'undefined') {
      map.on('draw:created draw:edited draw:deleted', () => markDirty());
    }
    if (typeof drawn !== 'undefined') {
      // Patch register() to also mark dirty
      const _origRegister = window.register;
      if (typeof _origRegister === 'function') {
        window.register = function(...args) {
          const result = _origRegister.apply(this, args);
          markDirty();
          return result;
        };
      }
    }

    // Auto-restore last project if logged in
    if (API.isLoggedIn() && currentProject) {
      const proj = localStorage.getItem('gtp_project');
      if (proj) {
        const p = JSON.parse(proj);
        // Silently restore last opened project
        loadProject(p.id).catch(() => {});
      }
    }

    // Ctrl+S to save
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveProject(); }
    });
  }, 500);
});
