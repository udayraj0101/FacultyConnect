import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { requestLogger } from './middleware/requestLogger.js';
import { createLogger } from './utils/logger.js';
import authRoutes from './routes/auth.routes.js';
import facultyRoutes from './routes/faculty.routes.js';
import opportunityRoutes from './routes/opportunity.routes.js';
import journalRoutes from './routes/journal.routes.js';
import institutionRoutes from './routes/institution.routes.js';
import adminRoutes from './routes/admin.routes.js';
import jobRoutes from './routes/job.routes.js';
import directoryRoutes from './routes/directory.routes.js';
import reportRoutes from './routes/report.routes.js';
import publicRoutes from './routes/public.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import rateLimit from 'express-rate-limit';
import { renderPublicProfileHtml } from './services/publicHtml.service.js';
import { generatePublicProfileSitemap } from './services/sitemap.service.js';
import { startScheduler } from './services/scheduler.service.js';

const logger = createLogger('server');
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'facultyconnect-api' }));

app.use('/v1/auth', authRoutes);
app.use('/v1/faculty', facultyRoutes);
app.use('/v1/opportunities', opportunityRoutes);
app.use('/v1/journals', journalRoutes);
app.use('/v1/institutions', institutionRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/jobs', jobRoutes);
app.use('/v1/directory', directoryRoutes);
app.use('/v1/reports', reportRoutes);
app.use('/v1/public', publicRoutes);
app.use('/v1/notifications', notificationRoutes);

// ------------------------------------------------------------------
// Root-level public HTML routes — served by the reverse proxy at /f/*
// and /sitemap.xml. These render SEO-friendly responses so non-JS
// crawlers (Bing, archive.org) see meta tags + noscript content.
// ------------------------------------------------------------------
const publicHtmlLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/f/:handleOrId', publicHtmlLimiter, async (req, res, next) => {
  try {
    const { html, status } = await renderPublicProfileHtml(req.params.handleOrId, req);
    res.status(status);
    res.set('Content-Type', 'text/html; charset=utf-8');
    // Public content, safe to cache at the edge briefly. Crawlers refresh
    // fast; humans hit the SPA route via the frontend host anyway.
    res.set('Cache-Control', 'public, max-age=300');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

app.get('/sitemap.xml', publicHtmlLimiter, async (req, res, next) => {
  try {
    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`;
    const xml = await generatePublicProfileSitemap(baseUrl);
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  logger.error('unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => logger.info(`FacultyConnect API listening on :${PORT}`));
    startScheduler();
  })
  .catch(error => {
    logger.error('failed to boot', { error: error.message });
    process.exit(1);
  });
