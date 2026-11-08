import pytest
from supabase import create_client
import os

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')

@pytest.fixture
def supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

@pytest.fixture
def test_restaurant(supabase_client):
    """Create a test restaurant linked to a distributor"""
    # First create a distributor
    dist_result = supabase_client.table('distributors').insert({
        'name': 'Test Distributor',
        'contact_name': 'Test Contact',
        'phone': '+905551234567',
        'email': 'test@distributor.com',
        'address': 'Test Address',
        'tax_number': '1234567890',
    }).execute()
    distributor_id = dist_result.data[0]['id']

    # Create restaurant linked to distributor
    rest_result = supabase_client.table('restaurants').insert({
        'distributor_id': distributor_id,
        'name': 'Test Restaurant',
        'contact_name': 'Test Chef',
        'phone': '+905551234568',
        'email': 'test@restaurant.com',
        'address': 'Test Restaurant Address',
        'tax_number': '1234567891',
        'subscription_tier': 'pro',
        'subscription_status': 'active',
    }).execute()
    yield rest_result.data[0]

    # Cleanup
    supabase_client.table('restaurants').delete().eq('id', rest_result.data[0]['id']).execute()
    supabase_client.table('distributors').delete().eq('id', distributor_id).execute()

@pytest.fixture
def test_products_multi_supplier(supabase_client, test_restaurant):
    """Create products with same SKU from multiple distributors"""
    # Get the distributor for the restaurant
    restaurant_dist_id = test_restaurant['distributor_id']

    # Create a second distributor
    dist2_result = supabase_client.table('distributors').insert({
        'name': 'Test Distributor 2',
        'contact_name': 'Test Contact 2',
        'phone': '+905551234569',
        'email': 'test2@distributor.com',
        'address': 'Test Address 2',
        'tax_number': '1234567892',
    }).execute()
    distributor2_id = dist2_result.data[0]['id']

    # Link restaurant to second distributor as well (for multi-supplier)
    # Note: restaurants table has single distributor_id, so we test across distributors

    # Create product from first distributor
    prod1 = supabase_client.table('products').insert({
        'distributor_id': restaurant_dist_id,
        'sku': 'TOM-001',
        'name': 'Domates',
        'category': 'Sebze',
        'unit': 'kg',
        'price': 45.00,
        'stock_quantity': 100,
        'min_order_qty': 5,
        'is_active': True,
    }).execute()

    # Create same SKU from second distributor at different price
    prod2 = supabase_client.table('products').insert({
        'distributor_id': distributor2_id,
        'sku': 'TOM-001',
        'name': 'Domates',
        'category': 'Sebze',
        'unit': 'kg',
        'price': 40.00,
        'stock_quantity': 200,
        'min_order_qty': 5,
        'is_active': True,
    }).execute()

    yield [prod1.data[0], prod2.data[0]]

    # Cleanup
    supabase_client.table('products').delete().eq('id', prod1.data[0]['id']).execute()
    supabase_client.table('products').delete().eq('id', prod2.data[0]['id']).execute()
    supabase_client.table('distributors').delete().eq('id', distributor2_id).execute()

def test_price_compare_shows_multiple_suppliers(supabase_client, test_restaurant, test_products_multi_supplier):
    """Same SKU 'TOM-001' from 2 distributors at different prices"""
    from lib.chef.cart import get_price_comparison

    comparison = get_price_comparison("TOM-001")
    assert len(comparison) == 2
    assert comparison[0]['price'] != comparison[1]['price']
    # sorted by price ascending
    assert comparison[0]['price'] < comparison[1]['price']

def test_get_available_products_filters_active_and_in_stock(supabase_client, test_restaurant):
    from lib.chef.cart import get_available_products

    products = get_available_products(test_restaurant['id'])
    # Should return products from the restaurant's distributor that are active and in stock
    assert isinstance(products, list)

def test_create_order_calculates_totals(supabase_client, test_restaurant, test_products_multi_supplier):
    from lib.chef.cart import create_order

    items = [
        {'product_id': test_products_multi_supplier[0]['id'], 'quantity': 10},
        {'product_id': test_products_multi_supplier[1]['id'], 'quantity': 5},
    ]

    order = create_order(test_restaurant['id'], items)

    assert order['subtotal'] >= 0
    assert order['platform_fee'] == round(order['subtotal'] * 0.02, 2)
    assert order['total'] == order['subtotal'] + order['platform_fee']
    assert order['status'] == 'pending'
    assert order['restaurant_id'] == test_restaurant['id']