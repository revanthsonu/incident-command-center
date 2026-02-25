import express from 'express';
import cors from 'cors';
import { getDb, initSchema } from './db/schema.js';
import { startEventLoop } from './simulator/eventLoop.js';

import servicesRouter from './routes/services.js';
import incidentsRouter from './routes/incidents.js';
import alertsRouter from './routes/alerts.js';
import configsRouter from './routes/configs.js';
import runbooksRouter from './routes/runbooks.js';
import diagnosticsRouter from './routes/diagnostics.js';
import automationRouter from './routes/automation.js';
import oncallRouter from './routes/oncall.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize database
const db = getDb();
initSchema(db);

// API Routes
app.use('/api/services', servicesRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/configs', configsRouter);
app.use('/api/runbooks', runbooksRouter);
app.use('/api/diagnostics', diagnosticsRouter);
app.use('/api/automation', automationRouter);
app.use('/api/oncall', oncallRouter);

// Dashboard summary endpoint
app.get('/api/dashboard', (req, res) => {
    const db = getDb();
    const services = db.prepare('SELECT * FROM services').all();
    const activeIncidents = db.prepare("SELECT COUNT(*) as count FROM incidents WHERE status != 'resolved'").get();
    const criticalIncidents = db.prepare("SELECT COUNT(*) as count FROM incidents WHERE severity = 'critical' AND status != 'resolved'").get();
    const unackedAlerts = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0').get();
    const recentAlerts = db.prepare('SELECT a.*, s.name as service_name FROM alerts a LEFT JOIN services s ON a.service_id = s.id WHERE a.acknowledged = 0 ORDER BY a.created_at DESC LIMIT 8').all();
    const recentIncidents = db.prepare("SELECT i.*, s.name as service_name FROM incidents i LEFT JOIN services s ON i.service_id = s.id WHERE i.status != 'resolved' ORDER BY i.created_at DESC LIMIT 5").all();
    const automationRuns = db.prepare('SELECT SUM(run_count) as total FROM automation_scripts').get();

    res.json({
        kpis: {
            services_healthy: services.filter(s => s.status === 'healthy').length,
            services_total: services.length,
            active_incidents: activeIncidents.count,
            critical_incidents: criticalIncidents.count,
            unacked_alerts: unackedAlerts.count,
            automation_runs: automationRuns.total || 0,
        },
        services,
        recentAlerts,
        recentIncidents,
    });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Incident Command Center API running on http://localhost:${PORT}`);
    console.log(`   Routes: /api/dashboard, /api/services, /api/incidents, /api/alerts,`);
    console.log(`           /api/configs, /api/runbooks, /api/diagnostics, /api/automation, /api/oncall\n`);
    startEventLoop();
});
