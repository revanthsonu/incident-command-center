import React, { useState } from 'react';
import { useApi, apiPut } from '../hooks/useApi';

export default function ConfigManager() {
    const { data: svcData } = useApi('/services');
    const [selectedService, setSelectedService] = useState(null);
    const [editingKey, setEditingKey] = useState(null);
    const [editValue, setEditValue] = useState('');

    const services = svcData?.services || [];

    return (
        <div>
            <div className="page-header">
                <h1>Configuration Manager</h1>
                <div className="subtitle">View and manage service configurations with version tracking</div>
            </div>

            <div className="filter-bar mb-3">
                {services.map(svc => (
                    <button key={svc.id} className={`filter-chip ${selectedService === svc.id ? 'active' : ''}`}
                        onClick={() => { setSelectedService(svc.id); setEditingKey(null); }}>
                        {svc.name}
                    </button>
                ))}
            </div>

            {selectedService ? (
                <ConfigTable serviceId={selectedService} editingKey={editingKey} editValue={editValue}
                    setEditingKey={setEditingKey} setEditValue={setEditValue} />
            ) : (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">⚙️</div>
                        <div className="empty-text">Select a service to view its configuration</div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ConfigTable({ serviceId, editingKey, editValue, setEditingKey, setEditValue }) {
    const { data, loading, refetch } = useApi(`/configs/${serviceId}`);
    const [saving, setSaving] = useState(false);

    if (loading || !data) return <div className="skeleton" style={{ height: 300, borderRadius: 14 }}></div>;

    const handleSave = async (key) => {
        setSaving(true);
        await apiPut(`/configs/${serviceId}`, { config_key: key, config_value: editValue, changed_by: 'Sarah Chen' });
        setEditingKey(null);
        await refetch();
        setSaving(false);
    };

    return (
        <div className="card">
            <div className="card-header">
                <h2>⚙️ {data.service_name} Configuration</h2>
                <span className="text-sm text-muted">{data.configs.length} entries</span>
            </div>
            <table className="config-table">
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Value</th>
                        <th>Version</th>
                        <th>Updated By</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data.configs.map(cfg => (
                        <tr key={cfg.id}>
                            <td><span className="config-key">{cfg.config_key}</span></td>
                            <td>
                                {editingKey === cfg.config_key ? (
                                    <input className="input" style={{ width: 200 }} value={editValue}
                                        onChange={e => setEditValue(e.target.value)} autoFocus />
                                ) : (
                                    <span className="config-value">{cfg.config_value}</span>
                                )}
                            </td>
                            <td><span className="badge badge-low">v{cfg.version}</span></td>
                            <td className="text-sm text-muted">{cfg.updated_by}</td>
                            <td>
                                {editingKey === cfg.config_key ? (
                                    <div className="flex gap-2">
                                        <button className="btn btn-sm btn-success" disabled={saving} onClick={() => handleSave(cfg.config_key)}>
                                            {saving ? '...' : 'Save'}
                                        </button>
                                        <button className="btn btn-sm btn-secondary" onClick={() => setEditingKey(null)}>Cancel</button>
                                    </div>
                                ) : (
                                    <button className="btn btn-sm btn-secondary" onClick={() => { setEditingKey(cfg.config_key); setEditValue(cfg.config_value); }}>
                                        Edit
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
