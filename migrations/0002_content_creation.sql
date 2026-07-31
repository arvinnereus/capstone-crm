-- Content Creation module (Xiaohei illustration pipeline)

CREATE TABLE content_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'drafting' CHECK (status IN ('drafting', 'drafted', 'generating', 'done', 'failed')),
  language_mode TEXT NOT NULL DEFAULT 'zh' CHECK (language_mode IN ('zh', 'en')),
  input_type TEXT NOT NULL CHECK (input_type IN ('url', 'text')),
  input_url TEXT,
  input_text TEXT,
  article_title TEXT,
  core_argument TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_content_jobs_created ON content_jobs (created_at);
CREATE INDEX idx_content_jobs_status ON content_jobs (status);

CREATE TABLE content_shots (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES content_jobs (id) ON DELETE CASCADE,
  shot_index INTEGER NOT NULL,
  theme TEXT,
  structure_type TEXT,
  core_idea TEXT,
  composition TEXT,
  elements_json TEXT,
  labels_json TEXT,
  image_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'done', 'failed')),
  kie_task_id TEXT,
  kie_state TEXT,
  source_image_url TEXT,
  r2_key TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_content_shots_job ON content_shots (job_id);
CREATE INDEX idx_content_shots_status ON content_shots (status);
