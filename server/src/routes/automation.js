import express from 'express';
import { getDb } from '../db/schema.js';

const router = express.Router();

router.get('/', (req, res) => {
    const db = getDb();
    const scripts = db.prepare('SELECT * FROM automation_scripts ORDER BY run_count DESC').all();
    res.json({ scripts });
});

router.post('/:id/run', (req, res) => {
    const db = getDb();
    const { target_service, triggered_by } = req.body;

    const script = db.prepare('SELECT * FROM automation_scripts WHERE id = ?').get(req.params.id);
    if (!script) return res.status(404).json({ error: 'Script not found' });

    // Simulate execution
    const duration = Math.floor(Math.random() * (script.avg_duration_ms * 1.5)) + 500;
    const success = Math.random() > 0.08;

    const output = generateOutput(script, target_service, success);

    db.prepare(
        'INSERT INTO automation_logs (script_id, status, output, duration_ms, triggered_by) VALUES (?, ?, ?, ?, ?)'
    ).run(script.id, success ? 'success' : 'failed', output, duration, triggered_by || 'manual');

    db.prepare('UPDATE automation_scripts SET last_run = datetime("now"), run_count = run_count + 1, status = "idle" WHERE id = ?')
        .run(script.id);

    res.json({
        script_id: script.id,
        name: script.name,
        status: success ? 'success' : 'failed',
        output,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
    });
});

router.get('/:id/logs', (req, res) => {
    const db = getDb();
    const logs = db.prepare('SELECT * FROM automation_logs WHERE script_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
    res.json({ logs });
});

function generateOutput(script, target, success) {
    const svc = target || 'ptt-gateway';
    const outputs = {
        'restart': success
            ? `[✓] Rolling restart initiated for ${svc}\n[✓] Pod ${svc}-7f8b9c-xk2p1 terminated\n[✓] Pod ${svc}-7f8b9c-mn4q2 started\n[✓] Health check passed\n[✓] Rollout completed successfully (0 downtime)`
            : `[✓] Rolling restart initiated for ${svc}\n[✗] Pod ${svc}-7f8b9c-mn4q2 failed readiness probe\n[!] Rollback triggered`,
        'cache': success
            ? `[✓] Connecting to ${svc} nodes...\n[✓] Node 1: Cache flushed (2.4GB freed)\n[✓] Node 2: Cache flushed (1.8GB freed)\n[✓] Node 3: Cache flushed (2.1GB freed)\n[✓] Total: 6.3GB memory reclaimed`
            : `[✓] Connecting to ${svc} nodes...\n[✗] Node 2: Connection refused\n[!] Partial flush — 2/3 nodes completed`,
        'maintenance': success
            ? `[✓] Rotating logs for ${svc}\n[✓] Compressed 12 log files (340MB → 45MB)\n[✓] Uploaded to s3://uc-logs/20260224/\n[✓] Old logs cleaned up`
            : `[✓] Rotating logs for ${svc}\n[✗] S3 upload failed: AccessDenied\n[!] Logs rotated locally but not archived`,
        'scaling': success
            ? `[✓] Current replicas: 3\n[✓] Scaling to 5 replicas...\n[✓] Pod ${svc}-deploy-abc12 Running\n[✓] Pod ${svc}-deploy-def34 Running\n[✓] All pods healthy. New replica count: 5`
            : `[✓] Current replicas: 3\n[✗] Insufficient resources: CPU limit exceeded\n[!] Scale operation aborted`,
        'database': success
            ? `[✓] Connecting to PostgreSQL primary...\n[✓] VACUUM ANALYZE started\n[✓] Table users: 15,234 rows, 342 dead tuples removed\n[✓] Table sessions: 89,102 rows, 12,450 dead tuples removed\n[✓] VACUUM completed in 2m 34s`
            : `[✓] Connecting to PostgreSQL primary...\n[✗] Lock timeout: unable to acquire AccessExclusiveLock\n[!] VACUUM aborted — retry during maintenance window`,
        'security': success
            ? `[✓] Checking certificates...\n  auth.uc.internal — expires 2026-08-15 ✓\n  ptt.uc.internal — expires 2026-07-22 ✓\n  sip.uc.internal — expires 2026-09-01 ✓\n[✓] All 12 certificates valid`
            : `[✗] sip.uc.internal — expires in 5 days ⚠️\n[!] 1 certificate requires immediate renewal`,
        'networking': success
            ? `[✓] Flushing DNS cache across fleet...\n[✓] Node us-east-1a: flushed\n[✓] Node us-west-2b: flushed\n[✓] Node eu-west-1a: flushed\n[✓] All 8 nodes cleared`
            : `[✓] Flushing DNS cache...\n[✗] Node eu-west-1a: SSH connection timeout\n[!] 7/8 nodes flushed`,
        'reporting': success
            ? `[✓] Gathering system metrics...\n[✓] Querying 12 services...\n[✓] Generating HTML report...\n[✓] Report saved: /tmp/system-report-20260224.html\n[✓] Size: 2.4MB with 24 charts`
            : `[✓] Gathering system metrics...\n[✗] Elasticsearch timeout: metrics incomplete\n[!] Partial report generated`,
        'backup': success
            ? `[✓] Creating etcd snapshot...\n[✓] Snapshot: etcd-1740441600.snap (85MB)\n[✓] Uploading to s3://uc-config-backups/\n[✓] Upload complete. Checksum verified.`
            : `[✓] Creating etcd snapshot...\n[✗] S3 bucket policy error\n[!] Snapshot saved locally: /tmp/etcd-backup.snap`,
    };
    return outputs[script.type] || (success ? '[✓] Execution completed successfully' : '[✗] Execution failed');
}

export default router;
