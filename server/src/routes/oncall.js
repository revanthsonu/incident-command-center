import express from 'express';
import { getDb } from '../db/schema.js';

const router = express.Router();

router.get('/', (req, res) => {
    const db = getDb();
    const schedule = db.prepare('SELECT * FROM oncall_schedule ORDER BY start_date ASC').all();

    const today = new Date().toISOString().split('T')[0];
    const current = schedule.filter(s => s.start_date <= today && s.end_date > today);
    const upcoming = schedule.filter(s => s.start_date > today);
    const past = schedule.filter(s => s.end_date <= today);

    res.json({ current, upcoming, past, all: schedule });
});

export default router;
