/**
 * Smoke test: POST /opportunities + GET /opportunities/mine/postings + role guards.
 * Run: node scripts/smoke-test-opportunity.js
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import mongoose from 'mongoose';
import { Opportunity } from '../models/Opportunity.js';

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

async function api(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

function ok(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok — ${msg}`);
}

const createdIds = [];

(async () => {
  await connectDB();

  const collegeAdmin = await login('admin@iitm.ac.in', 'CollegeAdmin@2026');
  const faculty = await login('ananya.krishnan@iitm.ac.in', 'Faculty@2026');
  console.log('logged in: collegeAdmin, faculty');

  const validPayload = {
    type: 'fdp',
    title: 'Smoke Test FDP: Applied Cryptography for Faculty',
    description:
      'One-week smoke test FDP to validate the Post Opportunity endpoint. Covers symmetric primitives, asymmetric key exchange, and post-quantum candidates.',
    domainTags: ['Cryptography', 'Security'],
    mode: 'online',
    location: '',
    cost: 0,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    url: 'https://example.iitm.ac.in/fdp/crypto',
  };

  // 1. College Admin can create
  console.log('\n[1] college admin publishes an opportunity');
  const create = await api('POST', '/opportunities', collegeAdmin, validPayload);
  ok(create.status === 201, `create ok (got ${create.status})`);
  ok(create.body.opportunity?.title === validPayload.title, 'title round-tripped');
  ok(create.body.opportunity?.organizerName, `organizerName populated: ${create.body.opportunity.organizerName}`);
  ok(create.body.status === 'live', `status live (institution is verified) — got ${create.body.status}`);
  createdIds.push(create.body.opportunity.id);

  // 2. Faculty cannot create (403)
  console.log('\n[2] faculty is forbidden from posting');
  const forbid = await api('POST', '/opportunities', faculty, validPayload);
  ok(forbid.status === 403, `faculty POST rejected (got ${forbid.status})`);

  // 3. Missing token → 401
  console.log('\n[3] unauthenticated POST rejected');
  const anon = await api('POST', '/opportunities', null, validPayload);
  ok(anon.status === 401, `no-token POST rejected (got ${anon.status})`);

  // 4. Zod validation: title too short
  console.log('\n[4] short title rejected');
  const shortT = await api('POST', '/opportunities', collegeAdmin, { ...validPayload, title: 'nope' });
  ok(shortT.status === 400, `short title rejected (got ${shortT.status})`);

  // 5. Zod: deadline in the past
  console.log('\n[5] past deadline rejected');
  const pastD = await api('POST', '/opportunities', collegeAdmin, {
    ...validPayload,
    deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  });
  ok(pastD.status === 400, `past deadline rejected (got ${pastD.status})`);

  // 6. Zod: journal requires ISSN-shape when provided
  console.log('\n[6] malformed ISSN rejected');
  const badIssn = await api('POST', '/opportunities', collegeAdmin, {
    ...validPayload,
    type: 'journal',
    issn: 'not-an-issn',
  });
  ok(badIssn.status === 400, `bad ISSN rejected (got ${badIssn.status})`);

  // 7. Valid journal with proper ISSN
  console.log('\n[7] valid journal with proper ISSN');
  const journal = await api('POST', '/opportunities', collegeAdmin, {
    ...validPayload,
    type: 'journal',
    title: 'Journal of Smoke Tests, Volume 42',
    issn: '1234-567X',
  });
  ok(journal.status === 201, `journal created (got ${journal.status})`);
  createdIds.push(journal.body.opportunity.id);

  // 8. List my postings
  console.log('\n[8] college admin lists own postings');
  const mine = await api('GET', '/opportunities/mine/postings', collegeAdmin);
  ok(mine.status === 200, `mine ok (got ${mine.status})`);
  ok(mine.body.opportunities.length >= 2, `at least 2 postings visible (got ${mine.body.opportunities.length})`);

  // 9. Faculty cannot list institution postings (403)
  console.log('\n[9] faculty forbidden from mine/postings');
  const forbMine = await api('GET', '/opportunities/mine/postings', faculty);
  ok(forbMine.status === 403, `faculty GET mine rejected (got ${forbMine.status})`);

  // 10. Live posting appears in public discovery
  console.log('\n[10] created opportunity shows up in public discover');
  const disc = await api('GET', `/opportunities?q=${encodeURIComponent('Smoke Test FDP')}`, faculty);
  ok(disc.status === 200, `discover ok (got ${disc.status})`);
  ok(
    disc.body.opportunities.some(o => o.title === validPayload.title),
    'FDP visible on the Discover feed',
  );

  console.log('\nALL SMOKE TESTS PASSED');

  // Cleanup
  await Opportunity.deleteMany({ _id: { $in: createdIds } });
  console.log(`cleaned up ${createdIds.length} test opportunities`);
  await mongoose.disconnect();
  process.exit(0);
})().catch(async err => {
  console.error('\nSMOKE TEST FAILED:', err.message);
  if (createdIds.length) {
    await Opportunity.deleteMany({ _id: { $in: createdIds } }).catch(() => {});
  }
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
