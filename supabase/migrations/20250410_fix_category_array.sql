
-- Fix array format issues in the venues table for string types
UPDATE public.venues
SET 
  category_name = ARRAY[category_name]
WHERE 
  category_name IS NOT NULL AND 
  category_name::text NOT LIKE '{%}' AND
  category_name IS NOT NULL AND
  NOT (category_name IS NULL);
