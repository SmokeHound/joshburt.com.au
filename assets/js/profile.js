 
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
    if (!res.ok) throw new Error('Failed to load current user');
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
      if (!res.ok) throw new Error('Failed to load user profile');
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

  // Populate form
  document.getElementById('profile-name').value = user.name || '';
  document.getElementById('profile-email').value = user.email || '';
  document.getElementById('profile-avatar').src = user.avatar_url || 'https://via.placeholder.com/80';

  // Avatar upload (only for self)
  document.getElementById('change-avatar').onclick = () => {
    if (!isSelf) return;
    document.getElementById('avatar-upload').click();
  };
  document.getElementById('avatar-upload').onchange = async (e) => {
    if (!isSelf) return;
    const file = e.target.files[0];
    if (!file) return;
    // TODO: Implement avatar upload API
    alert('Avatar upload not implemented.');
  };

  // Save profile changes (only for self)
  document.getElementById('profile-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!isSelf) return;
    const name = document.getElementById('profile-name').value.trim();
    const password = document.getElementById('profile-password').value;
    try {
      const body = { name };
      if (password) body.password = password;
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
      if (!res.ok) throw new Error('Failed to update profile');
      alert('Profile updated!');
    } catch (err) {
      alert('Error: ' + err.message);
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
      logList.innerHTML = logs.length ? logs.map(log => `<li>${log.created_at || log.timestamp}: ${log.action} - ${log.details || ''}</li>`).join('') : '<li>No activity found.</li>';
    }
  } catch (e) {
    // Ignore if not available
  }
});
