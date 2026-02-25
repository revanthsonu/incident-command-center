import React from 'react';
import { useApi } from '../hooks/useApi';

export default function OnCallSchedule() {
    const { data, loading } = useApi('/oncall');

    if (loading || !data) return <div className="skeleton" style={{ height: 400, borderRadius: 14 }}></div>;

    const { current, upcoming, past } = data;

    return (
        <div>
            <div className="page-header">
                <h1>On-Call Schedule</h1>
                <div className="subtitle">24/7 rotation for incident response and escalation</div>
            </div>

            {/* Current On-Call */}
            {current.length > 0 && (
                <>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                        🟢 Currently On-Call
                    </h3>
                    <div className="oncall-grid mb-4">
                        {current.map(oc => (
                            <div key={oc.id} className="oncall-card current">
                                <div className="flex items-center justify-between">
                                    <div className="oc-engineer">{oc.engineer}</div>
                                    <span className={`oc-type ${oc.rotation_type}`}>{oc.rotation_type}</span>
                                </div>
                                <div className="oc-dates">{formatDate(oc.start_date)} → {formatDate(oc.end_date)}</div>
                                <div className="oc-contact">
                                    📧 {oc.email}<br />
                                    📱 {oc.phone}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
                <>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                        📅 Upcoming Rotations
                    </h3>
                    <div className="oncall-grid mb-4">
                        {upcoming.map(oc => (
                            <div key={oc.id} className="oncall-card">
                                <div className="flex items-center justify-between">
                                    <div className="oc-engineer">{oc.engineer}</div>
                                    <span className={`oc-type ${oc.rotation_type}`}>{oc.rotation_type}</span>
                                </div>
                                <div className="oc-dates">{formatDate(oc.start_date)} → {formatDate(oc.end_date)}</div>
                                <div className="oc-contact">📧 {oc.email}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Past */}
            {past.length > 0 && (
                <>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                        📜 Past Rotations
                    </h3>
                    <div className="oncall-grid">
                        {past.map(oc => (
                            <div key={oc.id} className="oncall-card" style={{ opacity: 0.6 }}>
                                <div className="flex items-center justify-between">
                                    <div className="oc-engineer">{oc.engineer}</div>
                                    <span className={`oc-type ${oc.rotation_type}`}>{oc.rotation_type}</span>
                                </div>
                                <div className="oc-dates">{formatDate(oc.start_date)} → {formatDate(oc.end_date)}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
