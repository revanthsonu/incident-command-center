import express from 'express';
import { getDb } from '../db/schema.js';

const router = express.Router();

router.get('/', (req, res) => {
    const db = getDb();
    const { severity, acknowledged, service_id } = req.query;
    let query = `SELECT a.*, s.name as service_name FROM alerts a LEFT JOIN services s ON a.service_id = s.id WHERE 1=1`;
    const params = [];
    if (severity) { query += ` AND a.severity = ?`; params.push(severity); }
    if (acknowledged !== undefined) { query += ` AND a.acknowledged = ?`; params.push(Number(acknowledged)); }
    if (service_id) { query += ` AND a.service_id = ?`; params.push(service_id); }
    query += ` ORDER BY a.created_at DESC`;
    const alerts = db.prepare(query).all(...params);

    const summary = {
        total: alerts.length,
        unacknowledged: alerts.filter(a => !a.acknowledged).length,
        critical: alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
        high: alerts.filter(a => a.severity === 'high' && !a.acknowledged).length,
    };
    res.json({ alerts, summary });
});

router.patch('/:id/acknowledge', (req, res) => {
    const db = getDb();
    const { acknowledged_by } = req.body;
    db.prepare('UPDATE alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = datetime("now") WHERE id = ?')
        .run(acknowledged_by || 'operator', req.params.id);
    res.json({ success: true });
});

export default router;
