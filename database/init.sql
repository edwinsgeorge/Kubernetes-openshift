-- Emergency Call Center Database Schema
-- PostgreSQL initialization script

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS call_center_db;

-- Connect to database
\c call_center_db;

-- Extension for UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Active Calls Table
CREATE TABLE IF NOT EXISTS active_calls (
    session_id VARCHAR(255) PRIMARY KEY,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    caller_name VARCHAR(255) DEFAULT 'Unknown',
    caller_number VARCHAR(50),
    location VARCHAR(500) DEFAULT 'Unknown',
    status VARCHAR(50) DEFAULT 'Active', -- Active, Ended, Error
    routing_label VARCHAR(100) DEFAULT 'Unknown',
    priority VARCHAR(50) DEFAULT 'Normal', -- Normal, High, Critical
    detected_language VARCHAR(10),
    last_transcript TEXT,
    confirmation_given BOOLEAN DEFAULT FALSE,
    handled_by VARCHAR(50) DEFAULT 'AI' -- AI or Human
);

-- Call Transcripts Table
CREATE TABLE IF NOT EXISTS call_transcripts (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES active_calls(session_id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    speaker VARCHAR(50), -- user, assistant
    transcript TEXT NOT NULL,
    detected_emotion VARCHAR(50),
    language_code VARCHAR(10)
);

-- Call History Table (for ended calls)
CREATE TABLE IF NOT EXISTS call_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE,
    start_time TIMESTAMP,
    end_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INTEGER,
    caller_name VARCHAR(255),
    caller_number VARCHAR(50),
    location VARCHAR(500),
    final_status VARCHAR(50),
    routing_label VARCHAR(100),
    priority VARCHAR(50),
    handled_by VARCHAR(50),
    resolution TEXT,
    full_transcript TEXT
);

-- Operators Table
CREATE TABLE IF NOT EXISTS operators (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50), -- admin, supervisor, operator
    status VARCHAR(50) DEFAULT 'offline', -- online, offline, busy
    current_call_session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Department Routing Rules
CREATE TABLE IF NOT EXISTS routing_rules (
    id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    keywords TEXT[], -- Array of keywords for routing
    priority_level VARCHAR(50),
    contact_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Logs
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    log_level VARCHAR(20), -- INFO, WARNING, ERROR, CRITICAL
    service_name VARCHAR(100),
    message TEXT,
    metadata JSONB
);

-- Indexes for better performance
CREATE INDEX idx_active_calls_status ON active_calls(status);
CREATE INDEX idx_active_calls_start_time ON active_calls(start_time);
CREATE INDEX idx_call_transcripts_session ON call_transcripts(session_id);
CREATE INDEX idx_call_transcripts_timestamp ON call_transcripts(timestamp);
CREATE INDEX idx_call_history_start_time ON call_history(start_time);
CREATE INDEX idx_operators_status ON operators(status);
CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp);

-- Insert sample routing rules
INSERT INTO routing_rules (department_name, keywords, priority_level, contact_number) VALUES
('Fire Department', ARRAY['fire', 'smoke', 'burning', 'flames'], 'Critical', '101'),
('Police', ARRAY['theft', 'robbery', 'crime', 'assault', 'police'], 'High', '100'),
('Medical Emergency', ARRAY['accident', 'injury', 'medical', 'ambulance', 'heart attack'], 'Critical', '102'),
('Disaster Management', ARRAY['flood', 'earthquake', 'landslide', 'storm', 'disaster'], 'Critical', '1077'),
('Women Helpline', ARRAY['harassment', 'abuse', 'violence', 'women safety'], 'High', '1091'),
('General Inquiry', ARRAY['information', 'help', 'general', 'query'], 'Normal', '112')
ON CONFLICT DO NOTHING;

-- Insert sample operator
INSERT INTO operators (username, email, full_name, role) VALUES
('admin', 'admin@kerala-ers.gov.in', 'System Administrator', 'admin'),
('operator1', 'operator1@kerala-ers.gov.in', 'Operator One', 'operator')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Create a function to archive ended calls
CREATE OR REPLACE FUNCTION archive_ended_call()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('Ended', 'Error') AND OLD.status = 'Active' THEN
        INSERT INTO call_history (
            session_id, start_time, end_time, duration_seconds,
            caller_name, caller_number, location, final_status,
            routing_label, priority, handled_by
        ) VALUES (
            NEW.session_id,
            NEW.start_time,
            CURRENT_TIMESTAMP,
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - NEW.start_time))::INTEGER,
            NEW.caller_name,
            NEW.caller_number,
            NEW.location,
            NEW.status,
            NEW.routing_label,
            NEW.priority,
            NEW.handled_by
        ) ON CONFLICT (session_id) DO UPDATE SET
            end_time = EXCLUDED.end_time,
            duration_seconds = EXCLUDED.duration_seconds,
            final_status = EXCLUDED.final_status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-archiving
CREATE TRIGGER trigger_archive_ended_call
    AFTER UPDATE ON active_calls
    FOR EACH ROW
    EXECUTE FUNCTION archive_ended_call();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Emergency Call Center database initialized successfully!';
END $$;
