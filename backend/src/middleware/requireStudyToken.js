const StudyLink = require('../models/StudyLink');

const TOKEN_REGEX = /^[a-z0-9-]{4,64}$/;

const normalizeToken = (value = '') => `${value}`.trim().toLowerCase();

const extractStudyToken = (req) => {
  const headerToken = req.get('x-study-token');
  if (headerToken) {
    return headerToken;
  }

  if (typeof req.query?.link_token === 'string') {
    return req.query.link_token;
  }

  if (typeof req.query?.token === 'string') {
    return req.query.token;
  }

  if (typeof req.body?.link_token === 'string') {
    return req.body.link_token;
  }

  return '';
};

const requireStudyToken = async (req, res, next) => {
  try {
    let token = normalizeToken(extractStudyToken(req));
    // In development (localhost) allow omission of a study token for easier testing
    if (!token && process.env.NODE_ENV === 'development') {
      token = 'dev-token';
    }
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Study token is required',
      });
    }

    // Skip format and existence checks in dev mode
    if (process.env.NODE_ENV !== 'development') {
      if (!TOKEN_REGEX.test(token)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid study token format',
        });
      }

      const activeLink = await StudyLink.exists({ token, active: true });
      if (!activeLink) {
        return res.status(403).json({
          success: false,
          error: 'Invalid or inactive study token',
        });
      }
    }

    req.studyToken = token;
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to validate study token',
    });
  }
};

module.exports = requireStudyToken;
