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
def payment_mock():
    """Mock payment provider (İyzico/Paynet)"""
    mock = Mock()
    mock.create_checkout = AsyncMock()
    mock.verify_callback = Mock()
    return mock

@pytest.fixture
def test_distributor(supabase_client):
    """Create a test distributor"""
    dist_result = supabase_client.table('distributors').insert({
        'name': 'Test Distributor',
        'contact_name': 'Test Contact',
        'phone': '+905551234567',
        'email': 'test@distributor.com',
        'address': 'Test Address',
        'tax_number': '1234567890',
    }).execute()
    yield dist_result.data[0]
    supabase_client.table('distributors').delete().eq('id', dist_result.data[0]['id']).execute()

@pytest.fixture
def test_restaurant(supabase_client, test_distributor):
    """Create a test restaurant"""
    rest_result = supabase_client.table('restaurants').insert({
        'distributor_id': test_distributor['id'],
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
    supabase_client.table('restaurants').delete().eq('id', rest_result.data[0]['id']).execute()

@pytest.fixture
def test_order(supabase_client, test_restaurant, test_distributor):
    """Create a test order"""
    order_result = supabase_client.table('orders').insert({
        'restaurant_id': test_restaurant['id'],
        'distributor_id': test_distributor['id'],
        'status': 'confirmed',
        'subtotal': 500.00,
        'platform_fee': 10.00,
        'total': 510.00,
    }).execute()
    yield order_result.data[0]
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
    supabase_client.table('invoices').delete().eq('id', invoice_result.data[0]['id']).execute()

def test_create_payment_session(payment_mock, test_order):
    """Test creating a payment session returns checkout URL"""
    from lib.chef.payments import create_payment_session

    payment_mock.create_checkout.return_value = {
        'checkout_url': 'https://iyzico.com/checkout/abc123',
        'session_id': 'session_abc123'
    }

    with patch('lib.chef.payments.get_payment_provider', return_value=payment_mock):
        result = create_payment_session(test_order['id'])

    assert result['checkout_url'].startswith('https://')
    payment_mock.create_checkout.assert_called_once()
    call_args = payment_mock.create_checkout.call_args
    assert call_args.kwargs['amount'] == test_order['total']
    assert call_args.kwargs['currency'] in ('TRY', 'AZN')
    assert call_args.kwargs['reference'] == test_order['id']

def test_payment_callback_success(payment_mock, test_invoice):
    """Test successful payment callback records payment and updates invoice"""
    from lib.chef.payments import handle_payment_callback

    payment_mock.verify_callback.return_value = {
        'success': True,
        'amount': test_invoice['total'],
        'provider_ref': 'PAY-12345',
        'provider': 'iyzico'
    }

    with patch('lib.chef.payments.get_payment_provider', return_value=payment_mock):
        with patch('lib.chef.payments.supabase_client') as mock_supabase:
            mock_supabase.table.return_value.insert.return_value.execute.return_value = None
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = None

            handle_payment_callback({'payment_id': 'PAY-12345', 'invoice_id': test_invoice['id']})

    # Verify payment recorded
    mock_supabase.table.assert_any_call('payments')
    # Verify invoice updated to paid
    mock_supabase.table.assert_any_call('invoices')

def test_payment_callback_failure(payment_mock, test_invoice):
    """Test failed payment callback records failed payment"""
    from lib.chef.payments import handle_payment_callback

    payment_mock.verify_callback.return_value = {
        'success': False,
        'error': 'Insufficient funds',
        'provider_ref': 'PAY-12345',
        'provider': 'iyzico'
    }

    with patch('lib.chef.payments.get_payment_provider', return_value=payment_mock):
        with patch('lib.chef.payments.supabase_client') as mock_supabase:
            mock_supabase.table.return_value.insert.return_value.execute.return_value = None

            handle_payment_callback({'payment_id': 'PAY-12345', 'invoice_id': test_invoice['id']})

    # Verify failed payment recorded
    mock_supabase.table.assert_called_with('payments')
    call_args = mock_supabase.table.return_value.insert.call_args
    assert call_args[0][0]['status'] == 'failed'

def test_platform_fee_deduction(payment_mock, test_order, test_distributor):
    """Test 2% platform fee is calculated for distributor payout"""
    from lib.chef.payments import calculate_distributor_payout

    payout = calculate_distributor_payout(test_order['total'], 0.02)

    assert payout['platform_fee'] == round(test_order['total'] * 0.02, 2)
    assert payout['distributor_amount'] == test_order['total'] - payout['platform_fee']
    assert payout['currency'] in ('TRY', 'AZN')