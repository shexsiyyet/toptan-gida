-- Migration: 004_telegram_chat_id.sql
-- Adds telegram_chat_id and telegram_link_code columns to restaurants table for Telegram bot integration

-- Add telegram_chat_id column to restaurants
ALTER TABLE restaurants
ADD COLUMN telegram_chat_id BIGINT UNIQUE;

-- Add telegram_link_code column for one-time linking
ALTER TABLE restaurants
ADD COLUMN telegram_link_code TEXT UNIQUE;

-- Index for looking up restaurant by chat_id
CREATE INDEX idx_restaurants_telegram_chat_id ON restaurants(telegram_chat_id);

-- Index for looking up restaurant by link_code
CREATE INDEX idx_restaurants_telegram_link_code ON restaurants(telegram_link_code);