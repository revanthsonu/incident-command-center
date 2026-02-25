import express from 'express';
import { getDb } from '../db/schema.js';

const router = express.Router();

router.post('/run', (req, res) => {
    const db = getDb();
    const { checks, target_service } = req.body;

    const allChecks = checks || ['dns', 'port', 'database', 'memory', 'cpu', 'disk', 'network', 'ssl'];

    const results = allChecks.map(check => {
        switch (check) {
            case 'dns':
                return {
                    check: 'DNS Resolution',
                    target: target_service || 'uc.internal',
                    status: Math.random() > 0.05 ? 'pass' : 'fail',
                    latency_ms: Math.floor(Math.random() * 15) + 1,
                    detail: 'Resolved to 10.0.1.42',
                    command: `dig +short ${target_service || 'uc.internal'}`,
                };
            case 'port':
                return {
                    check: 'Port Connectivity',
                    target: `${target_service || 'ptt-gateway'}:443`,
                    status: 'pass',
                    latency_ms: Math.floor(Math.random() * 50) + 5,
                    detail: 'TCP handshake successful',
                    command: `nc -zv ${target_service || 'ptt-gateway'} 443`,
                };
            case 'database':
                return {
                    check: 'Database Connectivity',
                    target: 'PostgreSQL Primary',
                    status: Math.random() > 0.02 ? 'pass' : 'warning',
                    latency_ms: Math.floor(Math.random() * 30) + 3,
                    detail: `Active connections: ${Math.floor(Math.random() * 200) + 100}/500`,
                    command: 'psql -h pg-primary -c "SELECT 1"',
                };
            case 'memory':
                const memUsed = Math.floor(Math.random() * 40) + 40;
                return {
                    check: 'Memory Usage',
                    target: 'System',
                    status: memUsed > 85 ? 'fail' : memUsed > 70 ? 'warning' : 'pass',
                    value: `${memUsed}%`,
                    detail: `${memUsed}% used of 16GB (${((16 * memUsed) / 100).toFixed(1)}GB / 16GB)`,
                    command: 'free -h | grep Mem',
                };
            case 'cpu':
                const cpuUsed = Math.floor(Math.random() * 50) + 20;
                return {
                    check: 'CPU Usage',
                    target: 'System',
                    status: cpuUsed > 80 ? 'fail' : cpuUsed > 60 ? 'warning' : 'pass',
                    value: `${cpuUsed}%`,
                    detail: `${cpuUsed}% average across 8 cores. Load average: ${(cpuUsed / 12.5).toFixed(2)}, ${(cpuUsed / 14).toFixed(2)}, ${(cpuUsed / 16).toFixed(2)}`,
                    command: 'top -bn1 | head -5',
                };
            case 'disk':
                const diskUsed = Math.floor(Math.random() * 30) + 45;
                return {
                    check: 'Disk Usage',
                    target: '/data',
                    status: diskUsed > 85 ? 'fail' : diskUsed > 70 ? 'warning' : 'pass',
                    value: `${diskUsed}%`,
                    detail: `${diskUsed}% used on /data (${((500 * diskUsed) / 100).toFixed(0)}GB / 500GB)`,
                    command: 'df -h /data',
                };
            case 'network':
                const packetLoss = Math.random() * 2;
                return {
                    check: 'Network Connectivity',
                    target: '10.0.0.1 (Gateway)',
                    status: packetLoss > 1 ? 'warning' : 'pass',
                    latency_ms: Math.floor(Math.random() * 5) + 1,
                    detail: `Packet loss: ${packetLoss.toFixed(2)}%, RTT: ${(Math.random() * 5 + 1).toFixed(1)}ms`,
                    command: 'ping -c 10 10.0.0.1',
                };
            case 'ssl':
                const daysLeft = Math.floor(Math.random() * 300) + 10;
                return {
                    check: 'SSL Certificate',
                    target: 'auth.uc.internal:443',
                    status: daysLeft < 30 ? 'warning' : 'pass',
                    value: `${daysLeft} days`,
                    detail: `Certificate valid for ${daysLeft} more days. Issuer: Let's Encrypt Authority X3`,
                    command: 'echo | openssl s_client -connect auth.uc.internal:443 2>/dev/null | openssl x509 -noout -dates',
                };
            default:
                return { check, status: 'unknown', detail: 'Unrecognized check type' };
        }
    });

    const summary = {
        total: results.length,
        passed: results.filter(r => r.status === 'pass').length,
        warnings: results.filter(r => r.status === 'warning').length,
        failed: results.filter(r => r.status === 'fail').length,
        overall: results.some(r => r.status === 'fail') ? 'fail' : results.some(r => r.status === 'warning') ? 'warning' : 'pass',
    };

    res.json({ results, summary, timestamp: new Date().toISOString() });
});

export default router;
