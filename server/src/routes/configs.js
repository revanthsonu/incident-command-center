import express from 'express';
import { getDb } from '../db/schema.js';

const router = express.Router();

router.get('/:serviceId', (req, res) => {
    const db = getDb();
    const configs = db.prepare('SELECT * FROM configs WHERE service_id = ? ORDER BY config_key').all(req.params.serviceId);
    const service = db.prepare('SELECT name FROM services WHERE id = ?').get(req.params.serviceId);
    res.json({ service_name: service?.name, configs });
});

router.put('/:serviceId', (req, res) => {
    const db = getDb();
    const { config_key, config_value, changed_by } = req.body;

    const existing = db.prepare('SELECT * FROM configs WHERE service_id = ? AND config_key = ?').get(req.params.serviceId, config_key);

    if (existing) {
        const newVersion = existing.version + 1;
        db.prepare('INSERT INTO config_history (config_id, old_value, new_value, version, changed_by) VALUES (?, ?, ?, ?, ?)')
            .run(existing.id, existing.config_value, config_value, newVersion, changed_by || 'operator');
        db.prepare('UPDATE configs SET config_value = ?, version = ?, updated_by = ?, updated_at = datetime("now") WHERE id = ?')
            .run(config_value, newVersion, changed_by || 'operator', existing.id);
        res.json({ success: true, version: newVersion });
    } else {
        const info = db.prepare('INSERT INTO configs (service_id, config_key, config_value, updated_by) VALUES (?, ?, ?, ?)')
            .run(req.params.serviceId, config_key, config_value, changed_by || 'operator');
        res.status(201).json({ success: true, id: info.lastInsertRowid });
    }
});

router.get('/:serviceId/history', (req, res) => {
    const db = getDb();
    const history = db.prepare(`
    SELECT ch.*, c.config_key FROM config_history ch
    JOIN configs c ON ch.config_id = c.id
    WHERE c.service_id = ?
    ORDER BY ch.changed_at DESC LIMIT 20
  `).all(req.params.serviceId);
    res.json({ history });
});

export default router;
