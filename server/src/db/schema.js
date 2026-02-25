import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '../../data');

export function getDb() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = Database(join(DATA_DIR, 'commandcenter.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    return db;
}

export function initSchema(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      region TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'healthy',
      uptime_percent REAL DEFAULT 99.99,
      last_check TEXT DEFAULT (datetime('now')),
      cpu_usage REAL DEFAULT 0,
      memory_usage REAL DEFAULT 0,
      request_rate INTEGER DEFAULT 0,
      error_rate REAL DEFAULT 0,
      latency_p99 REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'investigating',
      service_id INTEGER,
      assignee TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      postmortem TEXT,
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS incident_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      detail TEXT,
      actor TEXT DEFAULT 'system',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (incident_id) REFERENCES incidents(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER,
      type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      message TEXT NOT NULL,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_by TEXT,
      acknowledged_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER,
      config_key TEXT NOT NULL,
      config_value TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      updated_by TEXT DEFAULT 'system',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS config_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_id INTEGER NOT NULL,
      old_value TEXT,
      new_value TEXT NOT NULL,
      version INTEGER NOT NULL,
      changed_by TEXT DEFAULT 'system',
      changed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (config_id) REFERENCES configs(id)
    );

    CREATE TABLE IF NOT EXISTS runbooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      steps TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      estimated_time TEXT DEFAULT '5 min',
      last_executed TEXT,
      execution_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS automation_scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      command TEXT NOT NULL,
      target_service TEXT,
      last_run TEXT,
      run_count INTEGER DEFAULT 0,
      avg_duration_ms INTEGER DEFAULT 0,
      status TEXT DEFAULT 'idle',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS automation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      script_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      output TEXT,
      duration_ms INTEGER,
      triggered_by TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (script_id) REFERENCES automation_scripts(id)
    );

    CREATE TABLE IF NOT EXISTS oncall_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      engineer TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      rotation_type TEXT DEFAULT 'primary',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
    CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_service ON alerts(service_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_configs_service ON configs(service_id);
  `);
}
