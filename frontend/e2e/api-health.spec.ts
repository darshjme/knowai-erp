import { test, expect } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL || 'http://localhost:3000';
const TEST_USER = { email: 'darsh@knowai.biz', password: 'admin123' };

test.describe('API Health & Critical Endpoints', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
      data: TEST_USER,
    });
    expect(loginRes.ok()).toBeTruthy();
    // Extract token from set-cookie header
    const cookies = loginRes.headers()['set-cookie'] || '';
    const match = cookies.match(/token=([^;]+)/);
    token = match ? match[1] : '';
  });

  test('health endpoint returns 200', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status || body.success).toBeTruthy();
  });

  test('login returns user with expected fields', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/auth/login`, {
      data: TEST_USER,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const user = body.data?.user || body.data;
    expect(user).toBeTruthy();
    expect(user.email).toBe(TEST_USER.email);
    expect(user.role).toBe('CEO');
    expect(user.password).toBeUndefined();
  });

  test('protected endpoint without auth returns 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/tasks`);
    expect(res.status()).toBe(401);
  });

  test('dashboard endpoint returns data with auth', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/dashboard`, {
      headers: { Cookie: `token=${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('tasks endpoint returns data with auth', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/tasks`, {
      headers: { Cookie: `token=${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('expenses endpoint returns data with auth', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/expenses`, {
      headers: { Cookie: `token=${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('payroll endpoint returns data with auth', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/payroll`, {
      headers: { Cookie: `token=${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('invalid JSON body returns 400', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/expenses`, {
      headers: {
        Cookie: `token=${token}`,
        'Content-Type': 'application/json',
      },
      data: '{"invalid json',
    });
    expect(res.status()).toBe(400);
  });

  test('rate limiting returns 429 after burst', async ({ request }) => {
    // Send 105 rapid requests to exhaust the 100-token bucket
    const promises = [];
    for (let i = 0; i < 105; i++) {
      promises.push(
        request.get(`${API_BASE}/api/tasks`, {
          headers: { Cookie: `token=${token}` },
        })
      );
    }
    const results = await Promise.all(promises);
    const statuses = results.map((r) => r.status());
    // At least one should be 429
    expect(statuses).toContain(429);
  });

  test('admin onboarding status returns data', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/admin/onboarding-status`, {
      headers: { Cookie: `token=${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.summary).toBeTruthy();
    expect(typeof body.summary.total).toBe('number');
  });
});
