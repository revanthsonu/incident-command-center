import React from 'react';

const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'incidents', icon: '🔥', label: 'Incidents' },
    { id: 'alerts', icon: '🔔', label: 'Alerts' },
    { id: 'services', icon: '🖥️', label: 'Services' },
    { id: 'configs', icon: '⚙️', label: 'Configuration' },
    { id: 'runbooks', icon: '📋', label: 'Runbooks' },
    { id: 'diagnostics', icon: '🔍', label: 'Diagnostics' },
    { id: 'automation', icon: '🤖', label: 'Automation' },
    { id: 'oncall', icon: '📞', label: 'On-Call' },
];

export default function Sidebar({ activePage, setActivePage, alertCount, incidentCount }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="logo-icon">🛡️</div>
                    <div>
                        <div className="logo-text">Command Center</div>
                        <div className="logo-subtitle">Cloud SRE</div>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section-label">Overview</div>
                {navItems.slice(0, 1).map(item => (
                    <div
                        key={item.id}
                        className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => setActivePage(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </div>
                ))}

                <div className="nav-section-label">Operations</div>
                {navItems.slice(1, 4).map(item => (
                    <div
                        key={item.id}
                        className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => setActivePage(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                        {item.id === 'alerts' && alertCount > 0 && (
                            <span className="nav-badge">{alertCount}</span>
                        )}
                        {item.id === 'incidents' && incidentCount > 0 && (
                            <span className="nav-badge">{incidentCount}</span>
                        )}
                    </div>
                ))}

                <div className="nav-section-label">Management</div>
                {navItems.slice(4, 6).map(item => (
                    <div
                        key={item.id}
                        className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => setActivePage(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </div>
                ))}

                <div className="nav-section-label">Tools</div>
                {navItems.slice(6).map(item => (
                    <div
                        key={item.id}
                        className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => setActivePage(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="avatar">SC</div>
                <div className="user-info">
                    <div className="user-name">Sarah Chen</div>
                    <div className="user-role">SRE Engineer • On-Call</div>
                </div>
            </div>
        </aside>
    );
}
