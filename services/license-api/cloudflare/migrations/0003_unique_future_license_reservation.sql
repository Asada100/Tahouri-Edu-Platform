-- Prevent a student from holding more than one future reservation
-- for the same product and academic year, regardless of target grade.
-- Existing production data must be checked for duplicates before applying.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_future_license_reservation
ON licenses (product_id, student_id, academic_year)
WHERE status = 'future';
