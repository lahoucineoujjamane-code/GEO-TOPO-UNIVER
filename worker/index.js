/**
 * GeoTopo Pro — Cloudflare Worker
 * Routes: /api/auth/*, /api/projects/*, /api/layers/*, /api/files/*
 * Env: DB (D1), STORAGE (R2), JWT_SECRET, APP_URL
 */

// ── Crypto helpers ──────────────────────────────────────────
async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

async function randomHex(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// ── JWT (simple HS256) ──────────────────────────────────────
async function signJWT(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
  const body   = btoa(JSON.stringify(payload)).replace(/=/g, '');
  const key    = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${body}.${sigB64}`;
}

async function verifyJWT(token, secret) {
  try {
    const [h, b, s] = token.split('.');
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBuf = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid  = await crypto.subtle.verify('HMAC', key, sigBuf, new TextEncoder().encode(`${h}.${b}`));
    if (!valid) return null;
    const payload = JSON.parse(atob(b));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch { return null; }
}

// ── Response helpers ────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function ok(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...CORS }
  });
}
function err(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { 'Content-Type': 'application/json', ...CORS }
  });
}

// ── Auth middleware ─────────────────────────────────────────
async function requireAuth(req, env) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload?.sub) return null;
  // Verify session still exists in DB
  const tokenHash = await sha256(token);
  const session = await env.DB.prepare(
    'SELECT s.id, u.id as uid, u.email, u.name, u.plan FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime("now") AND u.is_active=1'
  ).bind(tokenHash).first();
  return session || null;
}

// ── Input validation ────────────────────────────────────────
function validEmail(e)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length < 255; }
function validPassword(p) { return typeof p === 'string' && p.length >= 8 && p.length < 128; }
function validName(n)     { return typeof n === 'string' && n.trim().length >= 2 && n.length < 100; }

// ══ MAIN HANDLER ════════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') return new Response(null, { headers: CORS });

    // Serve static files from /public (via Worker Sites or __STATIC_CONTENT)
    // When deployed with `wrangler pages`, static assets are served automatically.

    // ── API ROUTES ────────────────────────────────────────
    if (!path.startsWith('/api/')) {
      return new Response('Not found', { status: 404 });
    }

    try {
      // Auth routes (no auth required)
      if (path === '/api/auth/register' && method === 'POST')
        return await handleRegister(request, env);
      if (path === '/api/auth/login' && method === 'POST')
        return await handleLogin(request, env);
      if (path === '/api/auth/reset-request' && method === 'POST')
        return await handleResetRequest(request, env);
      if (path === '/api/auth/reset-confirm' && method === 'POST')
        return await handleResetConfirm(request, env);

      // Protected routes
      const user = await requireAuth(request, env);
      if (!user) return err('Unauthorized', 401);

      if (path === '/api/auth/logout' && method === 'POST')
        return await handleLogout(request, env, user);
      if (path === '/api/auth/me' && method === 'GET')
        return ok({ id: user.uid, email: user.email, name: user.name, plan: user.plan });

      // Projects
      if (path === '/api/projects' && method === 'GET')
        return await listProjects(env, user);
      if (path === '/api/projects' && method === 'POST')
        return await createProject(request, env, user);
      if (path.match(/^\/api\/projects\/[\w-]+$/) && method === 'GET')
        return await getProject(path, env, user);
      if (path.match(/^\/api\/projects\/[\w-]+$/) && method === 'PUT')
        return await updateProject(path, request, env, user);
      if (path.match(/^\/api\/projects\/[\w-]+$/) && method === 'DELETE')
        return await deleteProject(path, env, user);

      // Layers
      if (path.match(/^\/api\/projects\/[\w-]+\/layers$/) && method === 'GET')
        return await listLayers(path, env, user);
      if (path.match(/^\/api\/projects\/[\w-]+\/layers$/) && method === 'POST')
        return await saveLayer(path, request, env, user);
      if (path.match(/^\/api\/layers\/[\w-]+$/) && method === 'DELETE')
        return await deleteLayer(path, env, user);

      // File storage (R2)
      if (path.match(/^\/api\/files\/upload$/) && method === 'POST')
        return await uploadFile(request, env, user);
      if (path.match(/^\/api\/files\/[\w\-/.]+$/) && method === 'GET')
        return await downloadFile(path, env, user);

      return err('Not found', 404);
    } catch (e) {
      console.error(e);
      return err('Internal server error', 500);
    }
  }
};

// ══ AUTH HANDLERS ════════════════════════════════════════════

async function handleRegister(req, env) {
  const body = await req.json().catch(() => ({}));
  const { email, password, name, plan = 'free' } = body;

  if (!validEmail(email))    return err('Email invalide');
  if (!validPassword(password)) return err('Mot de passe: minimum 8 caractères');
  if (!validName(name))      return err('Nom invalide');
  if (!['free','credit','annual'].includes(plan)) return err('Plan invalide');

  // Check existing
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email.toLowerCase()).first();
  if (existing) return err('Email déjà utilisé');

  const id   = uuid();
  const salt = await randomHex(16);
  const hash = await hashPassword(password, salt);
  const trialEnd = new Date(Date.now() + 30 * 86400000).toISOString();

  await env.DB.prepare(
    'INSERT INTO users(id,email,name,password_hash,salt,plan,trial_ends_at) VALUES(?,?,?,?,?,?,?)'
  ).bind(id, email.toLowerCase(), name.trim(), hash, salt, plan, trialEnd).run();

  const token = await createSession(env, id, req);
  return ok({ token, user: { id, email, name, plan, trialEnd } }, 201);
}

async function handleLogin(req, env) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) return err('Email et mot de passe requis');

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE email=? AND is_active=1'
  ).bind(email.toLowerCase()).first();

  if (!user) return err('Email ou mot de passe incorrect', 401);

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.password_hash) return err('Email ou mot de passe incorrect', 401);

  // Update last_login
  await env.DB.prepare('UPDATE users SET last_login=datetime("now") WHERE id=?').bind(user.id).run();

  const token = await createSession(env, user.id, req);
  return ok({
    token,
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan,
            trialEndsAt: user.trial_ends_at }
  });
}

async function handleLogout(req, env, user) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.slice(7);
  const tokenHash = await sha256(token);
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(tokenHash).run();
  return ok({ message: 'Déconnecté' });
}

async function handleResetRequest(req, env) {
  const { email } = await req.json().catch(() => ({}));
  if (!validEmail(email)) return err('Email invalide');

  const user = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email.toLowerCase()).first();
  // Always return ok to prevent email enumeration
  if (!user) return ok({ message: 'Si cet email existe, un lien a été envoyé.' });

  const token   = await randomHex(32);
  const expires = new Date(Date.now() + 3600000).toISOString(); // 1h

  await env.DB.prepare(
    'UPDATE users SET reset_token=?, reset_token_expires=? WHERE id=?'
  ).bind(token, expires, user.id).run();

  // In production: send email via Resend/SendGrid
  // For now: return token (dev mode only — remove in production!)
  return ok({ message: 'Lien de réinitialisation envoyé.', dev_token: token });
}

async function handleResetConfirm(req, env) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!token || !validPassword(password)) return err('Token ou mot de passe invalide');

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE reset_token=? AND reset_token_expires>datetime("now")'
  ).bind(token).first();

  if (!user) return err('Token invalide ou expiré', 401);

  const salt = await randomHex(16);
  const hash = await hashPassword(password, salt);

  await env.DB.prepare(
    'UPDATE users SET password_hash=?,salt=?,reset_token=NULL,reset_token_expires=NULL WHERE id=?'
  ).bind(hash, salt, user.id).run();

  // Invalidate all sessions
  await env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id).run();

  return ok({ message: 'Mot de passe réinitialisé.' });
}

// ── Session creation ────────────────────────────────────────
async function createSession(env, userId, req) {
  const tokenRaw  = await randomHex(32);
  const tokenHash = await sha256(tokenRaw);
  const sessionId = uuid();
  const expires   = new Date(Date.now() + 30 * 86400000).toISOString(); // 30 days
  const ip        = req.headers.get('CF-Connecting-IP') || '';
  const ua        = (req.headers.get('User-Agent') || '').slice(0, 200);

  await env.DB.prepare(
    'INSERT INTO sessions(id,user_id,token_hash,expires_at,ip_address,user_agent) VALUES(?,?,?,?,?,?)'
  ).bind(sessionId, userId, tokenHash, expires, ip, ua).run();

  // Also sign JWT for stateless verification
  const jwt = await signJWT({ sub: userId, sid: sessionId, exp: Math.floor(Date.now()/1000) + 2592000 }, env.JWT_SECRET);
  return jwt;
}

// ══ PROJECT HANDLERS ═════════════════════════════════════════

async function listProjects(env, user) {
  const { results } = await env.DB.prepare(
    'SELECT id,name,description,crs,base_map,center_lat,center_lon,zoom,created_at,updated_at,thumbnail FROM projects WHERE user_id=? ORDER BY updated_at DESC LIMIT 50'
  ).bind(user.uid).all();
  return ok({ projects: results });
}

async function createProject(req, env, user) {
  const body = await req.json().catch(() => ({}));
  const { name = 'Nouveau projet', description = '', crs = 'EPSG:4326',
          base_map = 'osm', center_lat = 28.987, center_lon = -10.057, zoom = 12 } = body;

  if (!name.trim()) return err('Nom du projet requis');

  const id = uuid();
  await env.DB.prepare(
    'INSERT INTO projects(id,user_id,name,description,crs,base_map,center_lat,center_lon,zoom) VALUES(?,?,?,?,?,?,?,?,?)'
  ).bind(id, user.uid, name.trim(), description, crs, base_map, center_lat, center_lon, zoom).run();

  return ok({ id, name, message: 'Projet créé' }, 201);
}

async function getProject(path, env, user) {
  const id = path.split('/').pop();
  const project = await env.DB.prepare(
    'SELECT * FROM projects WHERE id=? AND user_id=?'
  ).bind(id, user.uid).first();

  if (!project) return err('Projet introuvable', 404);

  // Update last_opened
  await env.DB.prepare('UPDATE projects SET last_opened=datetime("now") WHERE id=?').bind(id).run();

  // Load layers
  const { results: layers } = await env.DB.prepare(
    'SELECT id,name,type,r2_key,geojson,style,visible,z_index,meta FROM layers WHERE project_id=? ORDER BY z_index'
  ).bind(id).all();

  return ok({ project, layers });
}

async function updateProject(path, req, env, user) {
  const id   = path.split('/').pop();
  const body = await req.json().catch(() => ({}));
  const { name, description, crs, base_map, center_lat, center_lon, zoom } = body;

  const exists = await env.DB.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').bind(id, user.uid).first();
  if (!exists) return err('Projet introuvable', 404);

  await env.DB.prepare(
    'UPDATE projects SET name=COALESCE(?,name),description=COALESCE(?,description),crs=COALESCE(?,crs),base_map=COALESCE(?,base_map),center_lat=COALESCE(?,center_lat),center_lon=COALESCE(?,center_lon),zoom=COALESCE(?,zoom),updated_at=datetime("now") WHERE id=?'
  ).bind(name||null, description||null, crs||null, base_map||null, center_lat||null, center_lon||null, zoom||null, id).run();

  return ok({ message: 'Projet mis à jour' });
}

async function deleteProject(path, env, user) {
  const id = path.split('/').pop();
  const project = await env.DB.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').bind(id, user.uid).first();
  if (!project) return err('Projet introuvable', 404);

  // Delete R2 files for this project
  const { results: layers } = await env.DB.prepare('SELECT r2_key FROM layers WHERE project_id=? AND r2_key IS NOT NULL').bind(id).all();
  await Promise.all(layers.map(l => env.STORAGE.delete(l.r2_key).catch(() => {})));

  await env.DB.prepare('DELETE FROM projects WHERE id=?').bind(id).run();
  return ok({ message: 'Projet supprimé' });
}

// ══ LAYER HANDLERS ═══════════════════════════════════════════

async function listLayers(path, env, user) {
  const projectId = path.split('/')[3];
  const { results } = await env.DB.prepare(
    'SELECT id,name,type,r2_key,geojson,style,visible,z_index,meta,created_at FROM layers WHERE project_id=? AND user_id=? ORDER BY z_index'
  ).bind(projectId, user.uid).all();
  return ok({ layers: results });
}

async function saveLayer(path, req, env, user) {
  const projectId = path.split('/')[3];

  // Verify project ownership
  const project = await env.DB.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').bind(projectId, user.uid).first();
  if (!project) return err('Projet introuvable', 404);

  const body = await req.json().catch(() => ({}));
  const { name, type, geojson, style, visible = 1, z_index = 0, meta } = body;

  if (!name || !type) return err('Nom et type requis');

  const id = uuid();
  let r2_key = null;
  let inlineGeoJSON = null;

  const geojsonStr = geojson ? JSON.stringify(geojson) : null;

  // Store large layers in R2, small ones inline
  if (geojsonStr && geojsonStr.length > 100000) {
    r2_key = `layers/${user.uid}/${projectId}/${id}.geojson`;
    await env.STORAGE.put(r2_key, geojsonStr, {
      httpMetadata: { contentType: 'application/json' }
    });
  } else {
    inlineGeoJSON = geojsonStr;
  }

  await env.DB.prepare(
    'INSERT INTO layers(id,project_id,user_id,name,type,r2_key,geojson,style,visible,z_index,meta) VALUES(?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(id, projectId, user.uid, name, type,
    r2_key, inlineGeoJSON,
    style ? JSON.stringify(style) : null,
    visible, z_index,
    meta ? JSON.stringify(meta) : null
  ).run();

  // Update project timestamp
  await env.DB.prepare('UPDATE projects SET updated_at=datetime("now") WHERE id=?').bind(projectId).run();

  return ok({ id, message: 'Couche sauvegardée' }, 201);
}

async function deleteLayer(path, env, user) {
  const id = path.split('/').pop();
  const layer = await env.DB.prepare('SELECT * FROM layers WHERE id=? AND user_id=?').bind(id, user.uid).first();
  if (!layer) return err('Couche introuvable', 404);

  if (layer.r2_key) await env.STORAGE.delete(layer.r2_key).catch(() => {});
  await env.DB.prepare('DELETE FROM layers WHERE id=?').bind(id).run();
  return ok({ message: 'Couche supprimée' });
}

// ══ FILE HANDLERS (R2) ════════════════════════════════════════

async function uploadFile(req, env, user) {
  const formData = await req.formData().catch(() => null);
  if (!formData) return err('FormData requis');

  const file = formData.get('file');
  const type = formData.get('type') || 'geojson'; // geojson|kml|gpx|dxf
  const projectId = formData.get('project_id');

  if (!file) return err('Fichier requis');

  const allowed = ['geojson','kml','gpx','dxf','csv'];
  if (!allowed.includes(type)) return err('Type non supporté');

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) return err('Fichier trop grand (max 10MB)');

  const ext      = { geojson:'geojson', kml:'kml', gpx:'gpx', dxf:'dxf', csv:'csv' }[type];
  const key      = `uploads/${user.uid}/${projectId || 'misc'}/${uuid()}.${ext}`;
  const mimeType = { geojson:'application/json', kml:'application/vnd.google-earth.kml+xml',
                     gpx:'application/gpx+xml', dxf:'application/dxf', csv:'text/csv' }[type];

  await env.STORAGE.put(key, file.stream(), {
    httpMetadata: { contentType: mimeType }
  });

  return ok({ key, message: 'Fichier uploadé' }, 201);
}

async function downloadFile(path, env, user) {
  // path = /api/files/layers/userId/projectId/layerId.geojson
  const key = path.replace('/api/files/', '');

  // Security: user can only access their own files
  if (!key.includes(`/${user.uid}/`) && !key.includes(`${user.uid}/`)) {
    return err('Accès refusé', 403);
  }

  const obj = await env.STORAGE.get(key);
  if (!obj) return err('Fichier introuvable', 404);

  const headers = { ...CORS };
  if (obj.httpMetadata?.contentType) headers['Content-Type'] = obj.httpMetadata.contentType;

  return new Response(obj.body, { headers });
}
