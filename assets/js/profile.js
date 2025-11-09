
// profile.js: User profile view/edit and activity log

document.addEventListener('DOMContentLoaded', async () => {
  const FN_BASE = window.FN_BASE || '/.netlify/functions';
  // Use centralized token accessor
  const token = (window.getToken && window.getToken()) || null;
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Parse user_id from URL
  function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }
  const profileUserId = getQueryParam('user_id');

  // Fetch current user info (to check admin)
  let currentUser = null;
  try {
    // Serverless auth "me" action
    const res = await (window.authFetch ? window.authFetch(`${FN_BASE}/auth?action=me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }) : fetch(`${FN_BASE}/auth?action=me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }));
    if (!res.ok) {throw new Error('Failed to load current user');}
    currentUser = (await res.json()).user;
  } catch (e) {
    alert('Error loading current user: ' + e.message);
    return;
  }

  // Determine which user to load
  let user = null;
  let isSelf = false;
  if (profileUserId && currentUser.role === 'admin') {
    // Admin viewing another user
    try {
      const res = await (window.authFetch ? window.authFetch(`${FN_BASE}/users/${profileUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }) : fetch(`${FN_BASE}/users/${profileUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }));
      if (!res.ok) {throw new Error('Failed to load user profile');}
      user = (await res.json()).user;
    } catch (e) {
      alert('Error loading user profile: ' + e.message);
      return;
    }
  } else {
    // Self
    user = currentUser;
    isSelf = true;
  }

  // Populate profile overview
  document.getElementById('profile-display-name').textContent = user.name || 'No name set';
  document.getElementById('profile-display-email').textContent = user.email || 'No email';

  // Set role badge with appropriate styling
  const roleBadge = document.getElementById('profile-role-badge');
  const role = (user.role || 'user').toLowerCase();
  roleBadge.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  if (role === 'admin') {
    roleBadge.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-purple-600 text-white';
  } else if (role === 'moderator') {
    roleBadge.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-blue-600 text-white';
  } else {
    roleBadge.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-gray-600 text-white';
  }

  // Set status badge
  const statusBadge = document.getElementById('profile-status-badge');
  if (user.is_active === false || user.is_active === 0) {
    statusBadge.textContent = 'Inactive';
    statusBadge.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-red-600 text-white';
  } else {
    statusBadge.textContent = 'Active';
    statusBadge.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-green-600 text-white';
  }

  // Set member since date
  const memberSince = document.getElementById('profile-member-since');
  const createdAt = user.createdAt || user.created_at; // Support both camelCase and snake_case
  if (createdAt) {
    try {
      const date = new Date(createdAt);
      // Check if date is valid
      if (!isNaN(date.getTime())) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        memberSince.textContent = `Member since: ${date.toLocaleDateString('en-US', options)}`;
      } else {
        memberSince.textContent = 'Member since: Unknown';
      }
    } catch (err) {
      console.error('Error parsing created_at date:', err);
      memberSince.textContent = 'Member since: Unknown';
    }
  } else {
    memberSince.textContent = 'Member since: Unknown';
  }

  // Populate form
  document.getElementById('profile-name').value = user.name || '';
  document.getElementById('profile-email').value = user.email || '';
  document.getElementById('profile-avatar').src = user.avatarUrl || user.avatar_url || user.picture || './assets/images/avatar-placeholder.svg';

  // Removed legacy upload flow; avatar changes are done via the preset picker below.

  // Cancel button - reset form
  document.getElementById('cancel-edit').onclick = () => {
    document.getElementById('profile-name').value = user.name || '';
    document.getElementById('profile-password').value = '';
  };

  // Save profile changes (only for self)
  // Avatar selection (pick from predetermined avatars)
  const PRESET_AVATARS = [
    '/assets/images/avatars/avatar-1.svg',
    '/assets/images/avatars/avatar-2.svg',
    '/assets/images/avatars/avatar-3.svg',
    '/assets/images/avatars/avatar-4.svg',
    '/assets/images/avatars/avatar-5.svg',
    '/assets/images/avatars/avatar-6.svg',
    '/assets/images/avatars/avatar-7.svg',
    '/assets/images/avatars/avatar-8.svg',
    '/assets/images/avatars/avatar-9.svg',
    '/assets/images/avatars/avatar-10.svg',
    '/assets/images/avatars/avatar-11.svg',
    '/assets/images/avatars/avatar-12.svg'
  ];

  // Build initials from user name (first letters of up to 3 words)
  function deriveInitials(name) {
    if (!name) { return 'U'; }
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 3);
    const initials = parts.map((p) => p[0].toUpperCase().replace(/[^A-Z]/g, '')).join('');
    return initials || 'U';
  }

  function openInitialsAvatarPicker() {
    const overlay = document.createElement('div');
    overlay.id = 'avatar-picker-overlay';
    overlay.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50';
    const modal = document.createElement('div');
    modal.className = 'bg-gray-900 p-6 rounded-lg max-w-md w-full space-y-4';
    const initials = deriveInitials(user.name || user.email || 'User');
    modal.innerHTML = `
      <h3 class="text-lg font-semibold">Generate Initials Avatar</h3>
      <div class="flex flex-col gap-4">
        <div class="flex gap-2 items-center">
          <label class="text-sm font-medium w-24">Initials</label>
          <input id="init-initials" type="text" maxlength="3" value="${initials}" class="flex-1 p-2 rounded bg-gray-800 border border-gray-700 text-white" />
        </div>
        <div class="flex gap-2 items-center">
          <label class="text-sm font-medium w-24">Theme</label>
          <select id="init-theme" class="flex-1 p-2 rounded bg-gray-800 border border-gray-700 text-white">
            <option value="dark" selected>Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        <div class="flex gap-2 items-center">
          <label class="text-sm font-medium w-24">Style</label>
          <select id="init-style" class="flex-1 p-2 rounded bg-gray-800 border border-gray-700 text-white">
            <option value="solid" selected>Solid</option>
            <option value="outline">Outline</option>
          </select>
        </div>
        <div id="init-preview" class="flex items-center justify-center h-40 border border-dashed border-gray-700 rounded"></div>
      </div>
      <div class="flex justify-between pt-2">
        <button id="init-cancel" class="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600">Cancel</button>
        <button id="init-save" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 font-semibold">Save Avatar</button>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function safeClose() { const ex = document.getElementById('avatar-picker-overlay'); if (ex && ex.parentNode) { ex.parentNode.removeChild(ex); } }
    overlay.onclick = (e) => { if (e.target === overlay) { safeClose(); } };
    modal.querySelector('#init-cancel').onclick = () => safeClose();

    const initialsInput = modal.querySelector('#init-initials');
    const themeSelect = modal.querySelector('#init-theme');
    const styleSelect = modal.querySelector('#init-style');
    const preview = modal.querySelector('#init-preview');

    function updatePreview() {
      const i = initialsInput.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'U';
      const t = themeSelect.value;
      const s = styleSelect.value;
      const url = `/.netlify/functions/avatar-initials?i=${encodeURIComponent(i)}&t=${t}&s=${s}`;
      preview.innerHTML = `<img src="${url}" alt="Initials Avatar" class="h-36 w-36 rounded-full" />`;
    }
    initialsInput.oninput = updatePreview;
    themeSelect.onchange = updatePreview;
    styleSelect.onchange = updatePreview;
    updatePreview();

    modal.querySelector('#init-save').onclick = async () => {
      const i = initialsInput.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'U';
      const t = themeSelect.value;
      const s = styleSelect.value;
      try {
        const res = await (window.authFetch ? window.authFetch(`${FN_BASE}/users/${user.id}/avatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ avatarType: 'initials', initials: i, theme: t, style: s })
        }) : fetch(`${FN_BASE}/users/${user.id}/avatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ avatarType: 'initials', initials: i, theme: t, style: s })
        }));
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Save failed'); }
        const json = await res.json();
        const newUrl = json.user && json.user.avatar_url;
        if (newUrl) {
          document.getElementById('profile-avatar').src = newUrl + '&cb=' + Date.now();
          try { const stored = JSON.parse(localStorage.getItem('user') || '{}'); stored.avatarUrl = newUrl; localStorage.setItem('user', JSON.stringify(stored)); } catch (e) { console.warn('Failed to persist avatar locally', e); }
          if (window.showNotification) { window.showNotification('Avatar updated', 'success'); }
        }
        safeClose();
      } catch (err) {
        console.error(err);
        if (window.showNotification) { window.showNotification('Avatar save failed: ' + err.message, 'error'); } else { alert('Avatar save failed: ' + err.message); }
      }
    };
  }

  // Augment existing picker button: offer choice between presets and initials
  const changeBtn = document.getElementById('change-avatar');
  if (changeBtn) {
    changeBtn.onclick = () => {
      if (!isSelf) { return; }
      // Simple chooser overlay with two options
      const overlay = document.createElement('div');
      overlay.id = 'avatar-picker-overlay';
      overlay.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
      const modal = document.createElement('div');
      modal.className = 'bg-gray-900 p-6 rounded-lg w-full max-w-sm space-y-4';
      modal.innerHTML = `
        <h3 class="text-lg font-semibold">Change Avatar</h3>
        <div class="grid gap-3">
          <button id="choose-preset" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 font-medium">Choose Preset</button>
          <button id="choose-initials" class="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 font-medium">Generate Initials</button>
          <button id="cancel-avatar" class="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600">Cancel</button>
        </div>
      `;
      overlay.appendChild(modal); document.body.appendChild(overlay);
      function safeClose() { const ex = document.getElementById('avatar-picker-overlay'); if (ex && ex.parentNode) { ex.parentNode.removeChild(ex); } }
      overlay.onclick = (e) => { if (e.target === overlay) { safeClose(); } };
      modal.querySelector('#cancel-avatar').onclick = () => safeClose();
      modal.querySelector('#choose-preset').onclick = () => { safeClose(); openAvatarPicker(); };
      modal.querySelector('#choose-initials').onclick = () => { safeClose(); openInitialsAvatarPicker(); };
    };
  }

  function openAvatarPicker() {
    // Build modal
    const overlay = document.createElement('div');
    overlay.id = 'avatar-picker-overlay';
    overlay.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50';

    const modal = document.createElement('div');
    modal.className = 'bg-gray-900 p-6 rounded-lg max-w-xl w-full';
    modal.innerHTML = `
      <h3 class="text-xl font-semibold mb-4">Choose an avatar</h3>
      <div id="avatar-options" class="grid grid-cols-3 gap-4"></div>
      <div class="mt-4 text-right"><button id="avatar-picker-close" class="px-4 py-2 rounded bg-gray-700">Cancel</button></div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const grid = modal.querySelector('#avatar-options');
    // Determine currently-selected avatar (normalize to pathname)
    const currentAvatarSrc = (user.avatarUrl || user.avatar_url || document.getElementById('profile-avatar').src || '').toString();
    let currentAvatarPath = '';
    try { currentAvatarPath = new URL(currentAvatarSrc, window.location.href).pathname; } catch (e) { currentAvatarPath = currentAvatarSrc.split('?')[0]; }

    PRESET_AVATARS.forEach(url => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rounded overflow-hidden border-2 border-transparent hover:border-blue-500';
      btn.innerHTML = `<img src="${url}" alt="avatar" class="w-full h-24 object-cover">`;
      // Highlight if this preset matches the current avatar
      let btnPath = '';
      try { btnPath = new URL(url, window.location.href).pathname; } catch (e) { btnPath = url.split('?')[0]; }
      if (btnPath === currentAvatarPath) {
        // selected visual styles (Tailwind utility classes)
        btn.className += ' ring-4 ring-blue-500 border-blue-500 scale-105';
        btn.setAttribute('aria-current', 'true');
      } else {
        btn.setAttribute('aria-current', 'false');
      }

      btn.onclick = async () => {
        // Prevent double clicks while a request is in-flight
        if (btn.disabled) { return; }

        // Remember previous selection so we can revert on failure
        const prevSelected = grid.querySelector('[aria-current="true"]');

        // Optimistically highlight this button
        if (prevSelected) {
          prevSelected.classList.remove('ring-4', 'ring-blue-500', 'border-blue-500', 'scale-105');
          prevSelected.setAttribute('aria-current', 'false');
        }
        btn.classList.add('ring-4', 'ring-blue-500', 'border-blue-500', 'scale-105');
        btn.setAttribute('aria-current', 'true');

        // Disable all buttons to avoid rapid repeat actions
        const allBtns = Array.from(grid.querySelectorAll('button'));
        allBtns.forEach(b => { b.disabled = true; });

        try {
          const res = await (window.authFetch ? window.authFetch(`${FN_BASE}/users/${user.id}/avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ avatarUrl: url })
          }) : fetch(`${FN_BASE}/users/${user.id}/avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ avatarUrl: url })
          }));

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Selection failed');
          }
          const json = await res.json();
          const newUrl = json.user && json.user.avatar_url;
          if (newUrl) {
            document.getElementById('profile-avatar').src = newUrl + '?t=' + Date.now();
            try {
              const stored = JSON.parse(localStorage.getItem('user') || '{}');
              stored.avatarUrl = newUrl;
              localStorage.setItem('user', JSON.stringify(stored));
            } catch (e) { console.warn('Failed to update local user avatar', e); }
            if (window.showNotification) { window.showNotification('Avatar updated', 'success'); }
          }
          // Close modal (idempotent)
          safeClose();
        } catch (err) {
          // Revert optimistic highlight on failure
          try {
            btn.classList.remove('ring-4', 'ring-blue-500', 'border-blue-500', 'scale-105');
            btn.setAttribute('aria-current', 'false');
            if (prevSelected) {
              prevSelected.classList.add('ring-4', 'ring-blue-500', 'border-blue-500', 'scale-105');
              prevSelected.setAttribute('aria-current', 'true');
            }
          } catch (revertErr) {
            console.warn('Failed to revert selection highlight', revertErr);
          }
          // Re-enable buttons so user can try again
          allBtns.forEach(b => { b.disabled = false; });
          console.error('Avatar selection error', err);
          if (window.showNotification) { window.showNotification('Avatar selection failed: ' + err.message, 'error'); } else { alert('Avatar selection failed: ' + err.message); }
        }
      };
      grid.appendChild(btn);
    });
    // Safe close helper prevents DOMException if already removed
    function safeClose() {
      const existing = document.getElementById('avatar-picker-overlay');
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
    }
    modal.querySelector('#avatar-picker-close').onclick = () => { safeClose(); };
    overlay.onclick = (e) => { if (e.target === overlay) { safeClose(); } };
  }

  document.getElementById('change-avatar').onclick = () => { if (!isSelf) { return; } openAvatarPicker(); };


  // Fetch activity log (admin or self)
  try {
    const res = await (window.authFetch ? window.authFetch(`${FN_BASE}/audit-logs?userId=${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }) : fetch(`${FN_BASE}/audit-logs?userId=${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }));
    if (res.ok) {
      const logs = await res.json();
      const logList = document.getElementById('activity-log');
      const activityCount = document.getElementById('activity-count');
      const statsActivities = document.getElementById('stats-activities');

      activityCount.textContent = `${logs.length} ${logs.length === 1 ? 'activity' : 'activities'}`;
      statsActivities.textContent = logs.length;

      if (logs.length > 0) {
        // Calculate statistics
        let orderCount = 0;
        let loginCount = 0;

        logs.forEach(log => {
          if (log.action && log.action.toLowerCase().includes('order')) {orderCount++;}
          if (log.action && log.action.toLowerCase().includes('login')) {loginCount++;}
        });

        document.getElementById('stats-orders').textContent = orderCount;
        document.getElementById('stats-logins').textContent = loginCount;

        logList.innerHTML = logs.map(log => {
          const date = new Date(log.created_at || log.timestamp);
          const timeAgo = getTimeAgo(date);
          const actionInfo = getActionInfo(log.action);

          return `
            <div class="group flex items-start gap-4 p-4 rounded-lg bg-gradient-to-r from-gray-800/40 to-gray-900/40 border-2 border-gray-700/50 hover:border-${actionInfo.color}-500/50 hover:shadow-lg hover:shadow-${actionInfo.color}-500/10 transition-all duration-200">
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${actionInfo.bgGradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                ${actionInfo.icon}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <span class="font-bold text-white text-sm sm:text-base">${escapeHtml(formatAction(log.action))}</span>
                  <span class="flex-shrink-0 text-xs font-medium text-gray-400 bg-gray-800/50 px-2 py-1 rounded">${timeAgo}</span>
                </div>
                ${log.details ? `<p class="text-sm text-gray-400 mt-2 leading-relaxed">${escapeHtml(log.details)}</p>` : ''}
                <div class="text-xs text-gray-500 mt-2">${date.toLocaleString()}</div>
              </div>
            </div>
          `;
        }).join('');
      } else {
        logList.innerHTML = '<div class="text-center text-gray-400 py-8">No activity found.</div>';
      }
    }
  } catch (e) {
    // If audit logs fail, show message
    document.getElementById('activity-log').innerHTML = '<div class="text-center text-gray-400 py-8">Activity log unavailable.</div>';
  }

  // Helper function to get action styling and icon
  function getActionInfo(action) {
    if (!action) {
      return {
        color: 'gray',
        bgGradient: 'from-gray-500 to-gray-600',
        icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
      };
    }
    const actionLower = action.toLowerCase();

    // Login/Authentication actions
    if (actionLower.includes('login') || actionLower.includes('sign in')) {
      return {
        color: 'green',
        bgGradient: 'from-green-500 to-green-600',
        icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>'
      };
    }

    // Logout actions
    if (actionLower.includes('logout') || actionLower.includes('sign out')) {
      return {
        color: 'orange',
        bgGradient: 'from-orange-500 to-orange-600',
        icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>'
      };
    }

    // Error/Failure actions
    if (actionLower.includes('error') || actionLower.includes('fail')) {
      return {
        color: 'red',
        bgGradient: 'from-red-500 to-red-600',
        icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
      };
    }

    // Create/Add actions
    if (actionLower.includes('create') || actionLower.includes('add') || actionLower.includes('new')) {
      return {
        color: 'blue',
        bgGradient: 'from-blue-500 to-blue-600',
        icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>'
      };
    }

    // Update/Edit actions
    if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('modify')) {
      return {
        color: 'yellow',
        bgGradient: 'from-yellow-500 to-yellow-600',
        icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>'
      };
    }

    // Delete/Remove actions
    if (actionLower.includes('delete') || actionLower.includes('remove')) {
      return {
        color: 'red',
        bgGradient: 'from-red-500 to-red-600',
        icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>'
      };
    }

    // Order actions
    if (actionLower.includes('order')) {
      return {
        color: 'purple',
        bgGradient: 'from-purple-500 to-purple-600',
        icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>'
      };
    }

    // Success actions
    if (actionLower.includes('success') || actionLower.includes('approved')) {
      return {
        color: 'green',
        bgGradient: 'from-green-500 to-green-600',
        icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
      };
    }

    // Default
    return {
      color: 'gray',
      bgGradient: 'from-gray-500 to-gray-600',
      icon: '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
  }

  // Helper function to get time ago string
  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) {return `${seconds}s ago`;}
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {return `${minutes}m ago`;}
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {return `${hours}h ago`;}
    const days = Math.floor(hours / 24);
    if (days < 30) {return `${days}d ago`;}
    const months = Math.floor(days / 30);
    if (months < 12) {return `${months}mo ago`;}
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  }

  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Helper function to format action strings for better readability
  function formatAction(action) {
    if (!action) { return 'Unknown action'; }

    // Replace dots with spaces
    let formatted = action.replace(/\./g, ' ');

    // Replace underscores with spaces
    formatted = formatted.replace(/_/g, ' ');

    // Capitalize each word
    formatted = formatted.split(' ')
      .filter(word => word.length > 0) // Filter out empty strings
      .map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join(' ');

    return formatted;
  }
});
