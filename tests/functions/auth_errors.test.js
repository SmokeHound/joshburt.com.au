/**
 * Auth negative path tests (invalid credentials & invalid token)
 */
const BASE = process.env.BASE_URL || 'http://localhost:8888';

async function postAuth(action, body) {
  const res = await fetch(`${BASE}/.netlify/functions/auth?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, action })
  });
  const json = await res.json().catch(()=>({}));
  return { status: res.status, json };
}

(async () => {
  console.log('🔍 Starting auth error tests...');
  try {
    // Wrong password
    const wrong = await postAuth('login', { email: 'admin@joshburt.com.au', password: 'WRONG-PASS' });
    if (wrong.status === 200 || !wrong.json.error) {
      console.error('❌ Expected login failure not observed', wrong); process.exitCode = 1; return;
    }
    console.log('✅ Invalid password rejected');

    // Missing token for me
    const meNoToken = await fetch(`${BASE}/.netlify/functions/auth?action=me`);
    if (meNoToken.status === 200) { console.error('❌ Expected unauthorized for me without token'); process.exitCode = 1; return; }
    console.log('✅ Unauthorized me without token');

    // Fake token
    const meFake = await fetch(`${BASE}/.netlify/functions/auth?action=me`, { headers: { Authorization: 'Bearer faketoken' }});
    if (meFake.status === 200) { console.error('❌ Expected failure for fake token'); process.exitCode = 1; return; }
    console.log('✅ Fake token rejected');

    console.log('🎉 Auth error tests PASSED');
  } catch (e) {
    console.error('❌ Auth error tests exception', e); process.exitCode = 1;
  }
})();
