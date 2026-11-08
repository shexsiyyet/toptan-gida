import pytest
from supabase import create_client
import os
import sys

# Add tests directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')

@pytest.fixture
def supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

@pytest.fixture
def test_restaurant(supabase_client):
    """Create a test restaurant linked to a distributor"""
    # Create a distributor
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
def test_order(supabase_client, test_restaurant):
    """Create a test order with items"""
    # Create product
    prod_result = supabase_client.table('products').insert({
        'distributor_id': test_restaurant['distributor_id'],
        'sku': 'TOM-001',
        'name': 'Domates',
        'category': 'Sebze',
        'unit': 'kg',
        'price': 45.00,
        'stock_quantity': 100,
        'min_order_qty': 5,
        'is_active': True,
    }).execute()
    product_id = prod_result.data[0]['id']

    # Create order
    order_result = supabase_client.table('orders').insert({
        'restaurant_id': test_restaurant['id'],
        'distributor_id': test_restaurant['distributor_id'],
        'subtotal': 450.00,
        'platform_fee': 9.00,
        'total': 459.00,
        'status': 'delivered',
    }).execute()
    order_id = order_result.data[0]['id']

    # Create order items
    supabase_client.table('order_items').insert({
        'order_id': order_id,
        'product_id': product_id,
        'quantity': 10,
        'unit_price': 45.00,
        'line_total': 450.00,
    }).execute()

    yield {'id': order_id, 'restaurant_id': test_restaurant['id'], 'distributor_id': test_restaurant['distributor_id'], 'items': [{'product_id': product_id, 'quantity': 10, 'unit_price': 45.00}]}

    # Cleanup
    supabase_client.table('order_items').delete().eq('order_id', order_id).execute()
    supabase_client.table('orders').delete().eq('id', order_id).execute()
    supabase_client.table('products').delete().eq('id', product_id).execute()

# Import the reorder functions (will fail until implemented)
try:
    from lib.chef.reorder import create_reorder_template, create_order_from_template, get_reorder_templates, get_order_history
except ImportError:
    create_reorder_template = None
    create_order_from_template = None
    get_reorder_templates = None
    get_order_history = None

def test_create_template_from_order(supabase_client, test_order):
    """Test creating a reorder template from an existing order"""
    assert create_reorder_template is not None, "Function not implemented"

    template = create_reorder_template(test_order['id'], "Weekly Basics")
    assert template is not None
    assert template['name'] == "Weekly Basics"
    assert len(template['items']) == len(test_order['items'])

    # Reorder from template
    new_order = create_order_from_template(template['id'])
    assert new_order is not None
    assert new_order['restaurant_id'] == test_order['restaurant_id']

def test_get_reorder_templates(supabase_client, test_restaurant, test_order):
    """Test getting reorder templates for a restaurant"""
    assert get_reorder_templates is not None, "Function not implemented"

    # Create a template first
    create_reorder_template(test_order['id'], "Weekly Basics")

    templates = get_reorder_templates(test_restaurant['id'])
    assert isinstance(templates, list)
    assert len(templates) >= 1
    assert any(t['name'] == "Weekly Basics" for t in templates)

def test_get_order_history(supabase_client, test_restaurant, test_order):
    """Test getting order history for a restaurant"""
    assert get_order_history is not None, "Function not implemented"

    orders = get_order_history(test_restaurant['id'])
    assert isinstance(orders, list)
    assert len(orders) >= 1
    # Check order has expected fields
    order = orders[0]
    assert 'id' in order
    assert 'status' in order
    assert 'total' in order
    assert 'created_at' in order