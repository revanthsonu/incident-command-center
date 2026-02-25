import express from 'express';
import { getDb } from '../db/schema.js';

const router = express.Router();

router.get('/', (req, res) => {
    const db = getDb();
    const { severity, status } = req.query;
    let query = `SELECT i.*, s.name as service_name FROM incidents i LEFT JOIN services s ON i.service_id = s.id WHERE 1=1`;
    const params = [];
    if (severity) { query += ` AND i.severity = ?`; params.push(severity); }
    if (status) { query += ` AND i.status = ?`; params.push(status); }
    query += ` ORDER BY i.created_at DESC`;
    const incidents = db.prepare(query).all(...params);

    const summary = {
        total: incidents.length,
        active: incidents.filter(i => i.status !== 'resolved').length,
        critical: incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length,
    };
    res.json({ incidents, summary });
});

router.get('/:id', (req, res) => {
    const db = getDb();
    const incident = db.prepare(`SELECT i.*, s.name as service_name FROM incidents i LEFT JOIN services s ON i.service_id = s.id WHERE i.id = ?`).get(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    const timeline = db.prepare('SELECT * FROM incident_timeline WHERE incident_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ incident, timeline });
});

router.post('/', (req, res) => {
    const db = getDb();
    const { title, description, severity, service_id, assignee } = req.body;
    const info = db.prepare(
        'INSERT INTO incidents (title, description, severity, service_id, assignee) VALUES (?, ?, ?, ?, ?)'
    ).run(title, description, severity || 'medium', service_id, assignee);

    db.prepare(
        'INSERT INTO incident_timeline (incident_id, action, detail, actor) VALUES (?, ?, ?, ?)'
    ).run(info.lastInsertRowid, 'created', `Incident created: ${title}`, assignee || 'system');

    res.status(201).json({ id: info.lastInsertRowid });
});

router.patch('/:id/status', (req, res) => {
    const db = getDb();
    const { status, detail, actor } = req.body;
    const now = new Date().toISOString();

    const updates = { status, updated_at: now };
    if (status === 'resolved') updates.resolved_at = now;

    db.prepare('UPDATE incidents SET status = ?, updated_at = ?, resolved_at = CASE WHEN ? = "resolved" THEN ? ELSE resolved_at END WHERE id = ?')
        .run(status, now, status, now, req.params.id);

    db.prepare(
        'INSERT INTO incident_timeline (incident_id, action, detail, actor) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, status, detail || `Status changed to ${status}`, actor || 'operator');

    res.json({ success: true });
});

router.post('/:id/postmortem', (req, res) => {
    const db = getDb();
    const { postmortem } = req.body;
    db.prepare('UPDATE incidents SET postmortem = ? WHERE id = ?').run(postmortem, req.params.id);

    db.prepare(
        'INSERT INTO incident_timeline (incident_id, action, detail, actor) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, 'postmortem', 'Postmortem added', 'operator');

    res.json({ success: true });
});

export default router;
