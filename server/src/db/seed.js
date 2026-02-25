import { getDb, initSchema } from './schema.js';

const db = getDb();
initSchema(db);

// Clear existing data
db.exec(`
  DELETE FROM automation_logs;
  DELETE FROM config_history;
  DELETE FROM incident_timeline;
  DELETE FROM alerts;
  DELETE FROM incidents;
  DELETE FROM configs;
  DELETE FROM runbooks;
  DELETE FROM automation_scripts;
  DELETE FROM oncall_schedule;
  DELETE FROM services;
`);

// ─── SERVICES ───────────────────────────────────────────────
const insertService = db.prepare(`
  INSERT INTO services (name, type, region, status, uptime_percent, cpu_usage, memory_usage, request_rate, error_rate, latency_p99)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const services = [
    ['PTT Gateway', 'gateway', 'us-east-1', 'healthy', 99.97, 34, 52, 12400, 0.02, 45],
    ['SIP Proxy Cluster', 'proxy', 'us-west-2', 'healthy', 99.99, 28, 41, 8900, 0.01, 32],
    ['UC Media Server', 'media', 'eu-west-1', 'degraded', 98.50, 78, 85, 6200, 1.20, 180],
    ['Voice Routing Engine', 'core', 'us-east-1', 'healthy', 99.95, 45, 63, 15600, 0.05, 55],
    ['Presence Service', 'api', 'ap-south-1', 'healthy', 99.92, 22, 38, 4300, 0.03, 28],
    ['Auth & Identity', 'auth', 'us-east-1', 'healthy', 99.99, 15, 30, 9800, 0.00, 18],
    ['Push Notification Hub', 'messaging', 'eu-central-1', 'healthy', 99.88, 40, 55, 7100, 0.08, 65],
    ['CDN Edge Cache', 'cdn', 'global', 'healthy', 99.99, 12, 25, 45000, 0.01, 8],
    ['PostgreSQL Primary', 'database', 'us-east-1', 'healthy', 99.96, 55, 70, 3200, 0.04, 42],
    ['Redis Session Store', 'cache', 'us-east-1', 'warning', 99.80, 62, 88, 28000, 0.10, 12],
    ['Kafka Event Bus', 'streaming', 'us-east-1', 'healthy', 99.94, 48, 60, 18000, 0.03, 22],
    ['Elasticsearch Logs', 'search', 'us-west-2', 'healthy', 99.91, 52, 65, 5400, 0.06, 95],
];

const svcIds = {};
for (const s of services) {
    const info = insertService.run(...s);
    svcIds[s[0]] = info.lastInsertRowid;
}

console.log(`✅ Seeded ${services.length} services`);

// ─── INCIDENTS ──────────────────────────────────────────────
const insertIncident = db.prepare(`
  INSERT INTO incidents (title, description, severity, status, service_id, assignee, created_at, resolved_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertTimeline = db.prepare(`
  INSERT INTO incident_timeline (incident_id, action, detail, actor, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

const now = new Date();
const ago = (h) => new Date(now - h * 3600000).toISOString();

const incidents = [
    {
        title: 'UC Media Server high memory — transcoding backlog',
        desc: 'Memory usage spiked to 92% on eu-west-1 media server. Transcoding queue backed up to 2400 items. Video calls dropping frames.',
        severity: 'critical', status: 'investigating', svc: 'UC Media Server', assignee: 'Sarah Chen',
        created: ago(2), resolved: null,
        timeline: [
            { action: 'created', detail: 'Alert triggered: memory > 90%', actor: 'monitoring', t: ago(2) },
            { action: 'acknowledged', detail: 'On-call engineer paged', actor: 'PagerDuty', t: ago(1.9) },
            { action: 'investigating', detail: 'Checking transcoding queue depth', actor: 'Sarah Chen', t: ago(1.5) },
        ]
    },
    {
        title: 'Redis Session Store eviction rate elevated',
        desc: 'Session store memory at 88%. LRU evictions increasing. Risk of session drops for active PTT users.',
        severity: 'high', status: 'identified', svc: 'Redis Session Store', assignee: 'Mike Torres',
        created: ago(5), resolved: null,
        timeline: [
            { action: 'created', detail: 'Memory usage alert > 85%', actor: 'monitoring', t: ago(5) },
            { action: 'investigating', detail: 'Analyzing key distribution', actor: 'Mike Torres', t: ago(4.5) },
            { action: 'identified', detail: 'Stale PTT session keys not expiring — TTL misconfigured', actor: 'Mike Torres', t: ago(3) },
        ]
    },
    {
        title: 'SIP Proxy 503 errors in ap-south-1',
        desc: 'Intermittent 503 responses on SIP registration endpoint. Affecting ~3% of users in India region.',
        severity: 'high', status: 'resolved', svc: 'SIP Proxy Cluster', assignee: 'Priya Patel',
        created: ago(48), resolved: ago(44),
        timeline: [
            { action: 'created', detail: 'Error rate spike detected', actor: 'monitoring', t: ago(48) },
            { action: 'investigating', detail: 'Tracing SIP REGISTER failures', actor: 'Priya Patel', t: ago(47) },
            { action: 'identified', detail: 'Connection pool exhausted on replica set 3', actor: 'Priya Patel', t: ago(46) },
            { action: 'monitoring', detail: 'Pool size increased from 50 to 200, monitoring', actor: 'Priya Patel', t: ago(45) },
            { action: 'resolved', detail: 'Error rate back to baseline, pool resize effective', actor: 'Priya Patel', t: ago(44) },
        ]
    },
    {
        title: 'CDN cache invalidation delay — stale configs served',
        desc: 'Config push to CDN edge nodes delayed by 45 min. Some clients received stale SRTP key material.',
        severity: 'medium', status: 'resolved', svc: 'CDN Edge Cache', assignee: 'Alex Kim',
        created: ago(120), resolved: ago(118),
        timeline: [
            { action: 'created', detail: 'Customer reported stale config', actor: 'CMSO', t: ago(120) },
            { action: 'investigating', detail: 'Checking CDN propagation logs', actor: 'Alex Kim', t: ago(119.5) },
            { action: 'identified', detail: 'Purge API rate-limited by CDN provider', actor: 'Alex Kim', t: ago(119) },
            { action: 'resolved', detail: 'Switched to tag-based invalidation, propagation now < 2min', actor: 'Alex Kim', t: ago(118) },
        ]
    },
    {
        title: 'Kafka consumer lag on PTT event topic',
        desc: 'Consumer group ptt-analytics lagging by 50K messages. Dashboard metrics delayed.',
        severity: 'low', status: 'monitoring', svc: 'Kafka Event Bus', assignee: 'Jordan Lee',
        created: ago(8), resolved: null,
        timeline: [
            { action: 'created', detail: 'Consumer lag alert > 10K', actor: 'monitoring', t: ago(8) },
            { action: 'investigating', detail: 'Checking consumer throughput', actor: 'Jordan Lee', t: ago(7) },
            { action: 'identified', detail: 'Single slow partition due to large audit events', actor: 'Jordan Lee', t: ago(6) },
            { action: 'monitoring', detail: 'Added parallel consumer, lag reducing', actor: 'Jordan Lee', t: ago(4) },
        ]
    },
    {
        title: 'Auth service certificate expiring in 72 hours',
        desc: 'TLS certificate for auth.uc.internal expiring 2026-02-27. Auto-renewal failed due to DNS challenge timeout.',
        severity: 'medium', status: 'investigating', svc: 'Auth & Identity', assignee: 'Sarah Chen',
        created: ago(12), resolved: null,
        timeline: [
            { action: 'created', detail: 'Cert expiry warning < 72h', actor: 'cert-manager', t: ago(12) },
            { action: 'investigating', detail: 'Checking ACME DNS challenge logs', actor: 'Sarah Chen', t: ago(11) },
        ]
    },
    {
        title: 'PostgreSQL replication lag spike',
        desc: 'Read replica lag spiked to 45s during bulk analytics export. Some read queries serving stale data.',
        severity: 'medium', status: 'resolved', svc: 'PostgreSQL Primary', assignee: 'Mike Torres',
        created: ago(72), resolved: ago(70),
        timeline: [
            { action: 'created', detail: 'Replication lag > 30s', actor: 'monitoring', t: ago(72) },
            { action: 'identified', detail: 'Bulk COPY operation saturating WAL sender', actor: 'Mike Torres', t: ago(71.5) },
            { action: 'resolved', detail: 'Rescheduled export to off-peak window, added rate limiting', actor: 'Mike Torres', t: ago(70) },
        ]
    },
];

for (const inc of incidents) {
    const info = insertIncident.run(
        inc.title, inc.desc, inc.severity, inc.status,
        svcIds[inc.svc], inc.assignee, inc.created, inc.resolved
    );
    for (const tl of inc.timeline) {
        insertTimeline.run(info.lastInsertRowid, tl.action, tl.detail, tl.actor, tl.t);
    }
}
console.log(`✅ Seeded ${incidents.length} incidents with timelines`);

// ─── ALERTS ─────────────────────────────────────────────────
const insertAlert = db.prepare(`
  INSERT INTO alerts (service_id, type, severity, message, acknowledged, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const alerts = [
    [svcIds['UC Media Server'], 'resource', 'critical', 'Memory usage at 92% — transcoding backlog', 0, ago(2)],
    [svcIds['UC Media Server'], 'performance', 'critical', 'P99 latency 180ms (threshold: 100ms)', 0, ago(1.8)],
    [svcIds['UC Media Server'], 'resource', 'high', 'CPU usage at 78% and climbing', 0, ago(1.5)],
    [svcIds['Redis Session Store'], 'resource', 'high', 'Memory at 88% — LRU evictions active', 0, ago(5)],
    [svcIds['Redis Session Store'], 'performance', 'medium', 'Key eviction rate: 450/min (baseline: 20/min)', 0, ago(4.5)],
    [svcIds['Kafka Event Bus'], 'performance', 'medium', 'Consumer lag on ptt-analytics: 50K messages', 0, ago(8)],
    [svcIds['Auth & Identity'], 'security', 'high', 'TLS certificate expiring in 72 hours', 0, ago(12)],
    [svcIds['PTT Gateway'], 'performance', 'low', 'Request rate 12.4K/s — approaching capacity', 1, ago(24)],
    [svcIds['Voice Routing Engine'], 'connectivity', 'low', 'DNS resolution latency spike to 15ms (baseline: 2ms)', 1, ago(36)],
    [svcIds['Presence Service'], 'performance', 'low', 'WebSocket reconnection rate elevated: 2.1%', 1, ago(48)],
    [svcIds['PostgreSQL Primary'], 'resource', 'medium', 'WAL directory growing — consider archiving', 1, ago(72)],
    [svcIds['Push Notification Hub'], 'delivery', 'medium', 'APNs delivery failure rate: 0.8% (threshold: 0.5%)', 0, ago(6)],
    [svcIds['Elasticsearch Logs'], 'resource', 'low', 'Disk usage at 72% on data nodes', 1, ago(96)],
    [svcIds['CDN Edge Cache'], 'performance', 'low', 'Cache miss ratio 8.2% (target: < 5%)', 1, ago(120)],
    [svcIds['SIP Proxy Cluster'], 'connectivity', 'medium', 'Keepalive timeout rate: 0.3% on us-west-2', 0, ago(3)],
];

for (const a of alerts) insertAlert.run(...a);
console.log(`✅ Seeded ${alerts.length} alerts`);

// ─── CONFIGS ────────────────────────────────────────────────
const insertConfig = db.prepare(`
  INSERT INTO configs (service_id, config_key, config_value, version, updated_by)
  VALUES (?, ?, ?, ?, ?)
`);

const configs = [
    [svcIds['PTT Gateway'], 'MAX_CONNECTIONS', '10000', 3, 'ops-team'],
    [svcIds['PTT Gateway'], 'SESSION_TIMEOUT_MS', '30000', 2, 'ops-team'],
    [svcIds['PTT Gateway'], 'ENABLE_COMPRESSION', 'true', 1, 'system'],
    [svcIds['PTT Gateway'], 'LOG_LEVEL', 'info', 5, 'Sarah Chen'],
    [svcIds['SIP Proxy Cluster'], 'CONNECTION_POOL_SIZE', '200', 3, 'Priya Patel'],
    [svcIds['SIP Proxy Cluster'], 'SIP_REGISTER_TIMEOUT', '5000', 1, 'system'],
    [svcIds['SIP Proxy Cluster'], 'ENABLE_TLS_1_3', 'true', 2, 'security-team'],
    [svcIds['UC Media Server'], 'MAX_TRANSCODING_JOBS', '50', 2, 'ops-team'],
    [svcIds['UC Media Server'], 'VIDEO_BITRATE_LIMIT', '4096', 1, 'system'],
    [svcIds['UC Media Server'], 'CODEC_PRIORITY', 'opus,g722,g711', 1, 'system'],
    [svcIds['Voice Routing Engine'], 'ROUTING_ALGORITHM', 'least-cost', 3, 'ops-team'],
    [svcIds['Voice Routing Engine'], 'FAILOVER_THRESHOLD_MS', '500', 2, 'ops-team'],
    [svcIds['Auth & Identity'], 'TOKEN_EXPIRY_HOURS', '24', 1, 'security-team'],
    [svcIds['Auth & Identity'], 'MFA_ENABLED', 'true', 2, 'security-team'],
    [svcIds['Auth & Identity'], 'PASSWORD_POLICY', 'strong', 1, 'system'],
    [svcIds['Redis Session Store'], 'MAX_MEMORY_MB', '4096', 3, 'Mike Torres'],
    [svcIds['Redis Session Store'], 'EVICTION_POLICY', 'allkeys-lru', 2, 'Mike Torres'],
    [svcIds['Redis Session Store'], 'SESSION_TTL_SECONDS', '86400', 4, 'ops-team'],
    [svcIds['PostgreSQL Primary'], 'MAX_CONNECTIONS', '500', 2, 'dba-team'],
    [svcIds['PostgreSQL Primary'], 'SHARED_BUFFERS_MB', '2048', 1, 'system'],
    [svcIds['PostgreSQL Primary'], 'WAL_LEVEL', 'replica', 1, 'system'],
    [svcIds['Kafka Event Bus'], 'NUM_PARTITIONS', '12', 2, 'ops-team'],
    [svcIds['Kafka Event Bus'], 'RETENTION_HOURS', '168', 1, 'system'],
    [svcIds['CDN Edge Cache'], 'CACHE_TTL_SECONDS', '3600', 3, 'ops-team'],
    [svcIds['CDN Edge Cache'], 'PURGE_BATCH_SIZE', '1000', 2, 'Alex Kim'],
];

for (const c of configs) insertConfig.run(...c);
console.log(`✅ Seeded ${configs.length} configuration entries`);

// ─── RUNBOOKS ───────────────────────────────────────────────
const insertRunbook = db.prepare(`
  INSERT INTO runbooks (title, category, description, steps, severity, estimated_time, execution_count)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const runbooks = [
    {
        title: 'High Memory — Media Server Recovery',
        category: 'incident-response',
        desc: 'Steps to recover from high memory usage on UC Media Server nodes',
        severity: 'critical',
        time: '10 min',
        count: 12,
        steps: [
            { step: 1, action: 'Check current memory usage', command: 'ssh media-srv01 "free -h && top -bn1 | head -20"', expected: 'Identify memory-consuming processes' },
            { step: 2, action: 'Check transcoding queue depth', command: 'curl -s http://media-srv01:9090/metrics | grep transcode_queue', expected: 'Queue should be < 100 items' },
            { step: 3, action: 'Drain transcoding queue', command: 'kubectl scale deployment media-transcoder --replicas=0 && sleep 10 && kubectl scale deployment media-transcoder --replicas=3', expected: 'Queue drains within 2 minutes' },
            { step: 4, action: 'Force garbage collection', command: 'curl -X POST http://media-srv01:9090/admin/gc', expected: 'Memory drops by 20-30%' },
            { step: 5, action: 'Verify recovery', command: 'watch -n5 "curl -s http://media-srv01:9090/health"', expected: 'Memory < 70%, latency < 100ms' },
        ]
    },
    {
        title: 'Redis Session Store — Eviction Mitigation',
        category: 'incident-response',
        desc: 'Handle elevated eviction rates on Redis session store',
        severity: 'high',
        time: '15 min',
        count: 8,
        steps: [
            { step: 1, action: 'Check memory stats', command: 'redis-cli -h redis-session INFO memory', expected: 'Identify used_memory vs maxmemory' },
            { step: 2, action: 'Identify large keys', command: 'redis-cli -h redis-session --bigkeys', expected: 'Find keys consuming disproportionate memory' },
            { step: 3, action: 'Check TTL distribution', command: 'redis-cli -h redis-session DEBUG OBJECT $(redis-cli -h redis-session RANDOMKEY)', expected: 'Verify TTLs are set correctly' },
            { step: 4, action: 'Purge expired sessions manually', command: 'redis-cli -h redis-session SCAN 0 MATCH "ptt:session:*" COUNT 1000', expected: 'Remove sessions with no TTL' },
            { step: 5, action: 'Increase maxmemory if needed', command: 'redis-cli -h redis-session CONFIG SET maxmemory 6gb', expected: 'Evictions should stop immediately' },
        ]
    },
    {
        title: 'SIP Proxy — 503 Error Investigation',
        category: 'troubleshooting',
        desc: 'Diagnose and resolve SIP 503 Service Unavailable errors',
        severity: 'high',
        time: '20 min',
        count: 5,
        steps: [
            { step: 1, action: 'Check SIP proxy health', command: 'curl -I https://sip-proxy.uc.internal/health', expected: 'HTTP 200 with healthy status' },
            { step: 2, action: 'Check connection pool', command: 'ss -s && ss -tnp | grep ":5060" | wc -l', expected: 'Active connections < pool limit' },
            { step: 3, action: 'Review error logs', command: 'journalctl -u sip-proxy --since "1 hour ago" | grep "503\\|error\\|timeout"', expected: 'Identify root cause pattern' },
            { step: 4, action: 'Test upstream connectivity', command: 'for host in backend-{1..4}; do curl -w "%{time_total}\\n" -o /dev/null -s http://$host:8080/health; done', expected: 'All backends respond < 500ms' },
            { step: 5, action: 'Restart affected pods if needed', command: 'kubectl rollout restart deployment sip-proxy -n uc-prod', expected: 'New pods come up healthy' },
        ]
    },
    {
        title: 'TLS Certificate Renewal',
        category: 'maintenance',
        desc: 'Renew TLS certificates using ACME/Let\'s Encrypt',
        severity: 'medium',
        time: '10 min',
        count: 15,
        steps: [
            { step: 1, action: 'Check current certificate expiry', command: 'echo | openssl s_client -connect auth.uc.internal:443 2>/dev/null | openssl x509 -noout -dates', expected: 'Identify expiry date' },
            { step: 2, action: 'Verify DNS challenge records', command: 'dig TXT _acme-challenge.auth.uc.internal +short', expected: 'Challenge record should exist' },
            { step: 3, action: 'Trigger manual renewal', command: 'certbot renew --cert-name auth.uc.internal --force-renewal', expected: 'Certificate renewed successfully' },
            { step: 4, action: 'Reload TLS config', command: 'nginx -t && systemctl reload nginx', expected: 'Nginx config valid, reload successful' },
            { step: 5, action: 'Verify new certificate', command: 'curl -vI https://auth.uc.internal 2>&1 | grep -E "expire|subject"', expected: 'New expiry date > 60 days out' },
        ]
    },
    {
        title: 'Database Replication Lag Troubleshooting',
        category: 'troubleshooting',
        desc: 'Diagnose and resolve PostgreSQL replication lag issues',
        severity: 'medium',
        time: '15 min',
        count: 6,
        steps: [
            { step: 1, action: 'Check replication status', command: 'psql -h pg-primary -c "SELECT client_addr, state, sent_lsn, write_lsn, replay_lsn, replay_lag FROM pg_stat_replication;"', expected: 'Identify lagging replicas' },
            { step: 2, action: 'Check WAL generation rate', command: 'psql -h pg-primary -c "SELECT pg_current_wal_lsn(), pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) as lag_bytes FROM pg_stat_replication;"', expected: 'Lag bytes should be < 100MB' },
            { step: 3, action: 'Identify long-running queries on replica', command: 'psql -h pg-replica -c "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state != \'idle\' ORDER BY duration DESC LIMIT 10;"', expected: 'No queries running > 60s' },
            { step: 4, action: 'Check for conflicting queries', command: 'psql -h pg-replica -c "SELECT * FROM pg_stat_database_conflicts WHERE datname = \'ucdb\';"', expected: 'Minimal conflicts' },
        ]
    },
    {
        title: 'Kafka Consumer Lag Recovery',
        category: 'incident-response',
        desc: 'Steps to resolve high consumer lag on Kafka topics',
        severity: 'medium',
        time: '10 min',
        count: 4,
        steps: [
            { step: 1, action: 'Check consumer group lag', command: 'kafka-consumer-groups --bootstrap-server kafka:9092 --describe --group ptt-analytics', expected: 'Identify lagging partitions' },
            { step: 2, action: 'Check consumer health', command: 'kafka-consumer-groups --bootstrap-server kafka:9092 --describe --group ptt-analytics --state', expected: 'All consumers should be active' },
            { step: 3, action: 'Scale consumers', command: 'kubectl scale deployment ptt-analytics-consumer --replicas=6', expected: 'More consumers join the group' },
            { step: 4, action: 'Monitor lag reduction', command: 'watch -n10 "kafka-consumer-groups --bootstrap-server kafka:9092 --describe --group ptt-analytics 2>/dev/null | tail -5"', expected: 'Lag should decrease steadily' },
        ]
    },
    {
        title: 'CDN Cache Purge & Warm',
        category: 'maintenance',
        desc: 'Purge stale CDN cache and warm critical paths',
        severity: 'low',
        time: '5 min',
        count: 20,
        steps: [
            { step: 1, action: 'Purge cache by tag', command: 'curl -X POST https://cdn-api.internal/purge -d \'{"tag":"config-v2"}\'', expected: 'Purge accepted, propagation < 2min' },
            { step: 2, action: 'Verify purge propagation', command: 'for edge in edge-{us,eu,ap}; do curl -sI https://$edge.cdn.internal/config.json | grep "x-cache"; done', expected: 'All edges return MISS' },
            { step: 3, action: 'Warm critical paths', command: 'cat critical-urls.txt | xargs -P10 -I{} curl -so /dev/null {}', expected: 'All URLs cached again' },
        ]
    },
    {
        title: 'Service Health Check — Full Stack',
        category: 'daily-ops',
        desc: 'Daily health check across all services',
        severity: 'low',
        time: '5 min',
        count: 180,
        steps: [
            { step: 1, action: 'Check all service endpoints', command: 'for svc in ptt sip media voice presence auth push cdn pg redis kafka es; do echo -n "$svc: "; curl -so /dev/null -w "%{http_code}" https://$svc.uc.internal/health; echo; done', expected: 'All return 200' },
            { step: 2, action: 'Check disk usage across fleet', command: 'ansible all -m shell -a "df -h | grep -E \'/$|/data\'" | grep -v SUCCESS', expected: 'No disk > 80%' },
            { step: 3, action: 'Verify backup status', command: 'aws s3 ls s3://uc-backups/$(date +%Y/%m/%d)/ | wc -l', expected: 'Expected backup count present' },
            { step: 4, action: 'Check certificate expiries', command: 'kubectl get certificates -A -o json | jq \'.items[] | {name:.metadata.name, expiry:.status.notAfter}\'', expected: 'No certs expiring within 30 days' },
        ]
    },
];

for (const rb of runbooks) {
    insertRunbook.run(rb.title, rb.category, rb.desc, JSON.stringify(rb.steps), rb.severity, rb.time, rb.count);
}
console.log(`✅ Seeded ${runbooks.length} runbooks`);

// ─── AUTOMATION SCRIPTS ─────────────────────────────────────
const insertAutomation = db.prepare(`
  INSERT INTO automation_scripts (name, description, type, command, target_service, run_count, avg_duration_ms)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const automationScripts = [
    ['Restart Service', 'Gracefully restart a service with zero-downtime rolling update', 'restart', 'kubectl rollout restart deployment/${SERVICE} -n uc-prod', null, 34, 45000],
    ['Clear Application Cache', 'Flush application-level caches across all nodes', 'cache', 'ansible ${SERVICE}-nodes -m uri -a "url=http://localhost:9090/admin/cache/flush method=POST"', null, 89, 3200],
    ['Rotate Logs', 'Force log rotation and compress old logs to S3', 'maintenance', 'logrotate -f /etc/logrotate.d/${SERVICE} && aws s3 sync /var/log/archive s3://uc-logs/$(date +%Y%m%d)/', null, 156, 12000],
    ['Scale Up Service', 'Increase replica count by 2 for a service', 'scaling', 'kubectl scale deployment/${SERVICE} -n uc-prod --replicas=$(($(kubectl get deployment/${SERVICE} -n uc-prod -o jsonpath="{.spec.replicas}")+2))', null, 22, 30000],
    ['Scale Down Service', 'Decrease replica count by 1 (min 2)', 'scaling', 'CURRENT=$(kubectl get deployment/${SERVICE} -n uc-prod -o jsonpath="{.spec.replicas}"); [ $CURRENT -gt 2 ] && kubectl scale deployment/${SERVICE} -n uc-prod --replicas=$(($CURRENT-1))', null, 18, 25000],
    ['Database Vacuum', 'Run VACUUM ANALYZE on PostgreSQL primary', 'database', 'psql -h pg-primary -d ucdb -c "VACUUM (VERBOSE, ANALYZE);"', 'PostgreSQL Primary', 52, 180000],
    ['SSL Certificate Check', 'Verify SSL certificates across all endpoints', 'security', 'for domain in $(cat /etc/uc/domains.txt); do echo | openssl s_client -connect $domain:443 2>/dev/null | openssl x509 -noout -enddate; done', null, 365, 8000],
    ['Flush DNS Cache', 'Clear DNS resolver cache on all nodes', 'networking', 'ansible all -m shell -a "systemd-resolve --flush-caches && echo flushed"', null, 28, 5000],
    ['Generate System Report', 'Create comprehensive system health report', 'reporting', 'python3 /opt/uc/scripts/generate_report.py --format html --output /tmp/system-report-$(date +%Y%m%d).html', null, 200, 15000],
    ['Backup Configuration', 'Snapshot all service configurations to S3', 'backup', 'etcdctl snapshot save /tmp/etcd-$(date +%s).snap && aws s3 cp /tmp/etcd-*.snap s3://uc-config-backups/', null, 90, 22000],
];

for (const a of automationScripts) insertAutomation.run(...a);
console.log(`✅ Seeded ${automationScripts.length} automation scripts`);

// ─── ON-CALL SCHEDULE ───────────────────────────────────────
const insertOncall = db.prepare(`
  INSERT INTO oncall_schedule (engineer, email, phone, start_date, end_date, rotation_type)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const engineers = [
    { name: 'Sarah Chen', email: 'sarah.chen@uc.internal', phone: '+1-555-0101' },
    { name: 'Mike Torres', email: 'mike.torres@uc.internal', phone: '+1-555-0102' },
    { name: 'Priya Patel', email: 'priya.patel@uc.internal', phone: '+1-555-0103' },
    { name: 'Alex Kim', email: 'alex.kim@uc.internal', phone: '+1-555-0104' },
    { name: 'Jordan Lee', email: 'jordan.lee@uc.internal', phone: '+1-555-0105' },
    { name: 'Taylor Swift', email: 'taylor.swift@uc.internal', phone: '+1-555-0106' },
];

// Generate 6 weeks of rotation
const baseDate = new Date('2026-02-16');
for (let week = 0; week < 6; week++) {
    const primary = engineers[week % engineers.length];
    const secondary = engineers[(week + 1) % engineers.length];
    const start = new Date(baseDate.getTime() + week * 7 * 86400000);
    const end = new Date(start.getTime() + 7 * 86400000);
    insertOncall.run(primary.name, primary.email, primary.phone, start.toISOString().split('T')[0], end.toISOString().split('T')[0], 'primary');
    insertOncall.run(secondary.name, secondary.email, secondary.phone, start.toISOString().split('T')[0], end.toISOString().split('T')[0], 'secondary');
}
console.log(`✅ Seeded 12 on-call schedule entries (6 weeks × primary + secondary)`);

db.close();
console.log('\n🎉 Database seeded successfully!');
