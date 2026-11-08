import os
import pytest
from supabase import create_client, Client
from datetime import datetime, timedelta

# Test configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:54321")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "test-key")


@pytest.fixture(scope="session")
def supabase_client() -> Client:
    """Create Supabase client for testing."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


@pytest.fixture(scope="session")
def test_distributor(supabase_client):
    """Get existing distributor from seed data."""
    result = supabase_client.table('distributors').select('id').limit(1).execute()
    if result.data:
        return result.data[0]
    pytest.skip("No distributor found in seed data")


@pytest.fixture(scope="session")
def test_restaurant(supabase_client, test_distributor):
    """Get existing restaurant from seed data."""
    result = supabase_client.table('restaurants').select('id').eq('distributor_id', test_distributor['id']).limit(1).execute()
    if result.data:
        return result.data[0]
    pytest.skip("No restaurant found in seed data")


@pytest.fixture(scope="session")
def test_order(supabase_client, test_distributor, test_restaurant):
    """Create a test order."""
    result = supabase_client.table('orders').insert({
        'restaurant_id': test_restaurant['id'],
        'distributor_id': test_distributor['id'],
        'status': 'confirmed',
        'subtotal': 5000.00,
        'platform_fee': 100.00,
        'total': 5100.00,
    }).execute()
    return result.data[0]


@pytest.fixture(scope="session")
def test_invoice(supabase_client, test_order):
    """Create a test invoice."""
    issue_date = datetime.now().isoformat()
    due_date = (datetime.now() + timedelta(days=30)).isoformat()
    result = supabase_client.table('invoices').insert({
        'order_id': test_order['id'],
        'invoice_number': 'INV-2026-0001',
        'pdf_url': 'https://example.com/invoice.pdf',
        'status': 'issued',
        'issued_at': issue_date,
        'due_at': due_date,
    }).execute()
    return result.data[0]


# Import the functions to test - these will be implemented in payments.ts
# For now, we define Python versions that mirror the expected behavior

async def record_payment_py(invoice_id: str, amount: float, provider: str, provider_ref: str, supabase_client: Client):
    """Record a payment for an invoice."""
    # Insert payment record
    payment_result = supabase_client.table('payments').insert({
        'invoice_id': invoice_id,
        'amount': amount,
        'provider': provider,
        'provider_ref': provider_ref,
        'status': 'completed',
    }).execute()

    if not payment_result.data:
        raise Exception("Failed to create payment record")

    payment = payment_result.data[0]

    # Check if invoice is fully paid
    payments_result = supabase_client.table('payments').select('amount').eq('invoice_id', invoice_id).execute()
    total_paid = sum(float(p['amount']) for p in (payments_result.data or []))

    # Get invoice total
    invoice_result = supabase_client.table('invoices').select('total').eq('id', invoice_id).single().execute()
    if invoice_result.data:
        invoice_total = float(invoice_result.data['total']) if invoice_result.data.get('total') else 0
        # Fallback: get total from order
        if invoice_total == 0:
            order_result = supabase_client.table('invoices').select('order_id').eq('id', invoice_id).single().execute()
            if order_result.data:
                order_id = order_result.data['order_id']
                order_result = supabase_client.table('orders').select('total').eq('id', order_id).single().execute()
                if order_result.data:
                    invoice_total = float(order_result.data['total'])

        if total_paid >= invoice_total and invoice_total > 0:
            # Update invoice to paid
            supabase_client.table('invoices').update({
                'status': 'paid',
                'paid_at': datetime.now().isoformat()
            }).eq('id', invoice_id).execute()

    return payment


def get_receivables_py(distributor_id: str, supabase_client: Client):
    """Get receivables aging report for a distributor."""
    # Get all invoices for this distributor's orders
    result = supabase_client.table('invoices').select(
        'id, status, issued_at, due_at, total, order_id'
    ).execute()

    invoices = result.data or []
    receivables = []

    for inv in invoices:
        # Get order to verify it belongs to this distributor
        order_result = supabase_client.table('orders').select('distributor_id').eq('id', inv['order_id']).single().execute()
        if not order_result.data or order_result.data['distributor_id'] != distributor_id:
            continue

        # Get payments for this invoice
        payments_result = supabase_client.table('payments').select('amount, status').eq('invoice_id', inv['id']).execute()
        total_paid = sum(float(p['amount']) for p in (payments_result.data or []) if p['status'] == 'completed')
        remaining = float(inv.get('total', 0)) - total_paid if inv.get('total') else 0

        # Calculate days overdue
        due_date = datetime.fromisoformat(inv['due_at'].replace('Z', '+00:00'))
        days_overdue = (datetime.now(due_date.tzinfo) - due_date).days
        if days_overdue < 0:
            days_overdue = 0

        if remaining > 0:
            receivables.append({
                'invoiceId': inv['id'],
                'amount': remaining,
                'dueDate': inv['due_at'],
                'daysOverdue': days_overdue,
            })

    return receivables


def test_record_payment_updates_invoice(supabase_client, test_invoice):
    """Test that recording a payment updates invoice status to paid when fully paid."""
    import asyncio

    payment = asyncio.run(record_payment_py(test_invoice['id'], 5100.00, 'manual', 'CASH-001', supabase_client))
    assert payment['amount'] == 5100.00

    invoice = supabase_client.table('invoices').select('status, paid_at').eq('id', test_invoice['id']).single().execute()
    assert invoice.data['status'] == 'paid'
    assert invoice.data['paid_at'] is not None


def test_record_partial_payment_keeps_issued(supabase_client, test_invoice):
    """Test that partial payment keeps invoice as issued/overdue."""
    import asyncio

    # Reset invoice to issued first
    supabase_client.table('invoices').update({'status': 'issued', 'paid_at': None}).eq('id', test_invoice['id']).execute()
    supabase_client.table('payments').delete().eq('invoice_id', test_invoice['id']).execute()

    payment = asyncio.run(record_payment_py(test_invoice['id'], 2000.00, 'manual', 'CASH-002', supabase_client))
    assert payment['amount'] == 2000.00

    invoice = supabase_client.table('invoices').select('status, paid_at').eq('id', test_invoice['id']).single().execute()
    assert invoice.data['status'] in ('issued', 'overdue')
    assert invoice.data['paid_at'] is None


def test_get_receivables_returns_aging(supabase_client, test_distributor, test_invoice):
    """Test get_receivables returns aging report with correct days overdue."""
    receivables = get_receivables_py(test_distributor['id'], supabase_client)
    assert isinstance(receivables, list)
    assert len(receivables) >= 1

    inv = receivables[0]
    assert 'invoiceId' in inv
    assert 'amount' in inv
    assert 'dueDate' in inv
    assert 'daysOverdue' in inv
    assert inv['invoiceId'] == test_invoice['id']
    assert inv['amount'] == 5100.00


def test_record_payment_creates_payment_record(supabase_client, test_invoice):
    """Test that record_payment creates a payment row."""
    import asyncio

    # Reset invoice
    supabase_client.table('invoices').update({'status': 'issued', 'paid_at': None}).eq('id', test_invoice['id']).execute()
    supabase_client.table('payments').delete().eq('invoice_id', test_invoice['id']).execute()

    payment = asyncio.run(record_payment_py(test_invoice['id'], 1000.00, 'iyzico', 'PAY-123', supabase_client))
    assert payment['amount'] == 1000.00
    assert payment['provider'] == 'iyzico'
    assert payment['provider_ref'] == 'PAY-123'
    assert payment['status'] == 'completed'
    assert payment['invoice_id'] == test_invoice['id']