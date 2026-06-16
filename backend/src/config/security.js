const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const setupSecurity = (app) => {
  const parsePositiveInt = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  };

  const parseAllowedOrigins = (value) =>
    String(value || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

  const rateLimitWindowMs = parsePositiveInt(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  );
  const rateLimitMaxRequests = parsePositiveInt(
    process.env.RATE_LIMIT_MAX_REQUESTS,
    100
  );
  const adminLoginRateLimitWindowMs = parsePositiveInt(
    process.env.ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS,
    10 * 60 * 1000
  );
  const adminLoginRateLimitMax = parsePositiveInt(
    process.env.ADMIN_LOGIN_RATE_LIMIT_MAX,
    5
  );
  const configuredOrigins = parseAllowedOrigins(process.env.FRONTEND_URL);
  const defaultDevOrigins =
    process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:3000', 'http://localhost:5173'];
  const allowedOrigins =
    configuredOrigins.length > 0 ? configuredOrigins : defaultDevOrigins;

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(null, false);
      },
      credentials: true,
    })
  );

  const limiter = rateLimit({
    windowMs: rateLimitWindowMs,
    max: rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const adminLoginLimiter = rateLimit({
    windowMs: adminLoginRateLimitWindowMs,
    max: adminLoginRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many login attempts. Please try again later.',
    },
  });

  app.use('/api/', limiter);
  app.use('/api/admin/auth/login', adminLoginLimiter);
  app.use(mongoSanitize());
  app.use(hpp());
};

module.exports = setupSecurity;
