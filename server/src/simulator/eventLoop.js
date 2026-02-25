import { getDb } from '../db/schema.js';

const EVENT_INTERVAL = 30000; // 30 seconds

const alertTemplates = [
    { type: 'resource', severity: 'warning', msg: (svc) => `${svc}: Memory usage elevated` },
    { type: 'performance', severity: 'medium', msg: (svc) => `${svc}: P99 latency spike detected` },
    { type: 'connectivity', severity: 'low', msg: (svc) => `${svc}: Connection pool utilization > 80%` },
    { type: 'performance', severity: 'medium', msg: (svc) => `${svc}: Request queue depth increasing` },
    { type: 'resource', severity: 'low', msg: (svc) => `${svc}: Disk I/O latency above baseline` },
];

export function startEventLoop() {
    console.log('🔄 Event simulator started (interval: 30s)');

    setInterval(() => {
        try {
            const db = getDb();

            // Randomly fluctuate service metrics
            const services = db.prepare('SELECT id, name, cpu_usage, memory_usage, request_rate, error_rate FROM services').all();

            for (const svc of services) {
                const cpuDelta = (Math.random() - 0.5) * 10;
                const memDelta = (Math.random() - 0.5) * 5;
                const reqDelta = Math.floor((Math.random() - 0.5) * 500);

                const newCpu = Math.max(5, Math.min(95, svc.cpu_usage + cpuDelta));
                const newMem = Math.max(10, Math.min(95, svc.memory_usage + memDelta));
                const newReq = Math.max(100, svc.request_rate + reqDelta);

                let status = 'healthy';
                if (newCpu > 85 || newMem > 90) status = 'degraded';
                else if (newCpu > 70 || newMem > 80) status = 'warning';

                db.prepare(
                    'UPDATE services SET cpu_usage = ?, memory_usage = ?, request_rate = ?, status = ?, last_check = datetime("now") WHERE id = ?'
                ).run(Math.round(newCpu * 10) / 10, Math.round(newMem * 10) / 10, newReq, status, svc.id);
            }

            // Occasionally generate an alert (20% chance per cycle)
            if (Math.random() < 0.2) {
                const randomSvc = services[Math.floor(Math.random() * services.length)];
                const template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];

                db.prepare(
                    'INSERT INTO alerts (service_id, type, severity, message) VALUES (?, ?, ?, ?)'
                ).run(randomSvc.id, template.type, template.severity, template.msg(randomSvc.name));
            }
        } catch (err) {
            // Silently continue
        }
    }, EVENT_INTERVAL);
}
