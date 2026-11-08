-- Migration: seed.sql
-- Seed data for Toptan Gıda marketplace
-- 1 test distributor, 3 test restaurants, 50 test products across categories

-- ============================================================
-- Distributors (1)
-- ============================================================
INSERT INTO distributors (id, name, contact_name, phone, email, address, tax_number, payment_terms_days, commission_rate)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Toptan Gıda Ana Depo',
    'Ahmet Yılmaz',
    '+90 212 555 0101',
    'depo@toptangida.com',
    'Organize Sanayi Bölgesi 1. Cadde No:15, İstanbul',
    '1234567890',
    30,
    0.0200
);

-- ============================================================
-- Restaurants (3 linked to distributor)
-- ============================================================
INSERT INTO restaurants (id, distributor_id, name, contact_name, phone, email, address, tax_number, subscription_tier, subscription_status)
VALUES
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Kebapçı Mehmet Usta',
        'Mehmet Demir',
        '+90 212 555 0202',
        'mehmet@kebapci.com',
        'Kadıköy, Caferağa Mah. Moda Cad. No:45, İstanbul',
        '9876543210',
        'pro',
        'active'
    ),
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Pideci Ali',
        'Ali Kaya',
        '+90 212 555 0303',
        'ali@pideci.com',
        'Beşiktaş, Abbasaga Mah. Dibekli Sok. No:12, İstanbul',
        '5555666677',
        'basic',
        'active'
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Lokanta Leyla',
        'Leyla Özkan',
        '+90 212 555 0404',
        'leyla@lokanta.com',
        'Şişli, Mecidiyeköy Mah. Büyükdere Cad. No:88, İstanbul',
        '1111222233',
        'free',
        'active'
    );

-- ============================================================
-- Products (50 across 6 categories: Sebze, Meyve, Et, Süt, Bakliyat, Baharat)
-- ============================================================
-- Sebze (Vegetables) - 10 products
INSERT INTO products (id, distributor_id, sku, name, category, unit, price, stock_quantity, min_order_qty, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEB-001', 'Domates', 'Sebze', 'kg', 45.00, 500, 5, true),
    ('11111111-1111-1111-1111-111111111112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEB-002', 'Salatalık', 'Sebze', 'kg', 35.00, 400, 5, true),
    ('11111111-1111-1111-1111-111111111113', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEB-003', 'Biber (Sivri)', 'Sebze', 'kg', 55.00, 300, 3, true),
    ('11111111-1111-1111-1111-111111111114', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEB-004', 'Patlıcan', 'Sebze', 'kg', 40.00, 350, 5, true),
    ('11111111-1111-1111-1111-111111111115', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEB-005', 'Soğan', 'Sebze', 'kg', 25.00, 600, 10, true),
    ('11111111-1111-1111-1111-111111111116', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEB-006', 'Sarımsak', 'Sebze', 'kg', 80.00, 200, 2, true),
    ('11111111-1111-1111-1111-111111111117', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEB-007', 'Havuç', 'Sebze', 'kg', 30.00, 450, 5, true),
    ('11111111-1111-1111-1111-111111111118', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEB-008', 'Patates', 'Sebze', 'kg', 20.00, 800, 10, true),
    ('11111111-1111-1111-1111-111111111119', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEB-009', 'Ispanak', 'Sebze', 'kg', 60.00, 150, 3, true),
    ('11111111-1111-1111-1111-111111111120', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SEB-010', 'Pırasa', 'Sebze', 'kg', 35.00, 250, 3, true);

-- Meyve (Fruits) - 8 products
INSERT INTO products (id, distributor_id, sku, name, category, unit, price, stock_quantity, min_order_qty, is_active) VALUES
    ('22222222-2222-2222-2222-222222222221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MEY-001', 'Elma (Golden)', 'Meyve', 'kg', 55.00, 400, 5, true),
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MEY-002', 'Muz', 'Meyve', 'kg', 65.00, 300, 5, true),
    ('22222222-2222-2222-2222-222222222223', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MEY-003', 'Portakal', 'Meyve', 'kg', 45.00, 350, 5, true),
    ('22222222-2222-2222-2222-222222222224', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MEY-004', 'Üzüm (Beyaz)', 'Meyve', 'kg', 70.00, 200, 3, true),
    ('22222222-2222-2222-2222-222222222225', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MEY-005', 'Çilek', 'Meyve', 'kg', 120.00, 100, 2, true),
    ('22222222-2222-2222-2222-222222222226', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MEY-006', 'Karpuz', 'Meyve', 'kg', 25.00, 500, 10, true),
    ('22222222-2222-2222-2222-222222222227', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MEY-007', 'Kavun', 'Meyve', 'kg', 35.00, 300, 5, true),
    ('22222222-2222-2222-2222-222222222228', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MEY-008', 'Limon', 'Meyve', 'kg', 50.00, 250, 3, true);

-- Et (Meat) - 10 products
INSERT INTO products (id, distributor_id, sku, name, category, unit, price, stock_quantity, min_order_qty, is_active) VALUES
    ('33333333-3333-3333-3333-333333333331', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ET-001', 'Dana Eti (Kuşbaşı)', 'Et', 'kg', 450.00, 100, 2, true),
    ('33333333-3333-3333-3333-333333333332', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ET-002', 'Kuzu Eti (Kavurma)', 'Et', 'kg', 550.00, 80, 2, true),
    ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ET-003', 'Tavuk Göğsü', 'Et', 'kg', 180.00, 200, 3, true),
    ('33333333-3333-3333-3333-333333333334', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ET-004', 'Tavuk But', 'Et', 'kg', 160.00, 250, 3, true),
    ('33333333-3333-3333-3333-333333333335', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ET-005', 'Kıyma (Dana)', 'Et', 'kg', 420.00, 150, 2, true),
    ('33333333-3333-3333-3333-333333333336', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ET-006', 'Sucuk', 'Et', 'kg', 380.00, 120, 2, true),
    ('33333333-3333-3333-3333-333333333337', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ET-007', 'Salam', 'Et', 'kg', 350.00, 100, 1, true),
    ('33333333-3333-3333-3333-333333333338', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ET-008', 'Jambon', 'Et', 'kg', 320.00, 100, 1, true),
    ('33333333-3333-3333-3333-333333333339', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ET-009', 'Dana Bonfile', 'Et', 'kg', 650.00, 50, 1, true),
    ('33333333-3333-3333-3333-333333333340', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ET-010', 'Kuzu Pirzola', 'Et', 'kg', 600.00, 60, 1, true);

-- Süt (Dairy) - 8 products
INSERT INTO products (id, distributor_id, sku, name, category, unit, price, stock_quantity, min_order_qty, is_active) VALUES
    ('44444444-4444-4444-4444-444444444441', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SUT-001', 'Süt (Tam Yağlı)', 'Süt', 'L', 22.00, 500, 10, true),
    ('44444444-4444-4444-4444-444444444442', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SUT-002', 'Beyaz Peynir', 'Süt', 'kg', 280.00, 200, 3, true),
    ('44444444-4444-4444-4444-444444444443', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SUT-003', 'Kaşar Peyniri', 'Süt', 'kg', 320.00, 150, 2, true),
    ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SUT-004', 'Tereyağı', 'Süt', 'kg', 450.00, 100, 2, true),
    ('44444444-4444-4444-4444-444444444445', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SUT-005', 'Yoğurt', 'Süt', 'kg', 35.00, 300, 5, true),
    ('44444444-4444-4444-4444-444444444446', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SUT-006', 'Krema', 'Süt', 'L', 85.00, 150, 3, true),
    ('44444444-4444-4444-4444-444444444447', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SUT-007', 'Lor Peyniri', 'Süt', 'kg', 180.00, 100, 2, true),
    ('44444444-4444-4444-4444-444444444448', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SUT-008', 'Mozzarella', 'Süt', 'kg', 290.00, 120, 2, true);

-- Bakliyat (Legumes/Grains) - 8 products
INSERT INTO products (id, distributor_id, sku, name, category, unit, price, stock_quantity, min_order_qty, is_active) VALUES
    ('55555555-5555-5555-5555-555555555551', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAK-001', 'Pirinç (Baldo)', 'Bakliyat', 'kg', 45.00, 500, 10, true),
    ('55555555-5555-5555-5555-555555555552', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAK-002', 'Bulgur (Köftelik)', 'Bakliyat', 'kg', 35.00, 400, 5, true),
    ('55555555-5555-5555-5555-555555555553', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAK-003', 'Mercimek (Kırmızı)', 'Bakliyat', 'kg', 40.00, 350, 5, true),
    ('55555555-5555-5555-5555-555555555554', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAK-004', 'Nohut', 'Bakliyat', 'kg', 50.00, 300, 5, true),
    ('55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAK-005', 'Kuru Fasulye', 'Bakliyat', 'kg', 55.00, 250, 5, true),
    ('55555555-5555-5555-5555-555555555556', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAK-006', 'Bezelye', 'Bakliyat', 'kg', 45.00, 200, 3, true),
    ('55555555-5555-5555-5555-555555555557', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAK-007', 'Erişte', 'Bakliyat', 'kg', 60.00, 150, 2, true),
    ('55555555-5555-5555-5555-555555555558', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAK-008', 'Mantı', 'Bakliyat', 'kg', 80.00, 100, 2, true);

-- Baharat (Spices) - 6 products
INSERT INTO products (id, distributor_id, sku, name, category, unit, price, stock_quantity, min_order_qty, is_active) VALUES
    ('66666666-6666-6666-6666-666666666661', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAH-001', 'Tuz', 'Baharat', 'kg', 15.00, 1000, 10, true),
    ('66666666-6666-6666-6666-666666666662', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAH-002', 'Karabiber', 'Baharat', 'kg', 180.00, 100, 1, true),
    ('66666666-6666-6666-6666-666666666663', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAH-003', 'Pul Biber', 'Baharat', 'kg', 120.00, 150, 2, true),
    ('66666666-6666-6666-6666-666666666664', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAH-004', 'Kimyon', 'Baharat', 'kg', 90.00, 200, 2, true),
    ('66666666-6666-6666-6666-666666666665', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAH-005', 'Kekik', 'Baharat', 'kg', 150.00, 80, 1, true),
    ('66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAH-006', 'Nane', 'Baharat', 'kg', 110.00, 100, 1, true);