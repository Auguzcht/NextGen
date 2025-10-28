-- Add template_type column to email_templates table
-- This migration adds a template_type field to categorize email templates

-- Add the template_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_templates' 
        AND column_name = 'template_type'
    ) THEN
        ALTER TABLE email_templates 
        ADD COLUMN template_type VARCHAR(50) DEFAULT 'notification';
    END IF;
END $$;

-- Update existing templates to have a default type if NULL
UPDATE email_templates 
SET template_type = 'notification' 
WHERE template_type IS NULL;

-- Add a check constraint for valid template types
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'email_templates_template_type_check'
    ) THEN
        ALTER TABLE email_templates
        ADD CONSTRAINT email_templates_template_type_check
        CHECK (template_type IN ('notification', 'welcome', 'reminder', 'report', 'announcement'));
    END IF;
END $$;

-- Update the body_html column name if it's still 'body'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_templates' 
        AND column_name = 'body'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_templates' 
        AND column_name = 'body_html'
    ) THEN
        ALTER TABLE email_templates 
        RENAME COLUMN body TO body_html;
    END IF;
END $$;

-- Add body_text column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_templates' 
        AND column_name = 'body_text'
    ) THEN
        ALTER TABLE email_templates 
        ADD COLUMN body_text TEXT;
    END IF;
END $$;

-- Add comment to the template_type column
COMMENT ON COLUMN email_templates.template_type IS 'Type of email template: notification, welcome, reminder, report, or announcement';

-- Create an index on template_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_email_templates_template_type 
ON email_templates(template_type);

-- Update specific templates based on their names (optional)
UPDATE email_templates SET template_type = 'welcome' WHERE template_name ILIKE '%welcome%';
UPDATE email_templates SET template_type = 'reminder' WHERE template_name ILIKE '%reminder%';
UPDATE email_templates SET template_type = 'report' WHERE template_name ILIKE '%report%' OR template_name ILIKE '%weekly%';
UPDATE email_templates SET template_type = 'announcement' WHERE template_name ILIKE '%announcement%';
