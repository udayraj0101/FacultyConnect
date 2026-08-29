const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
]);

function configuredLevel() {
  const level = (import.meta.env.VITE_LOG_LEVEL || '').toLowerCase();
  if (LEVELS[level]) return level;
  return import.meta.env.DEV ? 'debug' : 'info';
}

const CURRENT_LEVEL = configuredLevel();

function shouldLog(level) {
  return LEVELS[level] >= LEVELS[CURRENT_LEVEL];
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function sanitize(value, depth = 0) {
  if (value == null) return value;
  if (depth > 5) return '[MaxDepth]';
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (Array.isArray(value)) return value.map(item => sanitize(item, depth + 1));
  if (isPlainObject(value)) {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : sanitize(item, depth + 1);
    }
    return out;
  }
  return value;
}

function emit(level, scope, message, meta) {
  if (!shouldLog(level)) return;
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    meta: sanitize(meta || {}),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function createLogger(scope) {
  const loggerScope = scope || 'frontend';
  return {
    debug: (message, meta) => emit('debug', loggerScope, message, meta),
    info: (message, meta) => emit('info', loggerScope, message, meta),
    warn: (message, meta) => emit('warn', loggerScope, message, meta),
    error: (message, meta) => emit('error', loggerScope, message, meta),
    child: subScope => createLogger(`${loggerScope}.${subScope}`),
  };
}
