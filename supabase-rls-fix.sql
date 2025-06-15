-- Fix RLS Policies for Smart Order Intake
-- Run this in your Supabase SQL Editor to allow anonymous users to insert orders

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow read for anonymous" ON orders;
DROP POLICY IF EXISTS "Allow read for anonymous" ON products;

-- Add comprehensive policies for anonymous users
-- Allow anonymous users to INSERT, SELECT, and UPDATE orders (for demo purposes)
CREATE POLICY "Allow anonymous to insert orders" ON orders 
    FOR INSERT TO anon 
    WITH CHECK (true);

CREATE POLICY "Allow anonymous to select orders" ON orders 
    FOR SELECT TO anon 
    USING (true);

CREATE POLICY "Allow anonymous to update orders" ON orders 
    FOR UPDATE TO anon 
    USING (true);

-- Allow anonymous users to read products
CREATE POLICY "Allow anonymous to select products" ON products 
    FOR SELECT TO anon 
    USING (true);

-- Allow anonymous users to work with customers
CREATE POLICY "Allow anonymous to insert customers" ON customers 
    FOR INSERT TO anon 
    WITH CHECK (true);

CREATE POLICY "Allow anonymous to select customers" ON customers 
    FOR SELECT TO anon 
    USING (true);

-- Allow anonymous users to work with order validations
CREATE POLICY "Allow anonymous to insert validations" ON order_validations 
    FOR INSERT TO anon 
    WITH CHECK (true);

CREATE POLICY "Allow anonymous to select validations" ON order_validations 
    FOR SELECT TO anon 
    USING (true);

-- Optional: For production, you might want more restrictive policies like:
-- CREATE POLICY "Allow anonymous to insert orders" ON orders 
--     FOR INSERT TO anon 
--     WITH CHECK (id IS NOT NULL AND raw_email IS NOT NULL);

-- Verify the policies are working
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('orders', 'products', 'customers', 'order_validations')
ORDER BY tablename, policyname; 