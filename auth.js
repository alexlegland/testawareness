// FinOps Academy — Auth, Organisation & Progress (Supabase backend)
// Requires: supabase-js CDN + config.js loaded before this file.

const FinOpsAuth = (() => {
  const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── Track definitions ────────────────────────────────────────────────────────
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

  // ── Profile cache (avoids redundant fetches within a page load) ──────────────
  let _profileCache = null;

  function _clearCache() { _profileCache = null; }

  // ── Current user ─────────────────────────────────────────────────────────────
  async function getCurrentUser() {
    const { data: { session } } = await _sb.auth.getSession();
    if (!session) { _clearCache(); return null; }
    if (_profileCache && _profileCache.id === session.user.id) return _profileCache;
    const { data, error } = await _sb
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (error || !data) return null;
    _profileCache = data;
    return data;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────────
  async function login(email, password) {
    const { data, error } = await _sb.auth.signInWithPassword({
      email: email.trim(), password
    });
    if (error) return { error: error.message };
    _clearCache();
    return { user: data.user };
  }

  async function logout() {
    _clearCache();
    await _sb.auth.signOut();
  }

  // ── Organisation creation (owner signup) ─────────────────────────────────────
  async function createOrg(orgName, ownerName, email, password) {
    const callbackUrl = window.location.origin + '/callback.html';
    const { data: authData, error: authErr } = await _sb.auth.signUp({
      email: email.trim(), password,
      options: {
        emailRedirectTo: callbackUrl,
        data: { _pending: 'org', _org_name: orgName.trim(), _owner_name: ownerName.trim() }
      }
    });
    if (authErr) return { error: authErr.message };

    // If email confirmation is disabled, session is immediate — finish setup now
    if (authData.session) {
      return await _finishOrgSetup(authData.user, orgName.trim(), ownerName.trim(), email.trim());
    }
    return { pending: true };
  }

  async function _finishOrgSetup(user, orgName, ownerName, email) {
    const { data: org, error: orgErr } = await _sb
      .from('organisations')
      .insert({ name: orgName, owner_id: user.id })
      .select().single();
    if (orgErr) return { error: orgErr.message };
    const { error: profErr } = await _sb.from('profiles').insert({
      id: user.id, email: (email || user.email).toLowerCase(),
      name: ownerName, role: 'owner', track: null, org_id: org.id, is_owner: true
    });
    if (profErr) return { error: profErr.message };
    _clearCache();
    return { org };
  }

  // ── Invites ───────────────────────────────────────────────────────────────────
  async function createInvite(orgId, track) {
    const token = crypto.randomUUID().replace(/-/g,'') + crypto.randomUUID().replace(/-/g,'');
    const { error } = await _sb.from('invites').insert({ token, org_id: orgId, track });
    if (error) { console.error(error); return null; }
    return token;
  }

  async function getInviteByToken(token) {
    const { data } = await _sb
      .from('invites')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();
    return data || null;
  }

  async function acceptInvite(token, name, email, password) {
    const invite = await getInviteByToken(token);
    if (!invite) return { error: 'This invite link is invalid or has already been used.' };

    const callbackUrl = window.location.origin + '/callback.html';
    const { data: authData, error: authErr } = await _sb.auth.signUp({
      email: email.trim(), password,
      options: {
        emailRedirectTo: callbackUrl,
        data: { _pending: 'invite', _invite_token: token, _name: name.trim() }
      }
    });
    if (authErr) return { error: authErr.message };

    // If session is immediate (email confirmation disabled), finish now
    if (authData.session) {
      return await _finishInviteSetup(authData.user, token, name.trim(), email.trim());
    }
    return { pending: true };
  }

  async function _finishInviteSetup(user, token, name, email) {
    const invite = await getInviteByToken(token);
    if (!invite) return { error: 'Invite not found.' };
    const { error: profErr } = await _sb.from('profiles').insert({
      id: user.id, email: (email || user.email).toLowerCase(),
      name, role: invite.track, track: invite.track,
      org_id: invite.org_id, is_owner: false
    });
    if (profErr) return { error: profErr.message };
    await _sb.from('invites').update({ used: true, used_by: user.id }).eq('token', token);
    _clearCache();
    return { track: invite.track };
  }

  // ── Complete pending setup after email confirmation ───────────────────────────
  async function completePendingSetup() {
    // Wait for supabase to process the confirmation hash in the URL
    let { data: { session } } = await _sb.auth.getSession();
    if (!session) {
      session = await new Promise(function(resolve) {
        var timer = setTimeout(function() { sub.unsubscribe(); resolve(null); }, 8000);
        var { data: { subscription: sub } } = _sb.auth.onAuthStateChange(function(event, sess) {
          if (event === 'SIGNED_IN' && sess) {
            clearTimeout(timer); sub.unsubscribe(); resolve(sess);
          }
        });
      });
    }
    if (!session) return null;
    const user = session.user;
    const meta = user.user_metadata || {};

    // Check if profile already exists
    const { data: existing } = await _sb.from('profiles').select('*').eq('id', user.id).single();
    if (existing) { _profileCache = existing; return existing; }

    if (meta._pending === 'org') {
      const result = await _finishOrgSetup(user, meta._org_name, meta._owner_name, user.email);
      if (result.error) return null;
      return await getCurrentUser();
    }
    if (meta._pending === 'invite') {
      const result = await _finishInviteSetup(user, meta._invite_token, meta._name, user.email);
      if (result.error) return null;
      return await getCurrentUser();
    }
    return null;
  }

  // ── Organisation queries ──────────────────────────────────────────────────────
  async function getOrgById(orgId) {
    const { data } = await _sb.from('organisations').select('*').eq('id', orgId).single();
    return data || null;
  }

  async function getOrgMembers(orgId) {
    const { data } = await _sb
      .from('profiles')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_owner', false)
      .order('created_at');
    return data || [];
  }

  // ── Progress ──────────────────────────────────────────────────────────────────
  async function saveModuleProgress(moduleId, score, maxScore) {
    const { data: { session } } = await _sb.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    // Upsert — only improve score
    const { data: existing } = await _sb
      .from('progress')
      .select('score')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .single();

    if (existing && score <= existing.score) return; // no improvement

    await _sb.from('progress').upsert({
      user_id: userId, module_id: moduleId,
      score, max_score: maxScore,
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,module_id' });

    // Touch last_active
    await _sb.from('profiles')
      .update({ last_active: new Date().toISOString() })
      .eq('id', userId);
  }

  async function getUserProgress(userId) {
    const { data } = await _sb.from('progress').select('*').eq('user_id', userId);
    return data || [];
  }

  async function getCompletedModules(userId) {
    const { data } = await _sb
      .from('progress')
      .select('module_id')
      .eq('user_id', userId);
    return (data || []).map(p => p.module_id);
  }

  async function getTrackCompletion(userId, trackKey) {
    const track = TRACKS[trackKey];
    if (!track) return { completed: 0, total: 0, pct: 0 };
    const done = await getCompletedModules(userId);
    const completed = track.modules.filter(m => done.includes(m)).length;
    const total = track.modules.length;
    return { completed, total, pct: total ? Math.round((completed / total) * 100) : 0 };
  }

  // ── Guards ────────────────────────────────────────────────────────────────────
  async function requireAuth(redirect) {
    const user = await getCurrentUser();
    if (!user) { window.location.href = redirect || 'login.html'; return false; }
    return user;
  }

  async function requireOwner() {
    const user = await getCurrentUser();
    if (!user || !user.is_owner) { window.location.href = 'index.html'; return false; }
    return user;
  }

  // ── Nav badge injection ───────────────────────────────────────────────────────
  async function injectUserNav() {
    const nav = document.querySelector('nav');
    if (!nav) return;
    const user = await getCurrentUser();
    const badge = document.createElement('div');
    badge.className = 'nav-user';
    if (!user) {
      badge.innerHTML = `<a href="login.html" class="nav-login-btn">Sign in →</a>`;
    } else {
      const track = user.track ? TRACKS[user.track] : null;
      const color = track ? track.color : '#6c47ff';
      const dashLink = user.is_owner
        ? `<a href="dashboard.html" class="nav-user-link">📊 Dashboard</a>` : '';
      badge.innerHTML = `
        ${dashLink}
        <span class="nav-user-name">${user.name}</span>
        ${track
          ? `<span class="nav-user-role" style="background:${color}22;color:${color};border:1px solid ${color}44">${track.icon} ${track.name}</span>`
          : '<span class="nav-user-role">Owner</span>'}
        <button class="nav-logout" onclick="FinOpsAuth.logout().then(()=>window.location.href='login.html')">Logout</button>`;
    }
    nav.appendChild(badge);
  }

  return {
    TRACKS,
    login, logout,
    createOrg, completePendingSetup,
    createInvite, getInviteByToken, acceptInvite,
    getCurrentUser, getOrgById, getOrgMembers,
    saveModuleProgress, getUserProgress, getCompletedModules, getTrackCompletion,
    requireAuth, requireOwner, injectUserNav
  };
})();
