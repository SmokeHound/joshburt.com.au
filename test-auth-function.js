require('dotenv').config();
const { handler } = require('./.netlify/functions/auth');

async function testAuth() {
  console.log('🔧 Using DB_TYPE:', process.env.DB_TYPE);

  console.log('🧪 Testing Registration...');
  const registerEvent = {
    httpMethod: 'POST',
    path: '/.netlify/functions/auth',
    queryStringParameters: { action: 'register' },
    body: JSON.stringify({
      email: 'newuser@test.com',
      password: 'password123',
      name: 'New User'
    }),
    headers: {}
  };

  try {
    const registerResult = await handler(registerEvent);
    console.log('📝 Register Response:', registerResult.statusCode, JSON.parse(registerResult.body));

    if (registerResult.statusCode === 201 || registerResult.statusCode === 409) {
      console.log('✅ Registration test PASSED');
    } else {
      console.error('❌ Registration test FAILED');
      return;
    }
  } catch (error) {
    console.error('❌ Registration test ERROR:', error.message);
    return;
  }

  console.log('\n🧪 Testing Login...');
  const loginEvent = {
    httpMethod: 'POST',
    path: '/.netlify/functions/auth',
    queryStringParameters: { action: 'login' },
    body: JSON.stringify({
      email: 'admin@joshburt.com.au',
      password: 'admin123!'
    }),
    headers: {
      'x-forwarded-for': '127.0.0.1'
    }
  };

  try {
    const loginResult = await handler(loginEvent);
    console.log('📝 Login Response:', loginResult.statusCode, JSON.parse(loginResult.body));

    if (loginResult.statusCode === 200) {
      console.log('✅ Login test PASSED');
      const loginData = JSON.parse(loginResult.body);
      console.log('🔑 Access token received:', loginData.accessToken ? 'YES' : 'NO');
      console.log('🔄 Refresh token received:', loginData.refreshToken ? 'YES' : 'NO');
      console.log('👤 User data:', loginData.user);
    } else {
      console.error('❌ Login test FAILED');
    }
  } catch (error) {
    console.error('❌ Login test ERROR:', error.message);
  }
}

testAuth();
