-- NextGen Ministry Database Schema for PostgreSQL by Alfred Nodado
-- Last Updated: March 29, 2025
-- Converted from MySQL for Supabase

-- Create database (uncomment if not using Supabase)
-- CREATE DATABASE nextgen_ministry;

-- Age Category Table
CREATE TABLE age_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL,
    min_age INT NOT NULL,
    max_age INT NOT NULL,
    description TEXT
);

-- Children Table
CREATE TABLE children (
    child_id SERIAL PRIMARY KEY,
    formal_id VARCHAR(10) UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    birthdate DATE NOT NULL,
    gender VARCHAR(10),
    photo_url VARCHAR(255),
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    age_category_id INT,
    CONSTRAINT fk_child_age_category FOREIGN KEY (age_category_id) REFERENCES age_categories(category_id)
);

-- Guardian Table
CREATE TABLE guardians (
    guardian_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(100),
    relationship VARCHAR(50)
);

-- Child Guardian Table
CREATE TABLE child_guardian (
    id SERIAL PRIMARY KEY,
    child_id INT NOT NULL,
    guardian_id INT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE,
    FOREIGN KEY (guardian_id) REFERENCES guardians(guardian_id) ON DELETE CASCADE
);

-- Service Table
CREATE TABLE services (
    service_id SERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    day_of_week VARCHAR(10) NOT NULL
);

-- Attendance Table
CREATE TABLE attendance (
    attendance_id SERIAL PRIMARY KEY,
    child_id INT NOT NULL,
    service_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    checked_in_by VARCHAR(50),
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

-- Email Template Table
CREATE TABLE email_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_date DATE DEFAULT CURRENT_DATE,
    last_modified DATE DEFAULT CURRENT_DATE
);

-- Email Log Table
CREATE TABLE email_logs (
    log_id SERIAL PRIMARY KEY,
    template_id INT,
    recipient_email VARCHAR(100) NOT NULL,
    child_id INT,
    guardian_id INT,
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent',
    notes TEXT,
    FOREIGN KEY (template_id) REFERENCES email_templates(template_id) ON DELETE SET NULL,
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE SET NULL,
    FOREIGN KEY (guardian_id) REFERENCES guardians(guardian_id) ON DELETE SET NULL
);

-- Material Table
CREATE TABLE materials (
    material_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    file_url VARCHAR(255),
    category VARCHAR(50),
    age_group VARCHAR(50),
    upload_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    category_id INT,
    CONSTRAINT fk_material_age_category FOREIGN KEY (category_id) REFERENCES age_categories(category_id)
);

-- Material Assignment Table
CREATE TABLE material_assignments (
    assignment_id SERIAL PRIMARY KEY,
    material_id INT NOT NULL,
    service_date DATE NOT NULL,
    service_id INT NOT NULL,
    FOREIGN KEY (material_id) REFERENCES materials(material_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

-- Staff/Volunteers Table
CREATE TABLE staff (
    staff_id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    access_level INT DEFAULT 1,
    last_login TIMESTAMP,
    created_date DATE DEFAULT CURRENT_DATE
);

-- Staff Assignments Table
CREATE TABLE staff_assignments (
    assignment_id SERIAL PRIMARY KEY,
    staff_id INT NOT NULL,
    service_id INT NOT NULL,
    assignment_date DATE NOT NULL,
    role_at_service VARCHAR(50),
    check_in_time TIME,
    check_out_time TIME,
    notes TEXT,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

-- Attendance Analytics Table
CREATE TABLE attendance_analytics (
    analytics_id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    service_id INT NOT NULL,
    total_attendance INT DEFAULT 0,
    first_timers INT DEFAULT 0,
    returning_count INT DEFAULT 0,
    age_4_5_count INT DEFAULT 0,
    age_6_7_count INT DEFAULT 0,
    age_8_9_count INT DEFAULT 0,
    age_10_12_count INT DEFAULT 0,
    staff_count INT DEFAULT 0,
    attendance_growth_percent DECIMAL(5,2) DEFAULT 0.00,
    notes TEXT,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

-- Weekly Reports Table
CREATE TABLE weekly_reports (
    report_id SERIAL PRIMARY KEY,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_attendance INT DEFAULT 0,
    unique_children INT DEFAULT 0,
    first_timers INT DEFAULT 0,
    email_sent_date TIMESTAMP,
    report_generated_by INT,
    report_pdf_url VARCHAR(255),
    notes TEXT,
    FOREIGN KEY (report_generated_by) REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- Service Notes Table
CREATE TABLE service_notes (
    note_id SERIAL PRIMARY KEY,
    service_date DATE NOT NULL,
    service_id INT NOT NULL,
    theme VARCHAR(100),
    lesson_summary TEXT,
    special_activities TEXT,
    issues_encountered TEXT,
    recorded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE,
    CONSTRAINT fk_service_notes_staff FOREIGN KEY (recorded_by) REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- Email API Configuration Table
CREATE TABLE email_api_config (
    config_id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL DEFAULT 'Resend',
    api_key VARCHAR(255) NOT NULL,
    from_email VARCHAR(100) NOT NULL,
    from_name VARCHAR(100) NOT NULL,
    batch_size INT NOT NULL DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- Add important indexes for performance
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_child_service ON attendance(child_id, service_id);
CREATE INDEX idx_child_guardian_lookup ON child_guardian(child_id, guardian_id);
CREATE INDEX idx_children_birthdate ON children(birthdate);
CREATE INDEX idx_children_registration ON children(registration_date);
CREATE INDEX idx_staff_assignments_date ON staff_assignments(assignment_date);
CREATE INDEX idx_material_assignments_date ON material_assignments(service_date);
CREATE INDEX idx_attendance_analytics_report_date ON attendance_analytics(report_date);
CREATE INDEX idx_weekly_reports_dates ON weekly_reports(week_start_date, week_end_date);

-- Create views for common data access patterns

-- Daily Attendance Summary View
CREATE VIEW daily_attendance_summary AS
SELECT 
    a.attendance_date,
    s.service_name,
    COUNT(DISTINCT a.child_id) AS total_children,
    SUM(CASE WHEN c.registration_date = a.attendance_date THEN 1 ELSE 0 END) AS first_timers,
    COUNT(DISTINCT sa.staff_id) AS staff_count
FROM 
    attendance a
JOIN 
    services s ON a.service_id = s.service_id
JOIN 
    children c ON a.child_id = c.child_id
LEFT JOIN 
    staff_assignments sa ON a.service_id = sa.service_id AND a.attendance_date = sa.assignment_date
GROUP BY 
    a.attendance_date, s.service_name;

-- Age Group Analysis View
CREATE VIEW age_group_analysis AS
SELECT 
    a.attendance_date,
    s.service_name,
    EXTRACT(YEAR FROM AGE(a.attendance_date, c.birthdate)) AS age,
    COUNT(*) AS count,
    CASE 
        WHEN EXTRACT(YEAR FROM AGE(a.attendance_date, c.birthdate)) BETWEEN 4 AND 5 THEN '4-5 YO'
        WHEN EXTRACT(YEAR FROM AGE(a.attendance_date, c.birthdate)) BETWEEN 6 AND 7 THEN '6-7 YO'
        WHEN EXTRACT(YEAR FROM AGE(a.attendance_date, c.birthdate)) BETWEEN 8 AND 9 THEN '8-9 YO'
        WHEN EXTRACT(YEAR FROM AGE(a.attendance_date, c.birthdate)) BETWEEN 10 AND 12 THEN '10-12 YO'
        ELSE 'Other'
    END AS age_category
FROM 
    attendance a
JOIN 
    children c ON a.child_id = c.child_id
JOIN 
    services s ON a.service_id = s.service_id
GROUP BY 
    a.attendance_date, s.service_name, age;

-- Weekly Email Recipients View
CREATE VIEW weekly_email_recipients AS
SELECT DISTINCT
    c.child_id,
    c.first_name,
    c.last_name,
    g.guardian_id,
    g.first_name AS guardian_first_name,
    g.last_name AS guardian_last_name,
    g.email,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.birthdate)) AS child_age,
    MAX(a.attendance_date) AS last_attendance_date,
    COUNT(DISTINCT a.attendance_date) AS attendance_count_last_30_days
FROM 
    children c
JOIN 
    child_guardian cg ON c.child_id = cg.child_id
JOIN 
    guardians g ON cg.guardian_id = g.guardian_id
LEFT JOIN 
    attendance a ON c.child_id = a.child_id AND a.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
WHERE 
    g.email IS NOT NULL
    AND c.is_active = TRUE
GROUP BY 
    c.child_id, g.guardian_id;

-- Service Growth Trend View
CREATE VIEW service_growth_trend AS
SELECT
    s.service_name,
    TO_CHAR(a.attendance_date, 'YYYY-MM') AS month,
    COUNT(DISTINCT a.child_id) AS monthly_attendance,
    COUNT(DISTINCT CASE WHEN c.registration_date >= DATE_TRUNC('month', a.attendance_date) THEN c.child_id END) AS new_registrations,
    LAG(COUNT(DISTINCT a.child_id)) OVER (PARTITION BY s.service_name ORDER BY TO_CHAR(a.attendance_date, 'YYYY-MM')) AS previous_month,
    CASE 
        WHEN LAG(COUNT(DISTINCT a.child_id)) OVER (PARTITION BY s.service_name ORDER BY TO_CHAR(a.attendance_date, 'YYYY-MM')) = 0 THEN 0
        ELSE 
            (COUNT(DISTINCT a.child_id) - LAG(COUNT(DISTINCT a.child_id)) OVER (PARTITION BY s.service_name ORDER BY TO_CHAR(a.attendance_date, 'YYYY-MM'))) * 100.0 / 
            LAG(COUNT(DISTINCT a.child_id)) OVER (PARTITION BY s.service_name ORDER BY TO_CHAR(a.attendance_date, 'YYYY-MM'))
    END AS growth_percent
FROM 
    attendance a
JOIN 
    services s ON a.service_id = s.service_id
JOIN 
    children c ON a.child_id = c.child_id
GROUP BY 
    s.service_name, month
ORDER BY 
    s.service_name, month;

-- Functions for ministry operations

-- Generate formal_id for children
CREATE OR REPLACE FUNCTION generate_formal_id()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix CHAR(2);
    next_seq INT;
    formatted_seq CHAR(4);
BEGIN
    -- Get last 2 digits of registration year
    year_prefix := RIGHT(EXTRACT(YEAR FROM NEW.registration_date)::TEXT, 2);
    
    -- Find the highest sequential number for this year
    SELECT COALESCE(MAX(CAST(SPLIT_PART(formal_id, '-', 2) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM children
    WHERE formal_id LIKE year_prefix || '-%';
    
    -- Format the sequence number with leading zeros
    formatted_seq := LPAD(next_seq::TEXT, 4, '0');
    
    -- Set the formal_id
    NEW.formal_id := year_prefix || '-' || formatted_seq;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for formal_id generation
CREATE TRIGGER generate_formal_id_trigger
BEFORE INSERT ON children
FOR EACH ROW
EXECUTE FUNCTION generate_formal_id();

-- Assign age category function
CREATE OR REPLACE FUNCTION assign_age_category()
RETURNS TRIGGER AS $$
DECLARE
    age_val INT;
    category_id_val INT;
BEGIN
    -- Calculate age
    age_val := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.birthdate));
    
    -- Find matching category
    SELECT category_id INTO category_id_val
    FROM age_categories
    WHERE age_val BETWEEN min_age AND max_age
    LIMIT 1;
    
    -- Update child record if category found
    IF category_id_val IS NOT NULL THEN
        NEW.age_category_id := category_id_val;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for age category assignment
CREATE TRIGGER assign_age_category_trigger
BEFORE INSERT ON children
FOR EACH ROW
EXECUTE FUNCTION assign_age_category();

-- Function to update child age categories
CREATE OR REPLACE FUNCTION update_child_age_categories()
RETURNS VOID AS $$
BEGIN
    UPDATE children c
    SET age_category_id = ac.category_id
    FROM age_categories ac
    WHERE EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.birthdate)) BETWEEN ac.min_age AND ac.max_age
    AND c.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function for checking in a child
CREATE OR REPLACE FUNCTION check_in_child(
    p_child_id INT,
    p_service_id INT,
    p_checked_in_by VARCHAR(50)
) RETURNS TABLE (
    success BOOLEAN,
    message VARCHAR(255)
) AS $$
DECLARE
    today_date DATE;
    current_time_val TIME; 
    child_exists INT;
    service_exists INT;
    already_checked_in INT;
BEGIN
    today_date := CURRENT_DATE;
    current_time_val := CURRENT_TIME;
    
    -- Validate child exists
    SELECT COUNT(*) INTO child_exists FROM children WHERE child_id = p_child_id AND is_active = TRUE;
    IF child_exists = 0 THEN
        RETURN QUERY SELECT FALSE, 'Child not found or not active';
        RETURN;
    END IF;
    
    -- Validate service exists
    SELECT COUNT(*) INTO service_exists FROM services WHERE service_id = p_service_id;
    IF service_exists = 0 THEN
        RETURN QUERY SELECT FALSE, 'Service not found';
        RETURN;
    END IF;
    
    -- Check if already checked in
    SELECT COUNT(*) INTO already_checked_in 
    FROM attendance 
    WHERE child_id = p_child_id 
      AND service_id = p_service_id 
      AND attendance_date = today_date;
      
    IF already_checked_in > 0 THEN
        -- Update existing record
        UPDATE attendance
        SET check_in_time = current_time_val, 
            checked_in_by = p_checked_in_by
        WHERE child_id = p_child_id 
          AND service_id = p_service_id 
          AND attendance_date = today_date;
          
        RETURN QUERY SELECT TRUE, 'Check-in time updated successfully';
    ELSE
        -- Create new attendance record
        INSERT INTO attendance (
            child_id,
            service_id,
            attendance_date,
            check_in_time,
            checked_in_by
        ) VALUES (
            p_child_id,
            p_service_id,
            today_date,
            current_time_val, 
            p_checked_in_by
        );
        
        RETURN QUERY SELECT TRUE, 'Child checked in successfully';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function for checking out a child
CREATE OR REPLACE FUNCTION check_out_child(
    p_child_id INT,
    p_service_id INT
) RETURNS TABLE (
    success BOOLEAN,
    message VARCHAR(255)
) AS $$
DECLARE
    today_date DATE;
    current_time_val TIME; 
    attendance_id_val INT;
BEGIN
    today_date := CURRENT_DATE;
    current_time_val := CURRENT_TIME;
    
    -- Find the attendance record
    SELECT attendance_id INTO attendance_id_val
    FROM attendance
    WHERE child_id = p_child_id 
      AND service_id = p_service_id 
      AND attendance_date = today_date
      AND check_in_time IS NOT NULL;
      
    IF attendance_id_val IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Child was not checked in today';
    ELSE
        -- Update checkout time
        UPDATE attendance
        SET check_out_time = current_time_val  
        WHERE attendance_id = attendance_id_val;
        
        RETURN QUERY SELECT TRUE, 'Child checked out successfully';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to register a new child
CREATE OR REPLACE FUNCTION register_new_child(
    p_first_name VARCHAR(50),
    p_middle_name VARCHAR(50),
    p_last_name VARCHAR(50),
    p_birthdate DATE,
    p_gender VARCHAR(10),
    p_guardian_first_name VARCHAR(50),
    p_guardian_last_name VARCHAR(50),
    p_guardian_phone VARCHAR(20),
    p_guardian_email VARCHAR(100),
    p_guardian_relationship VARCHAR(50)
) RETURNS TABLE (
    child_id INT,
    success BOOLEAN,
    message VARCHAR(255)
) AS $$
DECLARE
    new_child_id INT;
    new_guardian_id INT;
BEGIN
    -- Start transaction
    BEGIN
        -- Insert child record
        INSERT INTO children (
            first_name,
            middle_name,
            last_name,
            birthdate,
            gender,
            registration_date,
            is_active
        ) VALUES (
            p_first_name,
            p_middle_name,
            p_last_name,
            p_birthdate,
            p_gender,
            CURRENT_DATE,
            TRUE
        ) RETURNING children.child_id INTO new_child_id;
        
        -- Insert guardian record
        INSERT INTO guardians (
            first_name,
            last_name,
            phone_number,
            email,
            relationship
        ) VALUES (
            p_guardian_first_name,
            p_guardian_last_name,
            p_guardian_phone,
            p_guardian_email,
            p_guardian_relationship
        ) RETURNING guardians.guardian_id INTO new_guardian_id;
        
        -- Create child-guardian relationship
        INSERT INTO child_guardian (
            child_id,
            guardian_id,
            is_primary
        ) VALUES (
            new_child_id,
            new_guardian_id,
            TRUE
        );
        
        -- Return success
        RETURN QUERY 
        SELECT 
            new_child_id,
            TRUE,
            'Child registered successfully'::VARCHAR(255);
            
    EXCEPTION WHEN OTHERS THEN
        -- Rollback on error
        RAISE EXCEPTION 'Error registering child: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to generate weekly analytics
CREATE OR REPLACE FUNCTION generate_weekly_analytics()
RETURNS VOID AS $$
DECLARE
    current_week_start DATE;
    current_week_end DATE;
BEGIN
    -- Set the date range for current week (Sunday to Saturday)
    current_week_start := CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER;
    current_week_end := current_week_start + 6;
    
    -- Insert weekly report
    INSERT INTO weekly_reports (
        week_start_date, 
        week_end_date, 
        total_attendance, 
        unique_children, 
        first_timers, 
        report_generated_by,
        report_pdf_url
    )
    SELECT 
        current_week_start,
        current_week_end,
        COUNT(attendance_id),
        COUNT(DISTINCT child_id),
        SUM(CASE WHEN c.registration_date BETWEEN current_week_start AND current_week_end THEN 1 ELSE 0 END),
        1, -- Default admin user
        CONCAT('reports/weekly_', TO_CHAR(current_week_start, 'YYYYMMDD'), '.pdf')
    FROM 
        attendance a
    JOIN 
        children c ON a.child_id = c.child_id
    WHERE 
        a.attendance_date BETWEEN current_week_start AND current_week_end;
    
    -- Generate per-service analytics
    INSERT INTO attendance_analytics (
        report_date,
        service_id,
        total_attendance,
        first_timers,
        returning_count,
        age_4_5_count,
        age_6_7_count,
        age_8_9_count,
        age_10_12_count,
        staff_count,
        attendance_growth_percent
    )
    SELECT 
        current_week_end,
        a.service_id,
        COUNT(DISTINCT a.child_id),
        SUM(CASE WHEN c.registration_date BETWEEN current_week_start AND current_week_end THEN 1 ELSE 0 END),
        COUNT(DISTINCT a.child_id) - SUM(CASE WHEN c.registration_date BETWEEN current_week_start AND current_week_end THEN 1 ELSE 0 END),
        SUM(CASE WHEN EXTRACT(YEAR FROM AGE(a.attendance_date, c.birthdate)) BETWEEN 4 AND 5 THEN 1 ELSE 0 END),
        SUM(CASE WHEN EXTRACT(YEAR FROM AGE(a.attendance_date, c.birthdate)) BETWEEN 6 AND 7 THEN 1 ELSE 0 END),
        SUM(CASE WHEN EXTRACT(YEAR FROM AGE(a.attendance_date, c.birthdate)) BETWEEN 8 AND 9 THEN 1 ELSE 0 END),
        SUM(CASE WHEN EXTRACT(YEAR FROM AGE(a.attendance_date, c.birthdate)) BETWEEN 10 AND 12 THEN 1 ELSE 0 END),
        COUNT(DISTINCT sa.staff_id),
        CASE 
            WHEN (SELECT COUNT(DISTINCT child_id) FROM attendance 
                 WHERE service_id = a.service_id AND attendance_date BETWEEN 
                    current_week_start - INTERVAL '7 days' AND current_week_end - INTERVAL '7 days') = 0 THEN 0
            ELSE
                ((COUNT(DISTINCT a.child_id) - 
                    (SELECT COUNT(DISTINCT child_id) FROM attendance 
                     WHERE service_id = a.service_id AND attendance_date BETWEEN 
                        current_week_start - INTERVAL '7 days' AND current_week_end - INTERVAL '7 days')
                 ) * 100.0 / 
                    (SELECT COUNT(DISTINCT child_id) FROM attendance 
                     WHERE service_id = a.service_id AND attendance_date BETWEEN 
                     current_week_start - INTERVAL '7 days' AND current_week_end - INTERVAL '7 days'))
        END
    FROM 
        attendance a
    JOIN 
        children c ON a.child_id = c.child_id
    LEFT JOIN 
        staff_assignments sa ON a.service_id = sa.service_id AND a.attendance_date = sa.assignment_date
    WHERE 
        a.attendance_date BETWEEN current_week_start AND current_week_end
    GROUP BY 
        a.service_id;
END;
$$ LANGUAGE plpgsql;

-- Initial data setup
INSERT INTO services (service_name, start_time, end_time, day_of_week)
VALUES 
('Sunday Morning', '09:00:00', '10:30:00', 'Sunday'),
('Sunday Evening', '17:00:00', '18:30:00', 'Sunday'),
('Wednesday Kids', '18:30:00', '20:00:00', 'Wednesday');

INSERT INTO age_categories (category_name, min_age, max_age, description)
VALUES 
('Preschool', 4, 5, 'Ages 4-5 years'),
('Elementary 1', 6, 7, 'Ages 6-7 years'),
('Elementary 2', 8, 9, 'Ages 8-9 years'),
('Preteen', 10, 12, 'Ages 10-12 years');

INSERT INTO email_templates (template_name, subject, body, is_active)
VALUES 
('Weekly Report', 'NextGen Ministry Weekly Report', 'This is the weekly report template.', TRUE),
('Welcome Email', 'Welcome to NextGen Ministry!', 'Welcome to our children''s ministry! We''re excited to have your child join us.', TRUE),
('Birthday Email', 'Happy Birthday from NextGen Ministry!', 'Happy Birthday to your child from all of us at NextGen Ministry!', TRUE);

-- Create admin user (password hash is for 'admin123')
INSERT INTO staff (first_name, last_name, role, email, phone, password_hash, is_active, access_level)
VALUES ('Admin', 'User', 'Administrator', 'admin@example.com', '555-123-4567', 
        '$2y$10$GKjdXjg3L5t5tYYJv1WIAOBqY8k5iJ7VJoT1kP5BhC5KlS0pGfEDO', TRUE, 10);

-- Insert default configuration with your Resend API key
INSERT INTO email_api_config (
    provider, api_key, from_email, from_name, batch_size
) VALUES (
    'Resend', 
    're_iQGG8KFn_F95SnGfYEPtPtRhAyNdtWAjB', 
    'nextgen@auguzcht.dev', 
    'NextGen Ministry', 
    100
);

-- Function to generate weekly email content
CREATE OR REPLACE FUNCTION generate_weekly_email_content()
RETURNS TEXT AS $$
DECLARE
    current_week_start DATE;
    current_week_end DATE;
    total_children INT DEFAULT 0;
    new_children INT DEFAULT 0;
    growth_percent DECIMAL(5,2) DEFAULT 0.00;
    email_html TEXT;
    service_rows TEXT := '';
BEGIN
    -- Set the date range for current week
    current_week_start := CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER;
    current_week_end := current_week_start + 6;
    
    -- Get key metrics
    SELECT 
        COUNT(DISTINCT child_id),
        SUM(CASE WHEN c.registration_date BETWEEN current_week_start AND current_week_end THEN 1 ELSE 0 END),
        CASE
            WHEN (SELECT COUNT(DISTINCT child_id) FROM attendance 
                 WHERE attendance_date BETWEEN current_week_start - INTERVAL '7 days' AND current_week_end - INTERVAL '7 days') = 0 THEN 0
            ELSE
                ((COUNT(DISTINCT child_id) - 
                 (SELECT COUNT(DISTINCT child_id) FROM attendance 
                  WHERE attendance_date BETWEEN current_week_start - INTERVAL '7 days' AND current_week_end - INTERVAL '7 days')
                ) * 100.0 / 
                (SELECT COUNT(DISTINCT child_id) FROM attendance 
                 WHERE attendance_date BETWEEN current_week_start - INTERVAL '7 days' AND current_week_end - INTERVAL '7 days'))
        END
    INTO 
        total_children, new_children, growth_percent
    FROM 
        attendance a
    JOIN 
        children c ON a.child_id = c.child_id
    WHERE 
        a.attendance_date BETWEEN current_week_start AND current_week_end;
    
    -- Generate service rows for HTML
    SELECT string_agg(
        '<tr>' ||
        '<td>' || s.service_name || '</td>' ||
        '<td>' || COALESCE(aa.total_attendance::TEXT, '0') || '</td>' ||
        '<td>' || COALESCE(aa.first_timers::TEXT, '0') || '</td>' ||
        '<td>' || COALESCE(aa.age_4_5_count::TEXT, '0') || '</td>' ||
        '<td>' || COALESCE(aa.age_6_7_count::TEXT, '0') || '</td>' ||
        '<td>' || COALESCE(aa.age_8_9_count::TEXT, '0') || '</td>' ||
        '<td>' || COALESCE(aa.age_10_12_count::TEXT, '0') || '</td>' ||
        '</tr>',
        ''
    )
    INTO service_rows
    FROM 
        services s
    LEFT JOIN 
        attendance_analytics aa ON s.service_id = aa.service_id AND aa.report_date = current_week_end;
    
    -- Generate HTML content
    email_html := 
        '<html><head><style>' ||
        'body { font-family: Arial, sans-serif; }' ||
        'table { border-collapse: collapse; width: 100%; }' ||
        'th, td { text-align: left; padding: 8px; border: 1px solid #ddd; }' ||
        'th { background-color: #f2f2f2; }' ||
        '.highlight { background-color: #e6f7ff; }' ||
        '</style></head><body>' ||
        '<h1>NextGen Ministry Weekly Report</h1>' ||
        '<p>Week of ' || TO_CHAR(current_week_start, 'Month DD, YYYY') || ' to ' || 
           TO_CHAR(current_week_end, 'Month DD, YYYY') || '</p>' ||
        '<div class="summary">' ||
        '<p><strong>Total Children:</strong> ' || COALESCE(total_children::TEXT, '0') || '</p>' ||
        '<p><strong>New Children:</strong> ' || COALESCE(new_children::TEXT, '0') || '</p>' ||
        '<p><strong>Growth Rate:</strong> ' || COALESCE(ROUND(growth_percent, 2)::TEXT, '0.00') || '%</p>' ||
        '</div>' ||
        '<h2>Service Breakdown</h2>' ||
        '<table>' ||
        '<tr><th>Service</th><th>Attendance</th><th>First Timers</th><th>4-5 YO</th><th>6-7 YO</th><th>8-9 YO</th><th>10-12 YO</th></tr>' ||
        COALESCE(service_rows, '<tr><td colspan="7">No data available</td></tr>') ||
        '</table>' ||
        '<p>Please find attached the detailed report for this week.</p>' ||
        '</body></html>';
    
    RETURN email_html;
END;
$$ LANGUAGE plpgsql;

-- Function to send weekly email report
CREATE OR REPLACE FUNCTION send_weekly_email_report()
RETURNS TABLE (
    batch_id TEXT,
    report_id INT,
    api_key TEXT,
    from_email TEXT,
    from_name TEXT,
    subject TEXT,
    email_html TEXT,
    total_batches INT
) AS $$
DECLARE
    email_content TEXT;
    batch_size_val INT;
    api_key_val TEXT;
    from_email_val TEXT;
    from_name_val TEXT;
    report_id_val INT;
    template_id_val INT;
    batch_uuid UUID;
BEGIN
    -- Generate a unique batch ID
    batch_uuid := gen_random_uuid();
    
    -- Get email configuration
    SELECT 
        api_key, from_email, from_name, batch_size, 
        (SELECT template_id FROM email_templates WHERE template_name = 'Weekly Report' AND is_active = TRUE LIMIT 1)
    INTO 
        api_key_val, from_email_val, from_name_val, batch_size_val, template_id_val
    FROM 
        email_api_config
    WHERE 
        is_active = TRUE
    LIMIT 1;
    
    -- Generate email content
    email_content := generate_weekly_email_content();
    
    -- Log the report generation
    INSERT INTO weekly_reports (
        week_start_date,
        week_end_date,
        email_sent_date,
        report_generated_by,
        notes
    )
    VALUES (
        CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER,
        CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 6,
        CURRENT_TIMESTAMP,
        1, -- Default admin
        'Email batch scheduled'
    )
    RETURNING report_id INTO report_id_val;
    
    -- Create temporary table for recipient batching
    CREATE TEMP TABLE IF NOT EXISTS temp_email_batch (
        recipient_email TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        guardian_id INT NOT NULL,
        batch_num INT NOT NULL,
        email_log_id INT
    ) ON COMMIT DROP;
    
    -- Insert recipients into temp table with batch numbers
    INSERT INTO temp_email_batch (recipient_email, recipient_name, guardian_id, batch_num)
    SELECT 
        g.email, 
        g.first_name || ' ' || g.last_name,
        g.guardian_id,
        (ROW_NUMBER() OVER (ORDER BY g.guardian_id) - 1) / batch_size_val
    FROM guardians g
    JOIN child_guardian cg ON g.guardian_id = cg.guardian_id
    JOIN children c ON cg.child_id = c.child_id
    WHERE 
        g.email IS NOT NULL
        AND c.is_active = TRUE 
        AND cg.is_primary = TRUE
    GROUP BY g.email, g.guardian_id;
    
    -- Log emails in email_logs table
    INSERT INTO email_logs (
        template_id,
        recipient_email,
        guardian_id,
        sent_date,
        status,
        notes
    )
    SELECT 
        template_id_val,
        recipient_email,
        guardian_id,
        CURRENT_TIMESTAMP,
        'pending',
        'Batch ID: ' || batch_uuid
    FROM temp_email_batch
    RETURNING log_id;
    
    -- Update temp table with email_log_ids
    UPDATE temp_email_batch t
    SET email_log_id = l.log_id
    FROM email_logs l
    WHERE t.recipient_email = l.recipient_email 
      AND t.guardian_id = l.guardian_id
      AND l.status = 'pending'
      AND l.sent_date >= CURRENT_TIMESTAMP - INTERVAL '1 minute';
    
    -- Return necessary data for application layer to process
    RETURN QUERY
    SELECT 
        batch_uuid::TEXT,
        report_id_val,
        api_key_val,
        from_email_val,
        from_name_val,
        (SELECT subject FROM email_templates WHERE template_id = template_id_val),
        email_content,
        (SELECT COALESCE(MAX(batch_num) + 1, 0) FROM temp_email_batch);
    
    -- Drop temp table
    DROP TABLE IF EXISTS temp_email_batch;
END;
$$ LANGUAGE plpgsql;

-- Function to get email recipients by batch
CREATE OR REPLACE FUNCTION get_email_batch_recipients(batch_id TEXT)
RETURNS TABLE (
    batch_num INT,
    emails TEXT,
    names TEXT,
    log_ids TEXT
) AS $$
BEGIN
    -- Create temporary table for recipient batching
    CREATE TEMP TABLE IF NOT EXISTS temp_recipients (
        recipient_email TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        batch_num INT NOT NULL,
        log_id INT
    ) ON COMMIT DROP;
    
    -- Insert recipients into temp table
    INSERT INTO temp_recipients (recipient_email, recipient_name, batch_num, log_id)
    SELECT 
        l.recipient_email,
        g.first_name || ' ' || g.last_name,
        (ROW_NUMBER() OVER (ORDER BY l.log_id) - 1) / 100, -- Default batch size
        l.log_id
    FROM email_logs l
    JOIN guardians g ON l.guardian_id = g.guardian_id
    WHERE l.notes LIKE 'Batch ID: ' || batch_id || '%'
      AND l.status = 'pending';
    
    -- Return batched recipients
    RETURN QUERY
    SELECT 
        t.batch_num,
        string_agg(t.recipient_email, ','),
        string_agg(t.recipient_name, ','),
        string_agg(t.log_id::TEXT, ',')
    FROM temp_recipients t
    GROUP BY t.batch_num
    ORDER BY t.batch_num;
    
    -- Drop temp table
    DROP TABLE IF EXISTS temp_recipients;
END;
$$ LANGUAGE plpgsql;

-- Function to prepare custom email
CREATE OR REPLACE FUNCTION prepare_custom_email(
    p_template_name TEXT,
    p_recipient_type TEXT,
    p_filter_value TEXT,
    p_custom_subject TEXT,
    p_custom_body TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    api_key TEXT,
    recipient_count INT,
    batch_id TEXT
) AS $$
DECLARE
    template_id_val INT;
    api_key_val TEXT;
    from_email_val TEXT;
    from_name_val TEXT;
    batch_size_val INT;
    batch_uuid UUID;
    recipient_count_val INT;
BEGIN
    -- Create temporary table
    CREATE TEMP TABLE IF NOT EXISTS temp_custom_batch (
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        child_id INT,
        guardian_id INT NOT NULL,
        batch_num INT NOT NULL
    ) ON COMMIT DROP;
    
    -- Get email configuration
    SELECT api_key, from_email, from_name, batch_size
    INTO api_key_val, from_email_val, from_name_val, batch_size_val
    FROM email_api_config
    WHERE is_active = TRUE
    LIMIT 1;
    
    -- Set batch ID
    batch_uuid := gen_random_uuid();
    
    -- Get template ID
    SELECT template_id INTO template_id_val
    FROM email_templates
    WHERE template_name = p_template_name AND is_active = TRUE
    LIMIT 1;
    
    -- Validate template
    IF template_id_val IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Email template not found', NULL, 0, NULL;
        RETURN;
    END IF;
    
    -- Populate recipients based on type
    IF p_recipient_type = 'all' THEN
        INSERT INTO temp_custom_batch (email, name, child_id, guardian_id, batch_num)
        SELECT 
            g.email, 
            g.first_name || ' ' || g.last_name,
            c.child_id,
            g.guardian_id,
            (ROW_NUMBER() OVER (ORDER BY g.guardian_id) - 1) / batch_size_val
        FROM guardians g
        JOIN child_guardian cg ON g.guardian_id = cg.guardian_id
        JOIN children c ON cg.child_id = c.child_id
        WHERE g.email IS NOT NULL AND c.is_active = TRUE
        GROUP BY g.email, g.guardian_id, c.child_id;
    
    ELSIF p_recipient_type = 'age_group' THEN
        INSERT INTO temp_custom_batch (email, name, child_id, guardian_id, batch_num)
        SELECT 
            g.email, 
            g.first_name || ' ' || g.last_name,
            c.child_id,
            g.guardian_id,
            (ROW_NUMBER() OVER (ORDER BY g.guardian_id) - 1) / batch_size_val
        FROM guardians g
        JOIN child_guardian cg ON g.guardian_id = cg.guardian_id
        JOIN children c ON cg.child_id = c.child_id
        JOIN age_categories ac ON c.age_category_id = ac.category_id
        WHERE g.email IS NOT NULL 
          AND c.is_active = TRUE
          AND ac.category_name = p_filter_value
        GROUP BY g.email, g.guardian_id, c.child_id;
    
    ELSIF p_recipient_type = 'service' THEN
        INSERT INTO temp_custom_batch (email, name, child_id, guardian_id, batch_num)
        SELECT 
            g.email, 
            g.first_name || ' ' || g.last_name,
            c.child_id,
            g.guardian_id,
            (ROW_NUMBER() OVER (ORDER BY g.guardian_id) - 1) / batch_size_val
        FROM guardians g
        JOIN child_guardian cg ON g.guardian_id = cg.guardian_id
        JOIN children c ON cg.child_id = c.child_id
        JOIN attendance a ON c.child_id = a.child_id
        JOIN services s ON a.service_id = s.service_id
        WHERE g.email IS NOT NULL 
          AND c.is_active = TRUE
          AND s.service_id = p_filter_value::INTEGER
        GROUP BY g.email, g.guardian_id, c.child_id;
    
    ELSIF p_recipient_type = 'guardians' THEN
        INSERT INTO temp_custom_batch (email, name, child_id, guardian_id, batch_num)
        SELECT 
            g.email,
            g.first_name || ' ' || g.last_name,
            NULL,
            g.guardian_id,
            (ROW_NUMBER() OVER (ORDER BY g.guardian_id) - 1) / batch_size_val
        FROM guardians g
        WHERE g.email IS NOT NULL;
    END IF;
    
    -- Count recipients
    SELECT COUNT(*) INTO recipient_count_val FROM temp_custom_batch;
    
    -- Check if we have recipients
    IF recipient_count_val = 0 THEN
        RETURN QUERY SELECT FALSE, 'No recipients found for the selected criteria', NULL, 0, NULL;
        RETURN;
    END IF;
    
    -- Log emails
    INSERT INTO email_logs (
        template_id,
        recipient_email,
        guardian_id,
        child_id,
        sent_date,
        status,
        notes
    )
    SELECT 
        template_id_val,
        email,
        guardian_id,
        child_id,
        CURRENT_TIMESTAMP,
        'pending',
        'Batch ID: ' || batch_uuid || ', Custom Email'
    FROM temp_custom_batch;
    
    -- Return success
    RETURN QUERY SELECT 
        TRUE, 
        'Email preparation successful with ' || recipient_count_val || ' recipients', 
        api_key_val, 
        recipient_count_val,
        batch_uuid::TEXT;
    
    -- Drop temp table
    DROP TABLE IF EXISTS temp_custom_batch;
END;
$$ LANGUAGE plpgsql;

-- Function to populate existing formal IDs
CREATE OR REPLACE FUNCTION populate_existing_formal_ids()
RETURNS VOID AS $$
DECLARE
    child_rec RECORD;
    year_prefix CHAR(2);
    next_seq INT;
    formatted_seq CHAR(4);
BEGIN
    FOR child_rec IN 
        SELECT child_id, registration_date 
        FROM children 
        WHERE formal_id IS NULL
        ORDER BY registration_date, child_id
    LOOP
        -- Get last 2 digits of registration year
        year_prefix := RIGHT(EXTRACT(YEAR FROM child_rec.registration_date)::TEXT, 2);
        
        -- Find the highest sequential number for this year
        SELECT COALESCE(MAX(CAST(SPLIT_PART(formal_id, '-', 2) AS INTEGER)), 0) + 1
        INTO next_seq
        FROM children
        WHERE formal_id LIKE year_prefix || '-%';
        
        -- Format the sequence number with leading zeros
        formatted_seq := LPAD(next_seq::TEXT, 4, '0');
        
        -- Update the formal_id
        UPDATE children 
        SET formal_id = year_prefix || '-' || formatted_seq
        WHERE child_id = child_rec.child_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to update age categories monthly
-- Note: For Supabase, you'll need to set up a cron job via the Supabase dashboard or Edge Functions
-- This is a placeholder function that would be called by the scheduler
CREATE OR REPLACE FUNCTION scheduled_update_age_categories()
RETURNS VOID AS $$
BEGIN
    PERFORM update_child_age_categories();
END;
$$ LANGUAGE plpgsql;

-- Call once after adding missing formal_ids
SELECT populate_existing_formal_ids();

-- Add RLS policies for Supabase
-- Example RLS policy for attendance table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all attendance" 
ON attendance FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can insert attendance" 
ON attendance FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Staff can update attendance" 
ON attendance FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Enable RLS for children table
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all children" 
ON children FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can insert children" 
ON children FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Staff can update children" 
ON children FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Enable RLS for guardians table
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all guardians" 
ON guardians FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can insert guardians" 
ON guardians FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Staff can update guardians" 
ON guardians FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Add user_id column to staff table
ALTER TABLE staff 
ADD COLUMN user_id UUID UNIQUE;

-- Update RLS policies to include user_id
CREATE POLICY "Staff can only update their own record" 
ON staff FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');

COMMENT ON POLICY "Staff can only update their own record" ON staff IS 'Staff can only update their own record';

-- Add profile_image column to staff table
ALTER TABLE staff 
ADD COLUMN profile_image_url VARCHAR(255);

-- Add profile_image_path column to store Firebase Storage path
ALTER TABLE staff 
ADD COLUMN profile_image_path VARCHAR(255);

-- Update RLS policies for the new columns
CREATE POLICY "Staff can update their own profile image" 
ON staff 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
    auth.uid() = user_id 
    AND (
        (OLD.profile_image_url IS DISTINCT FROM NEW.profile_image_url)
        OR (OLD.profile_image_path IS DISTINCT FROM NEW.profile_image_path)
    )
);

COMMENT ON POLICY "Staff can update their own profile image" ON staff 
IS 'Staff can update their own profile image URL and path';

-- Comment on RLS policies
COMMENT ON POLICY "Staff can view all attendance" ON attendance IS 'Authenticated users can view all attendance records';
COMMENT ON POLICY "Staff can insert attendance" ON attendance IS 'Authenticated users can create attendance records';
COMMENT ON POLICY "Staff can update attendance" ON attendance IS 'Authenticated users can update attendance records';

COMMENT ON POLICY "Staff can view all children" ON children IS 'Authenticated users can view all children records';
COMMENT ON POLICY "Staff can insert children" ON children IS 'Authenticated users can create children records';
COMMENT ON POLICY "Staff can update children" ON children IS 'Authenticated users can update children records';

COMMENT ON POLICY "Staff can view all guardians" ON guardians IS 'Authenticated users can view all guardian records';
COMMENT ON POLICY "Staff can insert guardians" ON guardians IS 'Authenticated users can create guardian records';
COMMENT ON POLICY "Staff can update guardians" ON guardians IS 'Authenticated users can update guardian records';