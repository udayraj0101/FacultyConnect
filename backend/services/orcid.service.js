import axios from 'axios';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('orcid.service');

const STATE_TTL_SECONDS = 600;

function requireEnv() {
  const {
    ORCID_CLIENT_ID,
    ORCID_CLIENT_SECRET,
    ORCID_REDIRECT_URI,
    ORCID_API_BASE,
    JWT_ACCESS_SECRET,
  } = process.env;
  if (!ORCID_CLIENT_ID || !ORCID_CLIENT_SECRET || !ORCID_REDIRECT_URI || !ORCID_API_BASE || !JWT_ACCESS_SECRET) {
    throw new Error('ORCID env not configured');
  }
  return { ORCID_CLIENT_ID, ORCID_CLIENT_SECRET, ORCID_REDIRECT_URI, ORCID_API_BASE, JWT_ACCESS_SECRET };
}

export function signState(facultyId) {
  const { JWT_ACCESS_SECRET } = requireEnv();
  const nonce = randomBytes(16).toString('hex');
  return jwt.sign(
    { purpose: 'orcid_link', facultyId, nonce },
    JWT_ACCESS_SECRET,
    { expiresIn: STATE_TTL_SECONDS },
  );
}

export function verifyState(state) {
  const { JWT_ACCESS_SECRET } = requireEnv();
  let payload;
  try {
    payload = jwt.verify(state, JWT_ACCESS_SECRET);
  } catch (error) {
    const err = new Error('OAuth state invalid or expired');
    err.code = 'STATE_INVALID';
    err.status = 400;
    throw err;
  }
  if (payload.purpose !== 'orcid_link' || !payload.facultyId) {
    const err = new Error('OAuth state has wrong purpose');
    err.code = 'STATE_INVALID';
    err.status = 400;
    throw err;
  }
  return payload;
}

export function buildAuthorizeUrl(state) {
  const { ORCID_CLIENT_ID, ORCID_REDIRECT_URI, ORCID_API_BASE } = requireEnv();
  const params = new URLSearchParams({
    client_id: ORCID_CLIENT_ID,
    response_type: 'code',
    scope: '/authenticate',
    redirect_uri: ORCID_REDIRECT_URI,
    state,
  });
  return `${ORCID_API_BASE}/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const { ORCID_CLIENT_ID, ORCID_CLIENT_SECRET, ORCID_REDIRECT_URI, ORCID_API_BASE } = requireEnv();
  const body = new URLSearchParams({
    client_id: ORCID_CLIENT_ID,
    client_secret: ORCID_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: ORCID_REDIRECT_URI,
  });
  try {
    const response = await axios.post(`${ORCID_API_BASE}/oauth/token`, body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    const detail = error.response?.data || { message: error.message };
    logger.error('token exchange failed', { detail });
    const err = new Error('ORCID token exchange failed');
    err.code = 'ORCID_TOKEN_EXCHANGE_FAILED';
    err.status = 502;
    throw err;
  }
}

let cachedAppToken = null;

async function getAppAccessToken() {
  const now = Date.now();
  if (cachedAppToken && cachedAppToken.expiresAt > now + 60_000) {
    return cachedAppToken.token;
  }
  const { ORCID_CLIENT_ID, ORCID_CLIENT_SECRET, ORCID_API_BASE } = requireEnv();
  const body = new URLSearchParams({
    client_id: ORCID_CLIENT_ID,
    client_secret: ORCID_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: '/read-public',
  });
  try {
    const response = await axios.post(`${ORCID_API_BASE}/oauth/token`, body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      timeout: 10000,
    });
    const expiresInMs = (response.data.expires_in || 3600) * 1000;
    cachedAppToken = {
      token: response.data.access_token,
      expiresAt: now + expiresInMs,
    };
    return cachedAppToken.token;
  } catch (error) {
    const detail = error.response?.data || { message: error.message };
    logger.error('app token acquire failed', { detail });
    const err = new Error('Could not acquire ORCID app token');
    err.code = 'ORCID_APP_TOKEN_FAILED';
    err.status = 502;
    throw err;
  }
}

function extractDoi(externalIdContainer) {
  const list = externalIdContainer?.['external-id'];
  if (!Array.isArray(list)) return null;
  const doi = list.find(x => (x['external-id-type'] || '').toLowerCase() === 'doi');
  return doi?.['external-id-value'] || null;
}

function normalizeWork(group) {
  const summary = group['work-summary']?.[0];
  if (!summary) return null;
  const title = summary.title?.title?.value;
  if (!title) return null;
  const yearRaw = summary['publication-date']?.year?.value;
  const year = yearRaw ? parseInt(yearRaw, 10) : null;
  const venue = summary['journal-title']?.value || null;
  const doi = extractDoi(group['external-ids']) || extractDoi(summary['external-ids']);
  const putCode = summary['put-code'];
  return {
    title,
    year: Number.isFinite(year) ? year : null,
    venue,
    doi,
    externalId: putCode != null ? String(putCode) : null,
  };
}

export async function fetchWorks(orcidId) {
  const { ORCID_PUBLIC_API_BASE } = process.env;
  if (!ORCID_PUBLIC_API_BASE) throw new Error('ORCID_PUBLIC_API_BASE not configured');
  const token = await getAppAccessToken();
  try {
    const response = await axios.get(`${ORCID_PUBLIC_API_BASE}/v3.0/${orcidId}/works`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 15000,
    });
    const groups = response.data.group || [];
    return groups.map(normalizeWork).filter(Boolean);
  } catch (error) {
    const detail = error.response?.data || { message: error.message };
    logger.error('fetchWorks failed', { orcidId, status: error.response?.status, detail });
    const err = new Error('Could not fetch works from ORCID');
    err.code = 'ORCID_FETCH_WORKS_FAILED';
    err.status = 502;
    throw err;
  }
}
