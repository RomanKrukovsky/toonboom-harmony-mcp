/**
 * Versioned migrations for the ML platform tables.
 *
 * The existing `SqliteTracker` creates its nine production-tracking tables with a bare
 * `CREATE TABLE IF NOT EXISTS` list and no version record, so there was no way to evolve the
 * schema. This adds a real migration mechanism *alongside* it, in the same database file, and
 * leaves every pre-existing table untouched.
 *
 * Rules:
 *  - Migrations are append-only. Editing a shipped migration is forbidden; add a new one.
 *  - Each runs inside a transaction and is recorded in `ml_schema_migrations`.
 *  - No secret material is stored. Credentials are referenced by env var name only.
 */

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly statements: readonly string[];
}

export const ML_MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'ml_platform_core',
    statements: [
      `CREATE TABLE IF NOT EXISTS ml_schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,

      `CREATE TABLE IF NOT EXISTS ml_models (
        model_id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        task_types TEXT NOT NULL,
        upstream_repository TEXT,
        upstream_commit TEXT,
        cache_key TEXT NOT NULL,
        maturity TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,

      `CREATE TABLE IF NOT EXISTS ml_model_revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_id TEXT NOT NULL,
        revision TEXT NOT NULL,
        weights_files TEXT NOT NULL,
        weights_sha256 TEXT NOT NULL,
        hash_source TEXT NOT NULL,
        installed INTEGER NOT NULL DEFAULT 0,
        hash_verified INTEGER NOT NULL DEFAULT 0,
        verified_at TEXT,
        UNIQUE(model_id, revision),
        FOREIGN KEY(model_id) REFERENCES ml_models(model_id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS ml_provider_installations (
        provider_id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        model_revision TEXT NOT NULL,
        backend TEXT NOT NULL,
        devices TEXT NOT NULL,
        detection_status TEXT NOT NULL,
        detection_message TEXT,
        python_environment TEXT,
        last_checked_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(model_id) REFERENCES ml_models(model_id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS license_decisions (
        decision_id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        model_revision TEXT NOT NULL,
        gate TEXT NOT NULL,
        use_case TEXT NOT NULL,
        allowed INTEGER NOT NULL,
        status TEXT NOT NULL,
        reason_codes TEXT NOT NULL,
        human_reason TEXT NOT NULL,
        commercial_build INTEGER NOT NULL,
        studio_region TEXT,
        license_record_sha256 TEXT NOT NULL,
        decided_at TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS consent_records (
        consent_id TEXT PRIMARY KEY,
        subject_pseudonym TEXT NOT NULL,
        scope TEXT NOT NULL,
        permitted_projects TEXT NOT NULL,
        permitted_until TEXT,
        revoked INTEGER NOT NULL DEFAULT 0,
        revoked_at TEXT,
        source_recording_sha256 TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,

      `CREATE TABLE IF NOT EXISTS ml_jobs (
        job_id TEXT PRIMARY KEY,
        correlation_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        task_type TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        model_revision TEXT NOT NULL,
        execution_mode TEXT NOT NULL,
        commercial_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        attempt INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 1,
        request_json TEXT NOT NULL,
        result_json TEXT,
        provenance_json TEXT,
        error_code TEXT,
        error_message TEXT,
        license_decision_id TEXT,
        input_hash TEXT NOT NULL,
        timeout_ms INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT,
        finished_at TEXT,
        cancel_requested INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(license_decision_id) REFERENCES license_decisions(decision_id)
      )`,

      // Idempotency is enforced by the database, not by a best-effort check in application code.
      // The key covers provider, model, revision and the hash of inputs+parameters, so two
      // requests only collide when they are genuinely the same computation.
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_jobs_idempotency
        ON ml_jobs(idempotency_key, provider_id, model_id, model_revision, input_hash)`,
      `CREATE INDEX IF NOT EXISTS idx_ml_jobs_correlation ON ml_jobs(correlation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ml_jobs_model ON ml_jobs(model_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ml_jobs_status ON ml_jobs(status)`,

      `CREATE TABLE IF NOT EXISTS ml_job_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        attempt INTEGER NOT NULL,
        status TEXT NOT NULL,
        device TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        duration_ms REAL,
        peak_memory_mb REAL,
        error_code TEXT,
        error_message TEXT,
        retry_class TEXT,
        UNIQUE(job_id, attempt),
        FOREIGN KEY(job_id) REFERENCES ml_jobs(job_id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ml_job_attempts_job ON ml_job_attempts(job_id)`,

      `CREATE TABLE IF NOT EXISTS ml_artifacts (
        artifact_id TEXT PRIMARY KEY,
        sha256 TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        role TEXT NOT NULL,
        producer_job_id TEXT,
        license_decision_id TEXT,
        consent_id TEXT,
        parent_artifact_ids TEXT NOT NULL DEFAULT '[]',
        retention TEXT NOT NULL DEFAULT 'project',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(producer_job_id) REFERENCES ml_jobs(job_id) ON DELETE SET NULL,
        FOREIGN KEY(license_decision_id) REFERENCES license_decisions(decision_id),
        FOREIGN KEY(consent_id) REFERENCES consent_records(consent_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ml_artifacts_sha ON ml_artifacts(sha256)`,
      `CREATE INDEX IF NOT EXISTS idx_ml_artifacts_job ON ml_artifacts(producer_job_id)`,

      `CREATE TABLE IF NOT EXISTS dataset_sources (
        dataset_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        canonical_url TEXT NOT NULL,
        steward TEXT,
        storage_class TEXT NOT NULL DEFAULT 'quarantine',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,

      `CREATE TABLE IF NOT EXISTS dataset_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id TEXT NOT NULL,
        release TEXT NOT NULL,
        manifest_sha256 TEXT NOT NULL,
        file_level_licensing INTEGER NOT NULL DEFAULT 0,
        commercial_training TEXT NOT NULL DEFAULT 'unknown',
        derived_weights TEXT NOT NULL DEFAULT 'unknown',
        personal_data INTEGER NOT NULL DEFAULT 0,
        biometric_data INTEGER NOT NULL DEFAULT 0,
        geographic_restrictions TEXT NOT NULL DEFAULT '[]',
        retention_policy TEXT,
        verified_at TEXT,
        verified_by TEXT,
        UNIQUE(dataset_id, release),
        FOREIGN KEY(dataset_id) REFERENCES dataset_sources(dataset_id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS production_runs (
        run_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        episode_id TEXT,
        execution_mode TEXT NOT NULL,
        commercial_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS production_stages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        shot_id TEXT,
        stage TEXT NOT NULL,
        execution_mode TEXT NOT NULL,
        status TEXT NOT NULL,
        harmony_applied INTEGER NOT NULL DEFAULT 0,
        real_inference_executed INTEGER NOT NULL DEFAULT 0,
        report_json TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        FOREIGN KEY(run_id) REFERENCES production_runs(run_id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_production_stages_shot ON production_stages(shot_id)`,

      `CREATE TABLE IF NOT EXISTS shot_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shot_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        manifest_sha256 TEXT NOT NULL,
        manifest_path TEXT NOT NULL,
        invalidated_stages TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(shot_id, version)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_shot_versions_shot ON shot_versions(shot_id)`,

      `CREATE TABLE IF NOT EXISTS approval_gates (
        gate_id TEXT PRIMARY KEY,
        run_id TEXT,
        shot_id TEXT,
        gate_name TEXT NOT NULL,
        decision TEXT NOT NULL,
        decided_by TEXT,
        rationale TEXT,
        decided_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,

      `CREATE TABLE IF NOT EXISTS quality_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT,
        shot_id TEXT,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        threshold REAL,
        passed INTEGER NOT NULL,
        measured_by TEXT NOT NULL,
        measured_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_quality_metrics_shot ON quality_metrics(shot_id)`,

      `CREATE TABLE IF NOT EXISTS retake_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shot_id TEXT NOT NULL,
        iteration INTEGER NOT NULL,
        issue_id TEXT NOT NULL,
        proposed_patch_sha256 TEXT,
        predicted_risk TEXT,
        outcome TEXT NOT NULL,
        expected_metric TEXT,
        achieved_metric REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(shot_id, iteration, issue_id)
      )`
    ]
  }
];
