-- Guest / extra tiffin counts recorded by admin for each attendance date.
-- Safe to run more than once; existing attendance rows default to zero extras.
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS extra_lunch_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_dinner_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_extra_lunch_count_nonnegative
    CHECK (extra_lunch_count >= 0),
  ADD CONSTRAINT attendance_extra_dinner_count_nonnegative
    CHECK (extra_dinner_count >= 0);
