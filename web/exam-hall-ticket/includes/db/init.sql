CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  roll TEXT NOT NULL,
  attendance INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_token ON students(session_token);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE students FORCE ROW LEVEL SECURITY;
CREATE POLICY student_isolation_policy ON students
    USING (session_token = current_setting('app.current_session_token', true))
    WITH CHECK (session_token = current_setting('app.current_session_token', true));