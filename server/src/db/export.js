// Pre-compute all API data as static JSON for Vercel deployment
// Run: node src/db/export.js (after npm run seed)
import { getDb } from './schema.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', '..', '..', 'client', 'public', 'data');
mkdirSync(outDir, { recursive: true });

const db = getDb();

// ─── Dashboard ──────────────────────────────────────────────
const services = db.prepare('SELECT * FROM services').all();
const activeIncidents = db.prepare("SELECT i.*, s.name as service_name FROM incidents i LEFT JOIN services s ON i.service_id = s.id WHERE i.status != 'resolved' ORDER BY i.created_at DESC").all();
const recentAlerts = db.prepare("SELECT a.*, s.name as service_name FROM alerts a LEFT JOIN services s ON a.service_id = s.id WHERE a.acknowledged = 0 ORDER BY a.created_at DESC LIMIT 10").all();

const kpis = {
    services_total: services.length,
    services_healthy: services.filter(s => s.status === 'healthy').length,
    active_incidents: activeIncidents.length,
    critical_incidents: activeIncidents.filter(i => i.severity === 'critical').length,
    unacked_alerts: db.prepare("SELECT COUNT(*) as c FROM alerts WHERE acknowledged = 0").get().c,
    automation_runs: db.prepare("SELECT COUNT(*) as c FROM automation_logs").get().c,
};

writeFileSync(join(outDir, 'dashboard.json'), JSON.stringify({
    kpis,
    services,
    recentAlerts,
    recentIncidents: activeIncidents,
}));

// ─── Services ───────────────────────────────────────────────
const summary = {
    healthy: services.filter(s => s.status === 'healthy').length,
    degraded: services.filter(s => s.status === 'degraded').length,
    warning: services.filter(s => s.status === 'warning').length,
    down: services.filter(s => s.status === 'down').length,
};
writeFileSync(join(outDir, 'services.json'), JSON.stringify({ services, summary }));

// ─── Incidents ──────────────────────────────────────────────
const allIncidents = db.prepare("SELECT i.*, s.name as service_name FROM incidents i LEFT JOIN services s ON i.service_id = s.id ORDER BY i.created_at DESC").all();
const incidentSummary = {
    total: allIncidents.length,
    active: allIncidents.filter(i => i.status !== 'resolved').length,
    resolved: allIncidents.filter(i => i.status === 'resolved').length,
};
writeFileSync(join(outDir, 'incidents.json'), JSON.stringify({ incidents: allIncidents, summary: incidentSummary }));

// Individual incident details with timelines
for (const inc of allIncidents) {
    const timeline = db.prepare('SELECT * FROM incident_timeline WHERE incident_id = ? ORDER BY created_at ASC').all(inc.id);
    writeFileSync(join(outDir, `incident_${inc.id}.json`), JSON.stringify({ incident: inc, timeline }));
}

// ─── Alerts ─────────────────────────────────────────────────
const allAlerts = db.prepare("SELECT a.*, s.name as service_name FROM alerts a LEFT JOIN services s ON a.service_id = s.id ORDER BY a.created_at DESC").all();
const alertSummary = {
    total: allAlerts.length,
    unacknowledged: allAlerts.filter(a => !a.acknowledged).length,
    critical: allAlerts.filter(a => a.severity === 'critical').length,
};
writeFileSync(join(outDir, 'alerts.json'), JSON.stringify({ alerts: allAlerts, summary: alertSummary }));

// ─── Configs ────────────────────────────────────────────────
for (const svc of services) {
    const configs = db.prepare('SELECT * FROM configs WHERE service_id = ?').all(svc.id);
    writeFileSync(join(outDir, `configs_${svc.id}.json`), JSON.stringify({ service_name: svc.name, configs }));
}

// ─── Runbooks ───────────────────────────────────────────────
const runbooks = db.prepare('SELECT * FROM runbooks ORDER BY category, title').all().map(rb => ({
    ...rb,
    steps: JSON.parse(rb.steps),
}));
const categories = [...new Set(runbooks.map(r => r.category))];
writeFileSync(join(outDir, 'runbooks.json'), JSON.stringify({ runbooks, categories }));

// ─── Automation ─────────────────────────────────────────────
const scripts = db.prepare(`
  SELECT s.*,
    COUNT(l.id) as run_count,
    COALESCE(AVG(l.duration_ms), 0) as avg_duration_ms
  FROM automation_scripts s
  LEFT JOIN automation_logs l ON s.id = l.script_id
  GROUP BY s.id
  ORDER BY s.name
`).all();
writeFileSync(join(outDir, 'automation.json'), JSON.stringify({ scripts }));

// ─── On-Call ────────────────────────────────────────────────
const now = new Date().toISOString();
const current = db.prepare('SELECT * FROM oncall_schedule WHERE start_date <= ? AND end_date >= ? ORDER BY rotation_type').all(now, now);
const upcoming = db.prepare('SELECT * FROM oncall_schedule WHERE start_date > ? ORDER BY start_date LIMIT 6').all(now);
const past = db.prepare('SELECT * FROM oncall_schedule WHERE end_date < ? ORDER BY end_date DESC LIMIT 6').all(now);
writeFileSync(join(outDir, 'oncall.json'), JSON.stringify({ current, upcoming, past }));

console.log(`✅ Exported static data to ${outDir}`);
console.log(`   Files: dashboard, services, incidents (${allIncidents.length} detail files), alerts, configs (${services.length} files), runbooks, automation, oncall`);
db.close();
