-- Email Batch Tracking Enhancement
-- Add table to track email batch jobs for better monitoring and debugging

-- Email Batch Jobs Table
CREATE TABLE IF NOT EXISTS email_batch_jobs (
    batch_job_id SERIAL PRIMARY KEY,
    batch_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL, -- 'weekly_report', 'custom_email', 'test_email'
    template_id INT,
    total_recipients INT NOT NULL DEFAULT 0,
    successful_sends INT NOT NULL DEFAULT 0,
    failed_sends INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_by INT,
    metadata JSONB, -- Store additional job-specific data
    FOREIGN KEY (template_id) REFERENCES email_templates(template_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- Add index for faster lookups
CREATE INDEX idx_email_batch_jobs_batch_id ON email_batch_jobs(batch_id);
CREATE INDEX idx_email_batch_jobs_status ON email_batch_jobs(status);
CREATE INDEX idx_email_batch_jobs_created_at ON email_batch_jobs(started_at);

-- Add batch_job_id to email_logs for better tracking
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS batch_job_id INT,
ADD CONSTRAINT fk_email_logs_batch_job 
FOREIGN KEY (batch_job_id) REFERENCES email_batch_jobs(batch_job_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_batch_job_id ON email_logs(batch_job_id);

-- Function to create a new batch job
CREATE OR REPLACE FUNCTION create_email_batch_job(
    p_job_type VARCHAR(50),
    p_template_id INT,
    p_total_recipients INT,
    p_created_by INT,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_batch_id UUID;
BEGIN
    INSERT INTO email_batch_jobs (
        job_type,
        template_id,
        total_recipients,
        created_by,
        metadata,
        status
    ) VALUES (
        p_job_type,
        p_template_id,
        p_total_recipients,
        p_created_by,
        p_metadata,
        'pending'
    ) RETURNING batch_id INTO new_batch_id;
    
    RETURN new_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update batch job status
CREATE OR REPLACE FUNCTION update_email_batch_job(
    p_batch_id UUID,
    p_status VARCHAR(20),
    p_successful_sends INT DEFAULT NULL,
    p_failed_sends INT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE email_batch_jobs
    SET 
        status = p_status,
        successful_sends = COALESCE(p_successful_sends, successful_sends),
        failed_sends = COALESCE(p_failed_sends, failed_sends),
        error_message = COALESCE(p_error_message, error_message),
        completed_at = CASE 
            WHEN p_status IN ('completed', 'failed') THEN CURRENT_TIMESTAMP 
            ELSE completed_at 
        END
    WHERE batch_id = p_batch_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- View for batch job monitoring
CREATE OR REPLACE VIEW email_batch_job_summary AS
SELECT 
    ebj.batch_job_id,
    ebj.batch_id,
    ebj.job_type,
    et.template_name,
    ebj.total_recipients,
    ebj.successful_sends,
    ebj.failed_sends,
    ROUND((ebj.successful_sends::DECIMAL / NULLIF(ebj.total_recipients, 0)) * 100, 2) AS success_rate,
    ebj.status,
    ebj.started_at,
    ebj.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(ebj.completed_at, CURRENT_TIMESTAMP) - ebj.started_at)) AS duration_seconds,
    s.first_name || ' ' || s.last_name AS created_by_name,
    ebj.error_message
FROM 
    email_batch_jobs ebj
LEFT JOIN 
    email_templates et ON ebj.template_id = et.template_id
LEFT JOIN 
    staff s ON ebj.created_by = s.staff_id
ORDER BY 
    ebj.started_at DESC;

-- Function to get batch job details with logs
CREATE OR REPLACE FUNCTION get_batch_job_details(p_batch_id UUID)
RETURNS TABLE (
    batch_info JSONB,
    email_logs JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jsonb_build_object(
            'batch_id', ebj.batch_id,
            'job_type', ebj.job_type,
            'template_name', et.template_name,
            'total_recipients', ebj.total_recipients,
            'successful_sends', ebj.successful_sends,
            'failed_sends', ebj.failed_sends,
            'status', ebj.status,
            'started_at', ebj.started_at,
            'completed_at', ebj.completed_at,
            'created_by', s.first_name || ' ' || s.last_name,
            'metadata', ebj.metadata
        ) AS batch_info,
        jsonb_agg(
            jsonb_build_object(
                'log_id', el.log_id,
                'recipient_email', el.recipient_email,
                'status', el.status,
                'sent_date', el.sent_date,
                'notes', el.notes
            )
        ) AS email_logs
    FROM 
        email_batch_jobs ebj
    LEFT JOIN 
        email_templates et ON ebj.template_id = et.template_id
    LEFT JOIN 
        staff s ON ebj.created_by = s.staff_id
    LEFT JOIN 
        email_logs el ON el.batch_job_id = ebj.batch_job_id
    WHERE 
        ebj.batch_id = p_batch_id
    GROUP BY 
        ebj.batch_job_id, et.template_name, s.first_name, s.last_name;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE email_batch_jobs IS 'Tracks email batch sending jobs for monitoring and debugging';
COMMENT ON COLUMN email_batch_jobs.batch_id IS 'Unique identifier for the batch job';
COMMENT ON COLUMN email_batch_jobs.job_type IS 'Type of email job: weekly_report, custom_email, test_email';
COMMENT ON COLUMN email_batch_jobs.metadata IS 'JSON field for storing job-specific configuration and parameters';
COMMENT ON VIEW email_batch_job_summary IS 'Summary view of all email batch jobs with success metrics';
