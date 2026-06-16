const { verifyAdminToken } = require('../utils/adminAuth');

const parseCookieHeader = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex <= 0) {
        return acc;
      }

      const key = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();
      try {
        acc[key] = decodeURIComponent(value);
      } catch (error) {
        acc[key] = value;
      }
      return acc;
    }, {});

const requireAdminAuth = (req, res, next) => {
  const authHeader = req.get('authorization') || '';
  const [scheme, token] = authHeader.split(' ');
  const cookieToken = parseCookieHeader(req.get('cookie') || '').admin_auth_token;
  const resolvedToken = scheme === 'Bearer' && token ? token : cookieToken;

  if (!resolvedToken) {
    return res.status(401).json({
      success: false,
      error: 'Admin authentication required',
    });
  }

  const payload = verifyAdminToken(resolvedToken);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired admin token',
    });
  }

  req.admin = payload;
  return next();
};

module.exports = requireAdminAuth;
