import { useState, useEffect, useCallback, useRef } from 'react';

// In production (Vercel), there's no backend — read from static JSON
// In dev, proxy to the Express API
const IS_STATIC = import.meta.env.PROD;

const STATIC_MAP = {
    '/dashboard': '/data/dashboard.json',
    '/services': '/data/services.json',
    '/incidents': '/data/incidents.json',
    '/alerts': '/data/alerts.json',
    '/runbooks': '/data/runbooks.json',
    '/automation': '/data/automation.json',
    '/oncall': '/data/oncall.json',
};

function resolveEndpoint(endpoint) {
    if (!IS_STATIC) return `/api${endpoint}`;

    // Direct match
    if (STATIC_MAP[endpoint]) return STATIC_MAP[endpoint];

    // /incidents/:id → /data/incident_:id.json
    const incidentMatch = endpoint.match(/^\/incidents\/(\d+)$/);
    if (incidentMatch) return `/data/incident_${incidentMatch[1]}.json`;

    // /configs/:id → /data/configs_:id.json
    const configMatch = endpoint.match(/^\/configs\/(\d+)$/);
    if (configMatch) return `/data/configs_${configMatch[1]}.json`;

    // Fallback
    return `/api${endpoint}`;
}

export function useApi(endpoint, options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { refreshInterval, enabled = true } = options;
    const intervalRef = useRef(null);

    const fetchData = useCallback(async () => {
        if (!enabled) return;
        try {
            const url = resolveEndpoint(endpoint);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setData(json);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [endpoint, enabled]);

    useEffect(() => {
        fetchData();
        // Only poll in dev mode (when API is live)
        if (refreshInterval && !IS_STATIC) {
            intervalRef.current = setInterval(fetchData, refreshInterval);
            return () => clearInterval(intervalRef.current);
        }
    }, [fetchData, refreshInterval]);

    return { data, loading, error, refetch: fetchData };
}

export async function apiPost(endpoint, body) {
    if (IS_STATIC) return simulateAction(endpoint, body);
    const res = await fetch(`/api${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
}

export async function apiPatch(endpoint, body) {
    if (IS_STATIC) return simulateAction(endpoint, body);
    const res = await fetch(`/api${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
}

export async function apiPut(endpoint, body) {
    if (IS_STATIC) return simulateAction(endpoint, body);
    const res = await fetch(`/api${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
}

// Simulate write actions in static mode
function simulateAction(endpoint, body) {
    return new Promise(resolve => {
        const delay = 300 + Math.random() * 700;
        setTimeout(() => {
            // Runbook execution
            if (endpoint.includes('/runbooks/') && endpoint.includes('/execute')) {
                resolve({
                    results: Array.from({ length: 5 }, (_, i) => ({
                        step: i + 1,
                        status: Math.random() > 0.15 ? 'success' : 'warning',
                        output: Math.random() > 0.15 ? 'Check passed — within normal parameters' : 'Warning — value near threshold',
                        duration_ms: Math.floor(100 + Math.random() * 2000),
                    })),
                });
                return;
            }
            // Diagnostics
            if (endpoint.includes('/diagnostics/run')) {
                const checks = body.checks || [];
                const results = checks.map(check => {
                    const status = Math.random() > 0.12 ? 'pass' : Math.random() > 0.5 ? 'warning' : 'fail';
                    return {
                        check: check.charAt(0).toUpperCase() + check.slice(1),
                        status,
                        detail: status === 'pass' ? 'Check passed' : status === 'warning' ? 'Near threshold' : 'Check failed',
                        command: `run_check --type ${check}`,
                        latency_ms: Math.floor(5 + Math.random() * 50),
                    };
                });
                const passed = results.filter(r => r.status === 'pass').length;
                const warnings = results.filter(r => r.status === 'warning').length;
                const failed = results.filter(r => r.status === 'fail').length;
                resolve({
                    results,
                    summary: { passed, warnings, failed, overall: failed > 0 ? 'fail' : warnings > 0 ? 'warning' : 'pass' },
                });
                return;
            }
            // Automation run
            if (endpoint.includes('/automation/') && endpoint.includes('/run')) {
                resolve({
                    status: Math.random() > 0.1 ? 'success' : 'failed',
                    name: 'Script Execution',
                    output: '[✓] Connecting to target...\n[✓] Running command...\n[✓] Verifying result...\n[✓] Complete',
                    duration_ms: Math.floor(1000 + Math.random() * 5000),
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            // Default
            resolve({ success: true, message: 'Action simulated (static demo)' });
        }, delay);
    });
}

export function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
}
