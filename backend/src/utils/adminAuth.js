const crypto = require('crypto');

const parseTokenTtlSeconds = (value, fallbackSeconds) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallbackSeconds;
  }

  const bounded = Math.floor(parsed);
  if (bounded < 300 || bounded > 24 * 60 * 60) {
    return fallbackSeconds;
  }

  return bounded;
};

const DEFAULT_TOKEN_TTL_SECONDS = parseTokenTtlSeconds(
  process.env.ADMIN_TOKEN_TTL_SECONDS,
  60 * 60
);

const toBase64Url = (value) =>
  Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
  return Buffer.from(padded, 'base64').toString('utf8');
};

const getAdminPassword = () => (process.env.ADMIN_PANEL_PASSWORD || '').trim();

const getSigningSecret = () =>
  (process.env.ADMIN_AUTH_SECRET || process.env.ADMIN_PANEL_PASSWORD || '').trim();

const constantTimeEquals = (a, b) => {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

const sign = (payloadPart) => {
  const secret = getSigningSecret();
  if (!secret) {
    return '';
  }

  return crypto
    .createHmac('sha256', secret)
    .update(payloadPart)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const issueAdminToken = (subject = 'admin') => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: subject,
    iat: nowSeconds,
    exp: nowSeconds + DEFAULT_TOKEN_TTL_SECONDS,
  };

  const payloadPart = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadPart);
  return `${payloadPart}.${signature}`;
};

const verifyAdminToken = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const [payloadPart, signature] = token.split('.');
  if (!payloadPart || !signature) {
    return null;
  }

  const expectedSignature = sign(payloadPart);
  if (!expectedSignature || !constantTimeEquals(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadPart));
    if (typeof payload.exp !== 'number') {
      return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSeconds) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
};

const isAdminPasswordValid = (candidate) => {
  const expected = getAdminPassword();
  if (!expected || typeof candidate !== 'string') {
    return false;
  }

  const trimmed = candidate.trim();
  return constantTimeEquals(trimmed, expected);
};

module.exports = {
  DEFAULT_TOKEN_TTL_SECONDS,
  getAdminPassword,
  issueAdminToken,
  verifyAdminToken,
  isAdminPasswordValid,
};
