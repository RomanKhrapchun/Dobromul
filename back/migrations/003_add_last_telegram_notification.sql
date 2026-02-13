-- Migration: Add last_telegram_notification_at field to community_settings
-- Date: 2026-01-28
-- Description: Stores the date of the last Telegram notification about database update
--              to limit notifications to once per 20 days

-- Add new column for tracking last notification date
ALTER TABLE config.community_settings
ADD COLUMN IF NOT EXISTS last_telegram_notification_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Comment on column
COMMENT ON COLUMN config.community_settings.last_telegram_notification_at
IS 'Timestamp of the last Telegram notification about database update. Used to limit notifications to once per 20 days.';
