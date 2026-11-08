import os
import pytest
from supabase import create_client, Client

# Test configuration - uses environment variables for Supabase connection
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:54321")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "test-key")


@pytest.fixture(scope="session")
def supabase_client() -> Client:
    """Create Supabase client for testing."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def test_tables_exist(supabase_client):
    """Test that all required tables exist and are accessible."""
    tables = [
        'distributors',
        'restaurants',
        'products',
        'orders',
        'order_items',
        'invoices',
        'payments'
    ]
    for table in tables:
        result = supabase_client.table(table).select('*').limit(1).execute()
        assert result.data is not None, f"Table '{table}' does not exist or is not accessible"


def test_distributors_schema(supabase_client):
    """Test distributors table has correct columns."""
    result = supabase_client.table('distributors').select('*').limit(1).execute()
    if result.data:
        row = result.data[0]
        expected_cols = {'id', 'name', 'contact_name', 'phone', 'email', 'address', 'tax_number', 'payment_terms_days', 'commission_rate', 'created_at'}
        assert set(row.keys()) == expected_cols


def test_restaurants_schema(supabase_client):
    """Test restaurants table has correct columns and foreign key."""
    result = supabase_client.table('restaurants').select('*').limit(1).execute()
    if result.data:
        row = result.data[0]
        expected_cols = {'id', 'distributor_id', 'name', 'contact_name', 'phone', 'email', 'address', 'tax_number', 'subscription_tier', 'subscription_status', 'created_at'}
        assert set(row.keys()) == expected_cols


def test_products_schema(supabase_client):
    """Test products table has correct columns and foreign key."""
    result = supabase_client.table('products').select('*').limit(1).execute()
    if result.data:
        row = result.data[0]
        expected_cols = {'id', 'distributor_id', 'sku', 'name', 'category', 'unit', 'price', 'stock_quantity', 'min_order_qty', 'is_active', 'created_at'}
        assert set(row.keys()) == expected_cols


def test_orders_schema(supabase_client):
    """Test orders table has correct columns and foreign keys."""
    result = supabase_client.table('orders').select('*').limit(1).execute()
    if result.data:
        row = result.data[0]
        expected_cols = {'id', 'restaurant_id', 'distributor_id', 'status', 'subtotal', 'platform_fee', 'total', 'notes', 'created_at', 'confirmed_at'}
        assert set(row.keys()) == expected_cols


def test_order_items_schema(supabase_client):
    """Test order_items table has correct columns and foreign keys."""
    result = supabase_client.table('order_items').select('*').limit(1).execute()
    if result.data:
        row = result.data[0]
        expected_cols = {'id', 'order_id', 'product_id', 'quantity', 'unit_price', 'line_total'}
        assert set(row.keys()) == expected_cols


def test_invoices_schema(supabase_client):
    """Test invoices table has correct columns and foreign key."""
    result = supabase_client.table('invoices').select('*').limit(1).execute()
    if result.data:
        row = result.data[0]
        expected_cols = {'id', 'order_id', 'invoice_number', 'pdf_url', 'status', 'issued_at', 'due_at', 'paid_at'}
        assert set(row.keys()) == expected_cols


def test_payments_schema(supabase_client):
    """Test payments table has correct columns and foreign key."""
    result = supabase_client.table('payments').select('*').limit(1).execute()
    if result.data:
        row = result.data[0]
        expected_cols = {'id', 'invoice_id', 'amount', 'provider', 'provider_ref', 'status', 'created_at'}
        assert set(row.keys()) == expected_cols


def test_foreign_key_relationships(supabase_client):
    """Test that foreign key relationships are properly enforced via seed data."""
    # Test products -> distributors
    products = supabase_client.table('products').select('distributor_id').limit(1).execute()
    assert products.data is not None
    if products.data:
        dist_id = products.data[0]['distributor_id']
        distributor = supabase_client.table('distributors').select('id').eq('id', dist_id).execute()
        assert distributor.data is not None and len(distributor.data) == 1

    # Test restaurants -> distributors
    restaurants = supabase_client.table('restaurants').select('distributor_id').limit(1).execute()
    assert restaurants.data is not None
    if restaurants.data:
        dist_id = restaurants.data[0]['distributor_id']
        distributor = supabase_client.table('distributors').select('id').eq('id', dist_id).execute()
        assert distributor.data is not None and len(distributor.data) == 1

    # Test orders -> restaurants
    orders = supabase_client.table('orders').select('restaurant_id').limit(1).execute()
    if orders.data:
        rest_id = orders.data[0]['restaurant_id']
        restaurant = supabase_client.table('restaurants').select('id').eq('id', rest_id).execute()
        assert restaurant.data is not None and len(restaurant.data) == 1

    # Test orders -> distributors
    if orders.data:
        dist_id = orders.data[0]['distributor_id']
        distributor = supabase_client.table('distributors').select('id').eq('id', dist_id).execute()
        assert distributor.data is not None and len(distributor.data) == 1

    # Test order_items -> orders
    order_items = supabase_client.table('order_items').select('order_id').limit(1).execute()
    if order_items.data:
        order_id = order_items.data[0]['order_id']
        order = supabase_client.table('orders').select('id').eq('id', order_id).execute()
        assert order.data is not None and len(order.data) == 1

    # Test order_items -> products
    if order_items.data:
        prod_id = order_items.data[0]['product_id']
        product = supabase_client.table('products').select('id').eq('id', prod_id).execute()
        assert product.data is not None and len(product.data) == 1

    # Test invoices -> orders
    invoices = supabase_client.table('invoices').select('order_id').limit(1).execute()
    if invoices.data:
        order_id = invoices.data[0]['order_id']
        order = supabase_client.table('orders').select('id').eq('id', order_id).execute()
        assert order.data is not None and len(order.data) == 1

    # Test payments -> invoices
    payments = supabase_client.table('payments').select('invoice_id').limit(1).execute()
    if payments.data:
        inv_id = payments.data[0]['invoice_id']
        invoice = supabase_client.table('invoices').select('id').eq('id', inv_id).execute()
        assert invoice.data is not None and len(invoice.data) == 1


def test_seed_data_counts(supabase_client):
    """Test that seed data has expected counts."""
    # 1 distributor
    dist = supabase_client.table('distributors').select('id', count='exact').execute()
    assert dist.count == 1

    # 3 restaurants
    rest = supabase_client.table('restaurants').select('id', count='exact').execute()
    assert rest.count == 3

    # 50 products
    prod = supabase_client.table('products').select('id', count='exact').execute()
    assert prod.count == 50

    # Products distributed across 6 categories
    categories = supabase_client.table('products').select('category').execute()
    unique_cats = set(row['category'] for row in categories.data)
    expected_cats = {'Sebze', 'Meyve', 'Et', 'Süt', 'Bakliyat', 'Baharat'}
    assert unique_cats == expected_cats


def test_subscription_tier_values(supabase_client):
    """Test subscription_tier only allows valid values."""
    result = supabase_client.table('restaurants').select('subscription_tier').execute()
    valid_tiers = {'free', 'basic', 'pro'}
    for row in result.data:
        assert row['subscription_tier'] in valid_tiers


def test_subscription_status_values(supabase_client):
    """Test subscription_status only allows valid values."""
    result = supabase_client.table('restaurants').select('subscription_status').execute()
    valid_statuses = {'active', 'past_due', 'cancelled'}
    for row in result.data:
        assert row['subscription_status'] in valid_statuses


def test_order_status_values(supabase_client):
    """Test orders.status only allows valid values."""
    result = supabase_client.table('orders').select('status').execute()
    valid_statuses = {'pending', 'confirmed', 'preparing', 'delivered', 'cancelled'}
    for row in result.data:
        assert row['status'] in valid_statuses


def test_invoice_status_values(supabase_client):
    """Test invoices.status only allows valid values."""
    result = supabase_client.table('invoices').select('status').execute()
    valid_statuses = {'issued', 'paid', 'overdue', 'cancelled'}
    for row in result.data:
        assert row['status'] in valid_statuses


def test_payment_status_values(supabase_client):
    """Test payments.status only allows valid values."""
    result = supabase_client.table('payments').select('status').execute()
    valid_statuses = {'pending', 'completed', 'failed', 'refunded'}
    for row in result.data:
        assert row['status'] in valid_statuses


def test_numeric_precision(supabase_client):
    """Test numeric columns have correct precision (12,2)."""
    # Check products.price
    result = supabase_client.table('products').select('price').limit(1).execute()
    if result.data:
        price = result.data[0]['price']
        # Should have at most 2 decimal places
        assert round(float(price), 2) == float(price)

    # Check orders.subtotal, platform_fee, total
    result = supabase_client.table('orders').select('subtotal, platform_fee, total').limit(1).execute()
    if result.data:
        for field in ['subtotal', 'platform_fee', 'total']:
            val = result.data[0][field]
            assert round(float(val), 2) == float(val)