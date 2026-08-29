/**
 * End-to-end smoke test for M15 Reports & Grievance flow.
 * Assumes seeded demo accounts and at least one live opportunity exist.
 * Run: node scripts/smoke-test-reports.js
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import mongoose from 'mongoose';
import { Report } from '../models/Report.js';
import { Opportunity } from '../models/Opportunity.js';
import { Job } from '../models/Job.js';

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
      Authorization: `Bearer ${token}`,
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

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ok — ${msg}`);
}

(async () => {
  await connectDB();

  // Reset the reports collection so counts are deterministic
  await Report.deleteMany({});
  console.log('cleared reports collection');

  const opp = await Opportunity.findOne({ status: 'live' }).select('_id title');
  if (!opp) throw new Error('no live opportunity found — run seed-opportunities first');
  const job = await Job.findOne({ status: 'open' }).select('_id title');
  if (!job) throw new Error('no open job found — run seed-jobs first');

  console.log(`target opportunity: ${opp.title}`);
  console.log(`target job: ${job.title}`);

  const facultyToken = await login('ananya.krishnan@iitm.ac.in', 'Faculty@2026');
  const facultyToken2 = await login('rajesh.iyer@nitt.edu', 'Faculty@2026');
  const adminToken = await login('admin@facultyconnect.in', 'PlatformAdmin@2026');
  console.log('logged in: faculty1, faculty2, platform admin');

  // 1. File a report on opportunity
  console.log('\n[1] filing report on opportunity');
  const r1 = await api('POST', '/reports', facultyToken, {
    targetType: 'opportunity',
    targetId: opp._id.toString(),
    category: 'predatory_journal',
    reason: 'This looks like a pay-to-publish predatory journal — no real peer review visible.',
  });
  assert(r1.status === 201, `report created (got ${r1.status})`);
  assert(r1.body.report?.status === 'open', 'status open');
  assert(r1.body.report?.slaDeadline, 'sla deadline set');
  assert(r1.body.report?.targetSnapshot?.title === opp.title, 'target snapshot captured');
  const reportId = r1.body.report.id;

  // 2. Duplicate detection: same reporter can file again on same target — API allows it (no uniqueness enforced), just check second one goes through
  console.log('\n[2] filing report on job (different reporter)');
  const r2 = await api('POST', '/reports', facultyToken2, {
    targetType: 'job',
    targetId: job._id.toString(),
    category: 'fake_job',
    reason: 'Salary listed is 10x industry norm — smells like bait for personal data collection.',
  });
  assert(r2.status === 201, `job report created (got ${r2.status})`);

  // 3. Self-report on faculty should be blocked
  console.log('\n[3] self-report should be blocked');
  const meRes = await api('GET', '/faculty/me', facultyToken);
  const selfR = await api('POST', '/reports', facultyToken, {
    targetType: 'faculty',
    targetId: meRes.body.faculty.id,
    category: 'other',
    reason: 'attempting to report myself just to confirm the guard fires as expected',
  });
  assert(selfR.status === 400, `self-report rejected (got ${selfR.status})`);
  assert(selfR.body.error?.code === 'SELF_REPORT', 'error code SELF_REPORT');

  // 4. Validation: too-short reason
  console.log('\n[4] short reason rejected');
  const shortR = await api('POST', '/reports', facultyToken, {
    targetType: 'opportunity',
    targetId: opp._id.toString(),
    category: 'spam',
    reason: 'short',
  });
  assert(shortR.status === 400, `short reason rejected (got ${shortR.status})`);

  // 5. My reports
  console.log('\n[5] listing my reports');
  const mine = await api('GET', '/reports/mine', facultyToken);
  assert(mine.status === 200, `my reports (got ${mine.status})`);
  assert(mine.body.reports.length === 1, 'exactly 1 report by faculty1');

  // 6. Admin queue
  console.log('\n[6] admin lists open reports');
  const openList = await api('GET', '/admin/reports?status=open', adminToken);
  assert(openList.status === 200, `admin list open (got ${openList.status})`);
  assert(openList.body.total === 2, `2 open reports total (got ${openList.body.total})`);

  // 7. Non-admin cannot access admin queue
  console.log('\n[7] non-admin blocked from admin queue');
  const forbidden = await api('GET', '/admin/reports', facultyToken);
  assert(forbidden.status === 403, `403 (got ${forbidden.status})`);

  // 8. Summary
  console.log('\n[8] admin fetches summary');
  const summary = await api('GET', '/admin/reports-summary', adminToken);
  assert(summary.status === 200, `summary (got ${summary.status})`);
  assert(summary.body.open === 2, `2 open in summary (got ${summary.body.open})`);
  assert(summary.body.overdue === 0, `0 overdue in summary (got ${summary.body.overdue})`);

  // 9. Admin acknowledges report 1
  console.log('\n[9] admin acknowledges');
  const ack = await api('PATCH', `/admin/reports/${reportId}`, adminToken, {
    decision: 'acknowledged',
  });
  assert(ack.status === 200, `ack (got ${ack.status})`);
  assert(ack.body.report?.status === 'acknowledged', 'status acknowledged');
  assert(ack.body.report?.acknowledgedAt, 'acknowledgedAt set');

  // 10. Admin resolves report 1
  console.log('\n[10] admin resolves acknowledged report');
  const resolve = await api('PATCH', `/admin/reports/${reportId}`, adminToken, {
    decision: 'resolved',
    notes: 'Listing removed by organizer following contact from platform team.',
  });
  assert(resolve.status === 200, `resolve (got ${resolve.status})`);
  assert(resolve.body.report?.status === 'resolved', 'status resolved');
  assert(resolve.body.report?.resolvedAt, 'resolvedAt set');
  assert(resolve.body.report?.reviewNotes?.length > 5, 'review notes recorded');

  // 11. Reviewing a resolved report should fail
  console.log('\n[11] reviewing closed report is blocked');
  const already = await api('PATCH', `/admin/reports/${reportId}`, adminToken, {
    decision: 'dismissed',
    notes: 'trying to re-close, should be blocked',
  });
  assert(already.status === 409, `already closed (got ${already.status})`);

  // 12. Dismiss without notes should fail
  console.log('\n[12] dismissal without notes rejected');
  const [openRow] = await Report.find({ status: 'open' }).limit(1).select('_id');
  const badDismiss = await api('PATCH', `/admin/reports/${openRow._id}`, adminToken, {
    decision: 'dismissed',
  });
  assert(badDismiss.status === 400, `dismiss without notes (got ${badDismiss.status})`);

  // 13. Dismiss with notes
  console.log('\n[13] admin dismisses with notes');
  const dismiss = await api('PATCH', `/admin/reports/${openRow._id}`, adminToken, {
    decision: 'dismissed',
    notes: 'Salary claim in listing is unusual but not fraudulent per HR verification.',
  });
  assert(dismiss.status === 200, `dismiss (got ${dismiss.status})`);
  assert(dismiss.body.report?.status === 'dismissed', 'status dismissed');

  // 14. Summary after resolutions
  console.log('\n[14] summary reflects closures');
  const summary2 = await api('GET', '/admin/reports-summary', adminToken);
  assert(summary2.body.open === 0, `0 open after closures (got ${summary2.body.open})`);

  // 15. Rate limit smoke — file 5 more reports quickly, 6th should 429
  console.log('\n[15] rate limit — 5/day cap');
  const rateToken = await login('priya.menon@iisc.ac.in', 'Faculty@2026');
  let hitLimit = false;
  for (let i = 0; i < 6; i++) {
    const r = await api('POST', '/reports', rateToken, {
      targetType: 'opportunity',
      targetId: opp._id.toString(),
      category: 'other',
      reason: `Rate limit test iteration ${i} — this is a burst check to confirm the 5/24h daily cap fires.`,
    });
    if (r.status === 429) {
      hitLimit = true;
      console.log(`  hit rate limit on iteration ${i}`);
      break;
    }
    if (r.status !== 201) {
      console.log(`  iteration ${i}: unexpected ${r.status} ${JSON.stringify(r.body)}`);
    }
  }
  assert(hitLimit, 'rate limiter kicked in within 6 requests');

  console.log('\nALL SMOKE TESTS PASSED');
  await mongoose.disconnect();
  process.exit(0);
})().catch(async err => {
  console.error('\nSMOKE TEST FAILED:', err.message);
  console.error(err.stack);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
