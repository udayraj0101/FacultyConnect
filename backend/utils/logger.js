const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'authorization',
  'secret',
  'apiKey',
  'jwt',
  'refreshToken',
  'accessToken',
]);

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function resolveLogLevel() {
  const configured = (process.env.LOG_LEVEL || '').toLowerCase();
  if (LOG_LEVELS[configured]) return configured;
  return process.env.NODE_ENV === 'production' ? 'info' : 'info';
}

const CURRENT_LEVEL = resolveLogLevel();
const IS_DEV = process.env.NODE_ENV !== 'production';

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function sanitize(value, depth = 0) {
  if (value == null) return value;
  if (depth > 3) return undefined;

  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitize(item, depth + 1));
  }

  if (isPlainObject(value)) {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key)) {
        out[key] = '[REDACTED]';
      } else {
        const sanitized = sanitize(item, depth + 1);
        if (sanitized !== undefined) out[key] = sanitized;
      }
    }
    return out;
  }

  return value;
}

function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}

function write(level, scope, message, meta) {
  if (!shouldLog(level)) return;

  if (IS_DEV) {
    const levelColor = level === 'error' ? COLORS.red : level === 'warn' ? COLORS.yellow : level === 'info' ? COLORS.blue : COLORS.dim;
    const parts = [
      `${levelColor}${level.toUpperCase()}${COLORS.reset}`,
      `${COLORS.cyan}${scope}${COLORS.reset}`,
      message,
    ];

    const output = Object.keys(meta || {}).length > 0
      ? `${parts.join(' ')} ${JSON.stringify(meta)}`
      : parts.join(' ');

    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  } else {
    const payload = { timestamp: new Date().toISOString(), level, scope, message };
    if (Object.keys(meta || {}).length > 0) {
      payload.meta = meta;
    }
    const line = JSON.stringify(payload);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}

export function createLogger(scope) {
  const baseScope = scope || 'app';

  function log(level, message, meta = {}) {
    write(level, baseScope, message, sanitize(meta));
  }

  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
  };
}
