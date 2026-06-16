const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });


const connectDB = require('./config/database');
const setupSecurity = require('./config/security');
const requireAdminAuth = require('./middleware/requireAdminAuth');
const requireStudyToken = require('./middleware/requireStudyToken');

const participantRoutes = require('./routes/participants');
const sentenceAttemptRoutes = require('./routes/sentenceAttempts');
const sentenceRoutes = require('./routes/sentences');
const exportRoutes = require('./routes/export');
const analyticsRoutes = require('./routes/analytics');
const studyLinkRoutes = require('./routes/studyLinks');
const adminRoutes = require('./routes/admin');

const app = express();

app.disable('x-powered-by');

const trustProxy = process.env.TRUST_PROXY;

if (trustProxy) {
  if (trustProxy === 'true') {
    app.set('trust proxy', 1); 
  } else if (!Number.isNaN(Number(trustProxy))) {
    app.set('trust proxy', Number(trustProxy));
  }
}

const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || '2mb';

app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));

// DB connection is initialized later in the async startup block

setupSecurity(app);

app.use('/api/participants', requireStudyToken, participantRoutes);
app.use('/api/attempts', requireStudyToken, sentenceAttemptRoutes);
app.use('/api/sentences', requireStudyToken, sentenceRoutes);
app.use('/api/export', requireAdminAuth, exportRoutes);
app.use('/api/analytics', requireAdminAuth, analyticsRoutes);
app.use('/api/study-links', studyLinkRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server running' });
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  (async () => {
    try {
      await connectDB();
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    } catch (err) {
      console.error('Failed to start server due to DB connection error:', err);
      process.exit(1);
    }
  })();
}

module.exports = app;
