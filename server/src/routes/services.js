import express from 'express';
import { getDb, initSchema } from '../db/schema.js';

const router = express.Router();

router.get('/', (req, res) => {
    const db = getDb();
    const services = db.prepare('SELECT * FROM services ORDER BY status DESC, name ASC').all();
    const summary = {
        total: services.length,
        healthy: services.filter(s => s.status === 'healthy').length,
        degraded: services.filter(s => s.status === 'degraded').length,
        warning: services.filter(s => s.status === 'warning').length,
        down: services.filter(s => s.status === 'down').length,
    };
    res.json({ services, summary });
});

router.get('/:id', (req, res) => {
    const db = getDb();
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const alerts = db.prepare('SELECT * FROM alerts WHERE service_id = ? ORDER BY created_at DESC LIMIT 10').all(req.params.id);
    const configs = db.prepare('SELECT * FROM configs WHERE service_id = ? ORDER BY config_key').all(req.params.id);
    const incidents = db.prepare('SELECT * FROM incidents WHERE service_id = ? ORDER BY created_at DESC LIMIT 5').all(req.params.id);

    res.json({ service, alerts, configs, incidents });
});

router.patch('/:id/status', (req, res) => {
    const db = getDb();
    const { status } = req.body;
    db.prepare('UPDATE services SET status = ?, last_check = datetime("now") WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
});

export default router;
