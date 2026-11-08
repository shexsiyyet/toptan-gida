-- Migration: 003_reorder_templates.sql
-- Creates reorder_templates table for chef reorder functionality

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- reorder_templates table
-- ============================================================
CREATE TABLE reorder_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying templates by restaurant
CREATE INDEX idx_reorder_templates_restaurant_id ON reorder_templates(restaurant_id);

-- RLS policies for reorder_templates
ALTER TABLE reorder_templates ENABLE ROW LEVEL SECURITY;

-- Restaurants can CRUD their own templates
CREATE POLICY "Restaurants can manage own reorder templates"
    ON reorder_templates
    FOR ALL
    USING (auth.uid() = restaurant_id);