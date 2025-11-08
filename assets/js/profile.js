
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

  // Avatar upload (only for self)
  document.getElementById('change-avatar').onclick = () => {
    if (!isSelf) {return;}
    document.getElementById('avatar-upload').click();
  };
  document.getElementById('avatar-upload').onchange = async (e) => {
    if (!isSelf) {return;}
    const file = e.target.files[0];
    if (!file) {return;}
    // Client-side validation: size and MIME
    try {
      const MAX_BYTES = 1 * 1024 * 1024; // 1 MiB
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (file.size > MAX_BYTES) {
        if (window.showNotification) { window.showNotification('Avatar is too large (max 1MB)', 'error'); } else { alert('Avatar is too large (max 1MB)'); }
        return;
      }
      if (file.type) {
        if (!allowed.includes(file.type.toLowerCase())) {
          if (window.showNotification) { window.showNotification('Unsupported image type', 'error'); } else { alert('Unsupported image type'); }
          return;
        }
      } else {
        // Fallback: check extension
        const name = file.name || '';
        const extMatch = name.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : '';
        const allowedExts = ['jpg','jpeg','png','gif','webp','svg'];
        if (!allowedExts.includes(ext)) {
          if (window.showNotification) { window.showNotification('Unsupported image file extension', 'error'); } else { alert('Unsupported image file extension'); }
          return;
        }
      }
    } catch (validationErr) {
      console.warn('Avatar validation failed', validationErr);
      if (window.showNotification) { window.showNotification('Avatar validation error', 'error'); } else { alert('Avatar validation error'); }
      return;
    }
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = () => rej(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const payload = { avatarBase64: dataUrl, filename: file.name };
      const res = await (window.authFetch ? window.authFetch(`${FN_BASE}/users/${user.id}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      }) : fetch(`${FN_BASE}/users/${user.id}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      }));

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const json = await res.json();
      const newUrl = json.user && json.user.avatar_url;
      if (newUrl) {
        document.getElementById('profile-avatar').src = newUrl + '?t=' + Date.now();
        // Update stored user
        try {
          const stored = JSON.parse(localStorage.getItem('user') || '{}');
          stored.avatarUrl = newUrl;
          localStorage.setItem('user', JSON.stringify(stored));
        } catch (e) { console.warn('Failed to update local user avatar', e); }
        if (window.showNotification) { window.showNotification('Avatar uploaded', 'success'); }
      }
    } catch (err) {
      console.error('Avatar upload error', err);
      if (window.showNotification) { window.showNotification('Avatar upload failed: ' + err.message, 'error'); } else { alert('Avatar upload failed: ' + err.message); }
    }
  };

  // Cancel button - reset form
  document.getElementById('cancel-edit').onclick = () => {
    document.getElementById('profile-name').value = user.name || '';
    document.getElementById('profile-password').value = '';
  };

  // Save profile changes (only for self)
  // Avatar selection (pick from predetermined avatars)
  const PRESET_AVATARS = [
    'https://avatars.dicebear.com/api/identicon/seed-1.svg',
    'https://avatars.dicebear.com/api/identicon/seed-2.svg',
    'https://avatars.dicebear.com/api/identicon/seed-3.svg',
    'https://avatars.dicebear.com/api/identicon/seed-4.svg',
    'https://avatars.dicebear.com/api/identicon/seed-5.svg',
    'https://avatars.dicebear.com/api/identicon/seed-6.svg'
  ];

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
    PRESET_AVATARS.forEach(url => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rounded overflow-hidden border-2 border-transparent hover:border-blue-500';
      btn.innerHTML = `<img src="${url}" alt="avatar" class="w-full h-24 object-cover">`;
      btn.onclick = async () => {
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
          // Close modal
          document.body.removeChild(overlay);
        } catch (err) {
          console.error('Avatar selection error', err);
          if (window.showNotification) { window.showNotification('Avatar selection failed: ' + err.message, 'error'); } else { alert('Avatar selection failed: ' + err.message); }
        }
      };
      grid.appendChild(btn);
    });

    modal.querySelector('#avatar-picker-close').onclick = () => { document.body.removeChild(overlay); };
    overlay.onclick = (e) => { if (e.target === overlay) { document.body.removeChild(overlay); } };
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
