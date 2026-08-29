/**
 * Smoke test: verify the endpoints the new Home page depends on.
 * Run: node scripts/smoke-test-home.js
 */
const API = 'http://localhost:5000/v1';

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`login ${email}: ${res.status} ${JSON.stringify(body)}`);
  return body.accessToken;
}

async function api(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function ok(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok — ${msg}`);
}

(async () => {
  const t = await login('ananya.krishnan@iitm.ac.in', 'Faculty@2026');
  console.log('logged in as ananya.krishnan');

  const me = await api('/faculty/me', t);
  ok(me.status === 200, 'GET /faculty/me works');
  ok(me.body.faculty?.name, `name populated: ${me.body.faculty.name}`);
  ok(me.body.faculty?.role, `role populated: ${me.body.faculty.role}`);

  const bookmarks = await api('/opportunities/mine/bookmarks', t);
  ok(bookmarks.status === 200, `GET /opportunities/mine/bookmarks: ${bookmarks.status}`);

  const apps = await api('/jobs/mine/applications', t);
  ok(apps.status === 200, `GET /jobs/mine/applications: ${apps.status}`);

  const sum = await api('/directory/connect-requests-summary', t);
  ok(sum.status === 200, `GET /directory/connect-requests-summary: ${sum.status}`);
  ok(typeof sum.body.pendingReceived === 'number', 'pendingReceived is a number');

  const inbox = await api('/directory/connect-requests?direction=received&status=pending', t);
  ok(inbox.status === 200, `GET /directory/connect-requests: ${inbox.status}`);
  ok(Array.isArray(inbox.body.requests), 'requests[] returned');

  console.log('\nALL HOME-PAGE ENDPOINTS OK');
  process.exit(0);
})().catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
