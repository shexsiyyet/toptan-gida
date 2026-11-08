import pytest
from unittest.mock import Mock, AsyncMock, patch
import os
from supabase import create_client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')

@pytest.fixture
def supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

@pytest.fixture
def telegram_mock():
    """Mock Telegram bot for testing"""
    mock = Mock()
    mock.send_message = AsyncMock()
    mock.edit_message_text = AsyncMock()
    return mock

@pytest.fixture
def test_restaurant_with_chat_id(supabase_client):
    """Create a test restaurant with telegram_chat_id"""
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

    # Create restaurant linked to distributor with telegram_chat_id
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
        'telegram_chat_id': 123456789,
    }).execute()
    yield rest_result.data[0]

    # Cleanup
    supabase_client.table('restaurants').delete().eq('id', rest_result.data[0]['id']).execute()
    supabase_client.table('distributors').delete().eq('id', distributor_id).execute()

@pytest.fixture
def test_order(supabase_client, test_restaurant_with_chat_id):
    """Create a test order"""
    order_result = supabase_client.table('orders').insert({
        'restaurant_id': test_restaurant_with_chat_id['id'],
        'distributor_id': test_restaurant_with_chat_id['distributor_id'],
        'status': 'confirmed',
        'subtotal': 500.00,
        'platform_fee': 10.00,
        'total': 510.00,
        'notes': 'Test order',
    }).execute()
    yield order_result.data[0]

    # Cleanup
    supabase_client.table('orders').delete().eq('id', order_result.data[0]['id']).execute()

@pytest.fixture
def test_invoice(supabase_client, test_order):
    """Create a test invoice"""
    invoice_result = supabase_client.table('invoices').insert({
        'order_id': test_order['id'],
        'invoice_number': 'INV-2026-001',
        'status': 'issued',
        'issued_at': '2026-01-15T10:00:00Z',
        'due_at': '2026-02-14T10:00:00Z',
        'total': 510.00,
    }).execute()
    yield invoice_result.data[0]

    # Cleanup
    supabase_client.table('invoices').delete().eq('id', invoice_result.data[0]['id']).execute()

def test_order_notification_sent(telegram_mock, test_restaurant_with_chat_id, test_order):
    """Test that order confirmed notification is sent via Telegram"""
    from lib.chef.telegram import send_order_notification

    with patch('lib.chef.telegram.get_bot', return_value=telegram_mock):
        send_order_notification(test_restaurant_with_chat_id['id'], test_order)

    telegram_mock.send_message.assert_called_once()
    args = telegram_mock.send_message.call_args
    assert "Yeni sipariş" in args.kwargs['text']
    assert test_order['id'] in args.kwargs['text']

def test_invoice_notification_sent(telegram_mock, test_restaurant_with_chat_id, test_invoice):
    """Test that invoice issued notification is sent via Telegram"""
    from lib.chef.telegram import send_invoice_notification

    with patch('lib.chef.telegram.get_bot', return_value=telegram_mock):
        send_invoice_notification(test_restaurant_with_chat_id['id'], test_invoice)

    telegram_mock.send_message.assert_called_once()
    args = telegram_mock.send_message.call_args
    assert "Fatura" in args.kwargs['text']
    assert test_invoice['invoice_number'] in args.kwargs['text']

def test_handle_start_command_links_restaurant(telegram_mock, supabase_client):
    """Test /start command links restaurant via code"""
    from lib.chef.telegram import handle_telegram_webhook

    # Create a restaurant with a link code
    dist_result = supabase_client.table('distributors').insert({
        'name': 'Test Distributor 2',
        'contact_name': 'Test Contact 2',
        'phone': '+905551234569',
        'email': 'test2@distributor.com',
        'address': 'Test Address 2',
        'tax_number': '1234567892',
    }).execute()
    distributor_id = dist_result.data[0]['id']

    rest_result = supabase_client.table('restaurants').insert({
        'distributor_id': distributor_id,
        'name': 'Test Restaurant 2',
        'contact_name': 'Test Chef 2',
        'phone': '+905551234570',
        'email': 'test2@restaurant.com',
        'address': 'Test Restaurant Address 2',
        'tax_number': '1234567893',
        'subscription_tier': 'basic',
        'subscription_status': 'active',
        'telegram_link_code': 'LINK-CODE-123',
    }).execute()
    restaurant_id = rest_result.data[0]['id']

    update = {
        'message': {
            'chat': {'id': 987654321},
            'text': '/start LINK-CODE-123',
            'from': {'id': 987654321},
        }
    }

    with patch('lib.chef.telegram.get_bot', return_value=telegram_mock):
        with patch('lib.chef.telegram.supabase_client', supabase_client):
            handle_telegram_webhook(update)

    telegram_mock.send_message.assert_called()

    # Cleanup
    supabase_client.table('restaurants').delete().eq('id', restaurant_id).execute()
    supabase_client.table('distributors').delete().eq('id', distributor_id).execute()

def test_handle_orders_command_shows_recent(telegram_mock, test_restaurant_with_chat_id, supabase_client):
    """Test /orders command shows recent orders"""
    from lib.chef.telegram import handle_telegram_webhook

    # Create a test order
    order_result = supabase_client.table('orders').insert({
        'restaurant_id': test_restaurant_with_chat_id['id'],
        'distributor_id': test_restaurant_with_chat_id['distributor_id'],
        'status': 'confirmed',
        'subtotal': 500.00,
        'platform_fee': 10.00,
        'total': 510.00,
    }).execute()
    order_id = order_result.data[0]['id']

    update = {
        'message': {
            'chat': {'id': 123456789},
            'text': '/orders',
            'from': {'id': 123456789},
        }
    }

    with patch('lib.chef.telegram.get_bot', return_value=telegram_mock):
        with patch('lib.chef.telegram.supabase_client', supabase_client):
            handle_telegram_webhook(update)

    telegram_mock.send_message.assert_called()
    args = telegram_mock.send_message.call_args
    assert order_id[:8] in args.kwargs['text']

    # Cleanup
    supabase_client.table('orders').delete().eq('id', order_id).execute()

def test_handle_reorder_command(telegram_mock, test_restaurant_with_chat_id, supabase_client):
    """Test /reorder command triggers quick reorder"""
    from lib.chef.telegram import handle_telegram_webhook

    # Create a test order with items
    order_result = supabase_client.table('orders').insert({
        'restaurant_id': test_restaurant_with_chat_id['id'],
        'distributor_id': test_restaurant_with_chat_id['distributor_id'],
        'status': 'confirmed',
        'subtotal': 500.00,
        'platform_fee': 10.00,
        'total': 510.00,
    }).execute()
    order_id = order_result.data[0]['id']

    supabase_client.table('order_items').insert({
        'order_id': order_id,
        'product_id': 'test-product-id',
        'quantity': 10,
        'unit_price': 50.00,
        'line_total': 500.00,
    }).execute()

    update = {
        'message': {
            'chat': {'id': 123456789},
            'text': '/reorder',
            'from': {'id': 123456789},
        }
    }

    with patch('lib.chef.telegram.get_bot', return_value=telegram_mock):
        with patch('lib.chef.telegram.supabase_client', supabase_client):
            handle_telegram_webhook(update)

    telegram_mock.send_message.assert_called()

    # Cleanup
    supabase_client.table('order_items').delete().eq('order_id', order_id).execute()
    supabase_client.table('orders').delete().eq('id', order_id).execute()