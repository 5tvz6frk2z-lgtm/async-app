-- Add 'custom_question' to the plan_items type check constraint
-- This allows storing custom rotating question answers alongside plan items

-- Drop the existing constraint
ALTER TABLE public.plan_items DROP CONSTRAINT IF EXISTS plan_items_type_check;

-- Re-create with the new allowed value
ALTER TABLE public.plan_items ADD CONSTRAINT plan_items_type_check
  CHECK (type IN ('plan_for_tomorrow', 'actual_done_today', 'custom_question'));
