
-- Migration: Add is_priority flag to plan_items
-- Purpose: Allow managers to flag specific items as high priority.

alter table public.plan_items 
add column is_priority boolean default false not null;

-- No new RLS needed as existing polices cover update/select
