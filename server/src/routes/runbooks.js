import express from 'express';
import { getDb } from '../db/schema.js';

const router = express.Router();

router.get('/', (req, res) => {
    const db = getDb();
    const { category } = req.query;
    let query = 'SELECT * FROM runbooks';
    const params = [];
    if (category) { query += ' WHERE category = ?'; params.push(category); }
    query += ' ORDER BY execution_count DESC';
    const runbooks = db.prepare(query).all(...params);

    // Parse steps JSON
    const parsed = runbooks.map(rb => ({ ...rb, steps: JSON.parse(rb.steps) }));

    const categories = [...new Set(runbooks.map(r => r.category))];
    res.json({ runbooks: parsed, categories });
});

router.get('/:id', (req, res) => {
    const db = getDb();
    const runbook = db.prepare('SELECT * FROM runbooks WHERE id = ?').get(req.params.id);
    if (!runbook) return res.status(404).json({ error: 'Runbook not found' });
    runbook.steps = JSON.parse(runbook.steps);
    res.json({ runbook });
});

router.post('/:id/execute', (req, res) => {
    const db = getDb();
    const runbook = db.prepare('SELECT * FROM runbooks WHERE id = ?').get(req.params.id);
    if (!runbook) return res.status(404).json({ error: 'Runbook not found' });

    const steps = JSON.parse(runbook.steps);

    // Simulate execution results
    const results = steps.map((step, i) => {
        const success = Math.random() > 0.1; // 90% success rate
        const duration = Math.floor(Math.random() * 5000) + 500;
        return {
            ...step,
            status: success ? 'success' : 'warning',
            output: success ? step.expected : `Warning: partial result — ${step.expected}`,
            duration_ms: duration,
        };
    });

    db.prepare('UPDATE runbooks SET last_executed = datetime("now"), execution_count = execution_count + 1 WHERE id = ?')
        .run(req.params.id);

    res.json({ runbook_id: runbook.id, title: runbook.title, results });
});

export default router;
