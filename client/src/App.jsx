import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import IncidentPanel from './components/IncidentPanel';
import AlertFeed from './components/AlertFeed';
import ServiceHealth from './components/ServiceHealth';
import ConfigManager from './components/ConfigManager';
import RunbookViewer from './components/RunbookViewer';
import DiagnosticTool from './components/DiagnosticTool';
import AutomationHub from './components/AutomationHub';
import OnCallSchedule from './components/OnCallSchedule';
import { useApi } from './hooks/useApi';

export default function App() {
    const [activePage, setActivePage] = useState('dashboard');
    const { data: dashData } = useApi('/dashboard', { refreshInterval: 15000 });

    const alertCount = dashData?.kpis?.unacked_alerts || 0;
    const incidentCount = dashData?.kpis?.active_incidents || 0;

    const renderPage = () => {
        switch (activePage) {
            case 'dashboard': return <Dashboard setActivePage={setActivePage} />;
            case 'incidents': return <IncidentPanel />;
            case 'alerts': return <AlertFeed />;
            case 'services': return <ServiceHealth />;
            case 'configs': return <ConfigManager />;
            case 'runbooks': return <RunbookViewer />;
            case 'diagnostics': return <DiagnosticTool />;
            case 'automation': return <AutomationHub />;
            case 'oncall': return <OnCallSchedule />;
            default: return <Dashboard setActivePage={setActivePage} />;
        }
    };

    return (
        <div className="app-layout">
            <Sidebar
                activePage={activePage}
                setActivePage={setActivePage}
                alertCount={alertCount}
                incidentCount={incidentCount}
            />
            <main className="main-content">
                {renderPage()}
            </main>
        </div>
    );
}
