-- Migration: 002_rls_policies.sql
-- Row Level Security policies for Toptan Gıda marketplace

-- Enable RLS on all tables
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- distributors policies
-- Full access to own rows via auth.uid() = id
-- ============================================================
CREATE POLICY "distributors_select_own" ON distributors
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "distributors_insert_own" ON distributors
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "distributors_update_own" ON distributors
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "distributors_delete_own" ON distributors
    FOR DELETE USING (auth.uid() = id);

-- ============================================================
-- restaurants policies
-- Full access to own rows via auth.uid() = id
-- ============================================================
CREATE POLICY "restaurants_select_own" ON restaurants
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "restaurants_insert_own" ON restaurants
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "restaurants_update_own" ON restaurants
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "restaurants_delete_own" ON restaurants
    FOR DELETE USING (auth.uid() = id);

-- ============================================================
-- products policies
-- Distributors: CRUD own products
-- Restaurants: READ active products from their distributor
-- ============================================================
CREATE POLICY "products_distributor_select" ON products
    FOR SELECT USING (auth.uid() = distributor_id);

CREATE POLICY "products_distributor_insert" ON products
    FOR INSERT WITH CHECK (auth.uid() = distributor_id);

CREATE POLICY "products_distributor_update" ON products
    FOR UPDATE USING (auth.uid() = distributor_id) WITH CHECK (auth.uid() = distributor_id);

CREATE POLICY "products_distributor_delete" ON products
    FOR DELETE USING (auth.uid() = distributor_id);

CREATE POLICY "products_restaurant_select" ON products
    FOR SELECT USING (
        is_active = true
        AND distributor_id IN (
            SELECT distributor_id FROM restaurants WHERE id = auth.uid()
        )
    );

-- ============================================================
-- orders policies
-- Restaurants: CRUD own orders
-- Distributors: READ orders for their products
-- ============================================================
CREATE POLICY "orders_restaurant_select" ON orders
    FOR SELECT USING (auth.uid() = restaurant_id);

CREATE POLICY "orders_restaurant_insert" ON orders
    FOR INSERT WITH CHECK (auth.uid() = restaurant_id);

CREATE POLICY "orders_restaurant_update" ON orders
    FOR UPDATE USING (auth.uid() = restaurant_id) WITH CHECK (auth.uid() = restaurant_id);

CREATE POLICY "orders_restaurant_delete" ON orders
    FOR DELETE USING (auth.uid() = restaurant_id);

CREATE POLICY "orders_distributor_select" ON orders
    FOR SELECT USING (
        distributor_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = orders.id
            AND p.distributor_id = auth.uid()
        )
    );

-- ============================================================
-- order_items policies
-- Same as orders (via order relationship)
-- ============================================================
CREATE POLICY "order_items_restaurant_select" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders WHERE id = order_items.order_id AND restaurant_id = auth.uid()
        )
    );

CREATE POLICY "order_items_restaurant_insert" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders WHERE id = order_items.order_id AND restaurant_id = auth.uid()
        )
    );

CREATE POLICY "order_items_restaurant_update" ON order_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM orders WHERE id = order_items.order_id AND restaurant_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders WHERE id = order_items.order_id AND restaurant_id = auth.uid()
        )
    );

CREATE POLICY "order_items_restaurant_delete" ON order_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM orders WHERE id = order_items.order_id AND restaurant_id = auth.uid()
        )
    );

CREATE POLICY "order_items_distributor_select" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN products p ON order_items.product_id = p.id
            WHERE o.id = order_items.order_id
            AND (o.distributor_id = auth.uid() OR p.distributor_id = auth.uid())
        )
    );

-- ============================================================
-- invoices policies
-- Distributors: CRUD own invoices (for their orders)
-- Restaurants: READ own invoices
-- ============================================================
CREATE POLICY "invoices_distributor_select" ON invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders WHERE id = invoices.order_id AND distributor_id = auth.uid()
        )
    );

CREATE POLICY "invoices_distributor_insert" ON invoices
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders WHERE id = invoices.order_id AND distributor_id = auth.uid()
        )
    );

CREATE POLICY "invoices_distributor_update" ON invoices
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM orders WHERE id = invoices.order_id AND distributor_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders WHERE id = invoices.order_id AND distributor_id = auth.uid()
        )
    );

CREATE POLICY "invoices_distributor_delete" ON invoices
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM orders WHERE id = invoices.order_id AND distributor_id = auth.uid()
        )
    );

CREATE POLICY "invoices_restaurant_select" ON invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders WHERE id = invoices.order_id AND restaurant_id = auth.uid()
        )
    );

-- ============================================================
-- payments policies
-- Distributors: READ own payments (for their invoices)
-- ============================================================
CREATE POLICY "payments_distributor_select" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN orders o ON i.order_id = o.id
            WHERE i.id = payments.invoice_id
            AND o.distributor_id = auth.uid()
        )
    );