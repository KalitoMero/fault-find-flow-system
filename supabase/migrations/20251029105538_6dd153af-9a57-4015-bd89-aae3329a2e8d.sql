-- Add row_index column to excel_data table to preserve order
ALTER TABLE excel_data ADD COLUMN IF NOT EXISTS row_index INTEGER;

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_excel_data_row_index ON excel_data(row_index);