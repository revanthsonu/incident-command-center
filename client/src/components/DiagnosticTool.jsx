import React, { useState } from 'react';
import { apiPost } from '../hooks/useApi';

const CHECKS = [
    { id: 'dns', label: 'DNS Resolution', icon: '🌐' },
    { id: 'port', label: 'Port Check', icon: '🔌' },
    { id: 'database', label: 'Database', icon: '🗄️' },
    { id: 'memory', label: 'Memory', icon: '💾' },
    { id: 'cpu', label: 'CPU', icon: '⚡' },
    { id: 'disk', label: 'Disk', icon: '💿' },
    { id: 'network', label: 'Network', icon: '📡' },
    { id: 'ssl', label: 'SSL Cert', icon: '🔒' },
];

export default function DiagnosticTool() {
    const [selected, setSelected] = useState(CHECKS.map(c => c.id));
    const [results, setResults] = useState(null);
    const [running, setRunning] = useState(false);
    const [summary, setSummary] = useState(null);

    const toggleCheck = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const runDiagnostics = async () => {
        setRunning(true);
        setResults(null);
        const res = await apiPost('/diagnostics/run', { checks: selected });
        setResults(res.results);
        setSummary(res.summary);
        setRunning(false);
    };

    const statusIcon = (status) => status === 'pass' ? '✅' : status === 'warning' ? '⚠️' : '❌';

    return (
        <div>
            <div className="page-header">
                <h1>Diagnostic Toolkit</h1>
                <div className="subtitle">Run health checks across DNS, networking, database, and system resources</div>
            </div>

            <div className="card mb-4">
                <div className="card-header">
                    <h2>🔍 Select Checks</h2>
                    <div className="flex gap-2">
                        <button className="btn btn-sm btn-secondary" onClick={() => setSelected(CHECKS.map(c => c.id))}>All</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setSelected([])}>None</button>
                    </div>
                </div>
                <div className="card-body">
                    <div className="check-grid">
                        {CHECKS.map(check => (
                            <div key={check.id} className={`check-toggle ${selected.includes(check.id) ? 'selected' : ''}`}
                                onClick={() => toggleCheck(check.id)}>
                                {check.icon} {check.label}
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={runDiagnostics} disabled={running || selected.length === 0}>
                        {running ? '⏳ Running Diagnostics...' : `▶ Run ${selected.length} Check${selected.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>

            {summary && (
                <div className="kpi-grid mb-4">
                    <div className="kpi-card" style={{ '--kpi-color': 'var(--healthy)' }}>
                        <div className="kpi-value" style={{ color: 'var(--healthy)' }}>{summary.passed}</div>
                        <div className="kpi-label">Passed</div>
                    </div>
                    <div className="kpi-card" style={{ '--kpi-color': 'var(--medium)' }}>
                        <div className="kpi-value" style={{ color: 'var(--medium)' }}>{summary.warnings}</div>
                        <div className="kpi-label">Warnings</div>
                    </div>
                    <div className="kpi-card" style={{ '--kpi-color': 'var(--critical)' }}>
                        <div className="kpi-value" style={{ color: 'var(--critical)' }}>{summary.failed}</div>
                        <div className="kpi-label">Failed</div>
                    </div>
                    <div className="kpi-card" style={{ '--kpi-color': summary.overall === 'pass' ? 'var(--healthy)' : 'var(--critical)' }}>
                        <div className="kpi-value" style={{ color: summary.overall === 'pass' ? 'var(--healthy)' : summary.overall === 'warning' ? 'var(--medium)' : 'var(--critical)', fontSize: 22 }}>
                            {summary.overall === 'pass' ? '✓ PASS' : summary.overall === 'warning' ? '⚠ WARN' : '✗ FAIL'}
                        </div>
                        <div className="kpi-label">Overall</div>
                    </div>
                </div>
            )}

            {results && (
                <div className="card">
                    <div className="card-header">
                        <h2>📊 Results</h2>
                    </div>
                    <div className="card-body">
                        <div className="diagnostic-results">
                            {results.map((r, i) => (
                                <div key={i} className={`diagnostic-result ${r.status}`}>
                                    <div className="dr-status">{statusIcon(r.status)}</div>
                                    <div className="dr-info">
                                        <div className="dr-check">{r.check}</div>
                                        <div className="dr-detail">{r.detail}</div>
                                        <div className="dr-detail" style={{ color: 'var(--text-muted)', marginTop: 2 }}>$ {r.command}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {r.latency_ms && <div className="text-sm fw-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{r.latency_ms}ms</div>}
                                        {r.value && <div className="text-sm fw-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{r.value}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
