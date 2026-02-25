import React, { useState } from 'react';
import { useApi, apiPost } from '../hooks/useApi';

export default function AutomationHub() {
    const { data, loading, refetch } = useApi('/automation');
    const [runningId, setRunningId] = useState(null);
    const [result, setResult] = useState(null);

    if (loading || !data) return <div className="skeleton" style={{ height: 400, borderRadius: 14 }}></div>;

    const runScript = async (id) => {
        setRunningId(id);
        setResult(null);
        const res = await apiPost(`/automation/${id}/run`, { triggered_by: 'Sarah Chen' });
        setResult(res);
        setRunningId(null);
        refetch();
    };

    const typeIcons = {
        restart: '🔄', cache: '🗑️', maintenance: '🔧', scaling: '📈',
        database: '🗄️', security: '🔒', networking: '🌐', reporting: '📊', backup: '💾',
    };

    return (
        <div>
            <div className="page-header">
                <h1>Automation Hub</h1>
                <div className="subtitle">Trigger operational automation scripts with one click</div>
            </div>

            {result && (
                <div className="card mb-4">
                    <div className="card-header">
                        <h2>{result.status === 'success' ? '✅' : '❌'} {result.name}</h2>
                        <span className={`badge badge-${result.status === 'success' ? 'healthy' : 'critical'}`}>{result.status}</span>
                    </div>
                    <div className="card-body">
                        <div className="terminal">{formatTerminal(result.output)}</div>
                        <div className="flex gap-3 mt-2 text-sm text-muted">
                            <span>Duration: {result.duration_ms}ms</span>
                            <span>Timestamp: {new Date(result.timestamp).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="automation-grid">
                {data.scripts.map(script => (
                    <div key={script.id} className="automation-card">
                        <div className="flex items-center gap-2 mb-2">
                            <span style={{ fontSize: 20 }}>{typeIcons[script.type] || '⚡'}</span>
                            <div className="auto-name">{script.name}</div>
                        </div>
                        <div className="auto-desc">{script.description}</div>
                        <div className="auto-stats">
                            <span>Runs: <span className="auto-stat-value">{script.run_count}</span></span>
                            <span>Avg: <span className="auto-stat-value">{(script.avg_duration_ms / 1000).toFixed(1)}s</span></span>
                            <span className={`badge badge-${script.type === 'security' ? 'high' : 'low'}`}>{script.type}</span>
                        </div>
                        <div className="terminal" style={{ fontSize: 10, padding: 8, marginBottom: 12, maxHeight: 60, overflow: 'hidden' }}>
                            <span className="term-muted">$ {script.command.substring(0, 100)}{script.command.length > 100 ? '...' : ''}</span>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => runScript(script.id)}
                            disabled={runningId === script.id}>
                            {runningId === script.id ? '⏳ Running...' : '▶ Execute'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function formatTerminal(output) {
    if (!output) return '';
    return output.split('\n').map((line, i) => {
        let cls = '';
        if (line.includes('[✓]')) cls = 'term-success';
        else if (line.includes('[✗]')) cls = 'term-error';
        else if (line.includes('[!]')) cls = 'term-warning';
        else if (line.includes('[✓]') === false && line.trim().startsWith('[')) cls = 'term-info';
        return <div key={i} className={cls}>{line}</div>;
    });
}
