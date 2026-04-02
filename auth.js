// FinOps Academy — Auth, Organisation & Progress Management
// localStorage-based prototype (single-device; no server required)

const FinOpsAuth = (() => {
  const USERS_KEY    = 'finops_users';
  const ORGS_KEY     = 'finops_orgs';
  const SESSION_KEY  = 'finops_session';
  const INVITES_KEY  = 'finops_invites';
  const PROGRESS_KEY = 'finops_progress';

  // Role → track definition (module IDs must match HTML filenames without .html)
  const TRACKS = {
    pm: {
      name: 'Product Manager', icon: '📋', color: '#a855f7',
      page: 'pm.html',
      modules: ['pm-module1','pm-module2','pm-module3','pm-module4','pm-module5',
                'pm-module6','pm-module7','pm-module8','pm-module9']
    },
    developer: {
      name: 'Developer', icon: '👨‍💻', color: '#6c47ff',
      page: 'developer.html',
      modules: ['dev-module1','dev-module2','dev-module3','dev-module6',
                'dev-module9','dev-module10','dev-module11','dev-module12',
                'dev-module13','dev-module14','dev-module15','dev-module16']
    },
    devops: {
      name: 'DevOps', icon: '🔧', color: '#ff6b35',
      page: 'devops.html',
      modules: ['dev-module4','dev-module5','dev-module7','dev-module8',
                'devops-module5','devops-module6','devops-module7','devops-module8',
                'devops-module9','devops-module10','devops-module11','devops-module12']
    },
    cto: {
      name: 'CTO', icon: '🏛️', color: '#ff6b35',
      page: 'cto.html',
      modules: ['cto-module1','cto-module2','cto-module3','cto-module4',
                'cto-module5','cto-module6','cto-module7','cto-module8']
    },
    finance: {
      name: 'Finance', icon: '💼', color: '#22c55e',
      page: 'finance.html',
      modules: ['fin-module1','fin-module2','fin-module3','fin-module4',
                'fin-module5','fin-module6','fin-module7','fin-module8']
    },
    architect: {
      name: 'Cloud Architect', icon: '🏗️', color: '#22c55e',
      page: 'architect.html',
      modules: ['arch-module1','arch-module2','arch-module3','arch-module4',
                'arch-module5','arch-module6','arch-module7','arch-module8']
    }
  };

  // ── Storage helpers ──────────────────────────────────────────────────────────
  function get(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) || def; } catch(e) { return def; }
  }
  function set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function getUsers()    { return get(USERS_KEY,    []); }
  function getOrgs()     { return get(ORGS_KEY,     []); }
  function getInvites()  { return get(INVITES_KEY,  []); }
  function getProgress() { return get(PROGRESS_KEY, []); }

  // ── ID generator ─────────────────────────────────────────────────────────────
  function genId() {
    return Math.random().toString(36).substr(2,9) + Date.now().toString(36);
  }

  // ── Session ───────────────────────────────────────────────────────────────────
  function getSession()     { return get(SESSION_KEY, null); }
  function getCurrentUser() {
    const s = getSession();
    if (!s) return null;
    return getUsers().find(u => u.id === s.userId) || null;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────────
  function login(email, password) {
    const users = getUsers();
    const user  = users.find(u =>
      u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
    );
    if (!user) return { error: 'Invalid email or password.' };
    set(SESSION_KEY, { userId: user.id });
    user.lastActive = new Date().toISOString();
    set(USERS_KEY, users);
    return { user };
  }

  function logout() { localStorage.removeItem(SESSION_KEY); }

  // ── Organisation creation (owner signup) ─────────────────────────────────────
  function createOrg(orgName, ownerName, email, password) {
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()))
      return { error: 'An account with this email already exists.' };
    const orgId  = genId();
    const userId = genId();
    const org  = { id: orgId,  name: orgName.trim(), ownerId: userId, createdAt: new Date().toISOString() };
    const user = {
      id: userId, email: email.toLowerCase().trim(), password,
      name: ownerName.trim(), role: 'owner', track: null,
      orgId, isOwner: true,
      createdAt: new Date().toISOString(), lastActive: new Date().toISOString()
    };
    const orgs = getOrgs();
    orgs.push(org);
    users.push(user);
    set(ORGS_KEY, orgs);
    set(USERS_KEY, users);
    set(SESSION_KEY, { userId });
    return { user, org };
  }

  // ── Invites ───────────────────────────────────────────────────────────────────
  function createInvite(orgId, track) {
    const token  = genId() + genId();
    const invite = { token, orgId, track, createdAt: new Date().toISOString(), used: false };
    const invites = getInvites();
    invites.push(invite);
    set(INVITES_KEY, invites);
    return token;
  }

  function getInviteByToken(token) {
    return getInvites().find(i => i.token === token && !i.used) || null;
  }

  function acceptInvite(token, name, email, password) {
    const invites = getInvites();
    const invite  = invites.find(i => i.token === token && !i.used);
    if (!invite) return { error: 'This invite link is invalid or has already been used.' };
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()))
      return { error: 'An account with this email already exists.' };
    const userId = genId();
    const user   = {
      id: userId, email: email.toLowerCase().trim(), password,
      name: name.trim(), role: invite.track, track: invite.track,
      orgId: invite.orgId, isOwner: false,
      createdAt: new Date().toISOString(), lastActive: new Date().toISOString()
    };
    invite.used   = true;
    invite.usedBy = userId;
    users.push(user);
    set(USERS_KEY, users);
    set(INVITES_KEY, invites);
    set(SESSION_KEY, { userId });
    return { user };
  }

  // ── Organisation queries ──────────────────────────────────────────────────────
  function getOrgById(orgId) { return getOrgs().find(o => o.id === orgId) || null; }
  function getOrgMembers(orgId) { return getUsers().filter(u => u.orgId === orgId); }

  // ── Progress ──────────────────────────────────────────────────────────────────
  function saveModuleProgress(moduleId, score, maxScore) {
    const user = getCurrentUser();
    if (!user) return;
    const progress = getProgress();
    const idx = progress.findIndex(p => p.userId === user.id && p.moduleId === moduleId);
    const record = {
      userId: user.id, moduleId, score, maxScore,
      completedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      if (score >= progress[idx].score) progress[idx] = record;
    } else {
      progress.push(record);
    }
    set(PROGRESS_KEY, progress);
    // touch lastActive
    const users = getUsers();
    const u = users.find(u => u.id === user.id);
    if (u) { u.lastActive = new Date().toISOString(); set(USERS_KEY, users); }
  }

  function getUserProgress(userId) {
    return getProgress().filter(p => p.userId === userId);
  }

  function getTrackCompletion(userId, trackKey) {
    const track = TRACKS[trackKey];
    if (!track) return { completed: 0, total: 0, pct: 0 };
    const done = getUserProgress(userId).map(p => p.moduleId);
    const completed = track.modules.filter(m => done.includes(m)).length;
    const total = track.modules.length;
    return { completed, total, pct: total ? Math.round((completed / total) * 100) : 0 };
  }

  function getCompletedModules(userId) {
    return getUserProgress(userId).map(p => p.moduleId);
  }

  // ── Guards ────────────────────────────────────────────────────────────────────
  function requireAuth(redirect) {
    if (!getCurrentUser()) {
      window.location.href = redirect || 'login.html';
      return false;
    }
    return true;
  }
  function requireOwner() {
    const u = getCurrentUser();
    if (!u || !u.isOwner) { window.location.href = 'index.html'; return false; }
    return true;
  }

  // ── Inject nav user badge into any page ───────────────────────────────────────
  function injectUserNav() {
    const user = getCurrentUser();
    if (!user) return;
    const nav = document.querySelector('nav');
    if (!nav) return;
    const track = user.track ? TRACKS[user.track] : null;
    const dashLink = user.isOwner
      ? `<a href="dashboard.html" class="nav-user-link">📊 Dashboard</a>`
      : '';
    const badge = document.createElement('div');
    badge.className = 'nav-user';
    badge.innerHTML = `
      ${dashLink}
      <span class="nav-user-name">${user.name}</span>
      ${track ? `<span class="nav-user-role" style="background:${track.color}22;color:${track.color};border:1px solid ${track.color}44">${track.icon} ${track.name}</span>` : '<span class="nav-user-role">Owner</span>'}
      <button class="nav-logout" onclick="FinOpsAuth.logout();window.location.href='login.html'">Logout</button>
    `;
    nav.appendChild(badge);
  }

  return {
    TRACKS,
    login, logout,
    createOrg,
    createInvite, getInviteByToken, acceptInvite,
    getCurrentUser, getSession, getOrgById, getOrgMembers, getOrgs,
    saveModuleProgress, getUserProgress, getTrackCompletion, getCompletedModules,
    requireAuth, requireOwner, injectUserNav,
    genId
  };
})();
