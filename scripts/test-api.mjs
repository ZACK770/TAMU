#!/usr/bin/env node

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080';

async function testEndpoint(name, method, path, body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${path}`, options);
    const data = await response.json();

    console.log(`✓ ${name}: ${response.status}`);
    console.log(`  Response:`, JSON.stringify(data, null, 2));
    return { success: response.ok, data };
  } catch (error) {
    console.log(`✗ ${name}: ERROR`);
    console.log(`  Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Running API Tests...\n');
  console.log(`API Base: ${API_BASE}\n`);

  const results = [];

  // Health check
  results.push(await testEndpoint('Health Check', 'GET', '/api/health'));

  // Auth: Send code
  results.push(await testEndpoint('Send Code', 'POST', '/api/auth/send-code', {
    phone: '0500000000',
  }));

  // Auth: Verify code (will fail without valid code)
  results.push(await testEndpoint('Verify Code', 'POST', '/api/auth/verify-code', {
    phone: '0500000000',
    code: '123456',
  }));

  // Auth: Register
  results.push(await testEndpoint('Register', 'POST', '/api/auth/register', {
    phone: '0500000001',
    fullName: 'Test User',
  }));

  // Exams: Verify token (will fail without auth)
  results.push(await testEndpoint('Verify Token', 'POST', '/api/exams/verify-token', {
    token: '123456',
  }));

  console.log('\n📊 Test Summary:');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`  Passed: ${passed}/${results.length}`);
  console.log(`  Failed: ${failed}/${results.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
