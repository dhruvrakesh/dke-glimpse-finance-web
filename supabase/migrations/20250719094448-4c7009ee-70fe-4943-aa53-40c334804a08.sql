
-- Create storage bucket for financial uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('financial_uploads', 'financial_uploads', true);

-- Create RLS policies for the financial_uploads bucket
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'financial_uploads');

CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'financial_uploads');

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'financial_uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'financial_uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
