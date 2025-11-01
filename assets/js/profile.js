
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
  if (user.created_at) {
    const date = new Date(user.created_at);
    memberSince.textContent = `Member since: ${date.toLocaleDateString()}`;
  } else {
    memberSince.textContent = 'Member since: Unknown';
  }

  // Populate form
  document.getElementById('profile-name').value = user.name || '';
  document.getElementById('profile-email').value = user.email || '';
  document.getElementById('profile-avatar').src = user.avatar_url || user.picture || './assets/images/avatar-placeholder.svg';

  // Avatar upload (only for self)
  document.getElementById('change-avatar').onclick = () => {
    if (!isSelf) {return;}
    document.getElementById('avatar-upload').click();
  };
  document.getElementById('avatar-upload').onchange = async (e) => {
    if (!isSelf) {return;}
    const file = e.target.files[0];
    if (!file) {return;}
    // TODO: Implement avatar upload API
    alert('Avatar upload not implemented.');
  };

  // Cancel button - reset form
  document.getElementById('cancel-edit').onclick = () => {
    document.getElementById('profile-name').value = user.name || '';
    document.getElementById('profile-password').value = '';
  };

  // Save profile changes (only for self)
  document.getElementById('profile-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!isSelf) {return;}
    const name = document.getElementById('profile-name').value.trim();
    const password = document.getElementById('profile-password').value;
    try {
      const body = { name };
      if (password) {body.password = password;}
      const res = await (window.authFetch ? window.authFetch(`${FN_BASE}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      }) : fetch(`${FN_BASE}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      }));
      if (!res.ok) {throw new Error('Failed to update profile');}

      // Update display name
      user.name = name;
      document.getElementById('profile-display-name').textContent = name || 'No name set';

      // Update localStorage user
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.name = name;
      localStorage.setItem('user', JSON.stringify(storedUser));

      // Show success message
      if (window.showNotification) {
        window.showNotification('Profile updated successfully!', 'success');
      } else {
        alert('Profile updated!');
      }

      // Clear password field
      document.getElementById('profile-password').value = '';
    } catch (err) {
      if (window.showNotification) {
        window.showNotification('Error updating profile: ' + err.message, 'error');
      } else {
        alert('Error: ' + err.message);
      }
    }
  };

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
          const actionClass = getActionClass(log.action);

          return `
            <div class="flex items-start gap-3 p-3 rounded hover:bg-gray-800 transition">
              <div class="w-2 h-2 mt-2 rounded-full ${actionClass}"></div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <span class="font-semibold">${escapeHtml(log.action || 'Unknown action')}</span>
                  <span class="text-xs text-gray-400">${timeAgo}</span>
                </div>
                ${log.details ? `<p class="text-sm text-gray-400 mt-1">${escapeHtml(log.details)}</p>` : ''}
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

  // Helper function to get action color class
  function getActionClass(action) {
    if (!action) {return 'bg-gray-500';}
    const actionLower = action.toLowerCase();
    if (actionLower.includes('login') || actionLower.includes('success')) {return 'bg-green-500';}
    if (actionLower.includes('error') || actionLower.includes('fail')) {return 'bg-red-500';}
    if (actionLower.includes('create') || actionLower.includes('add')) {return 'bg-blue-500';}
    if (actionLower.includes('update') || actionLower.includes('edit')) {return 'bg-yellow-500';}
    if (actionLower.includes('delete') || actionLower.includes('remove')) {return 'bg-red-500';}
    return 'bg-gray-500';
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
});
