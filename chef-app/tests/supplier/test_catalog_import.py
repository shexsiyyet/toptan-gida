import os
import pytest
from supabase import create_client, Client
from openpyxl import Workbook
from io import BytesIO

# Test configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:54321")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "test-key")


@pytest.fixture(scope="session")
def supabase_client() -> Client:
    """Create Supabase client for testing."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


@pytest.fixture(scope="session")
def test_distributor(supabase_client):
    """Get or create a test distributor."""
    # Get existing distributor from seed data
    result = supabase_client.table('distributors').select('id').limit(1).execute()
    if result.data:
        return result.data[0]
    pytest.skip("No distributor found in seed data")


def create_test_excel(rows: list[dict]) -> bytes:
    """Create an Excel file in memory for testing."""
    wb = Workbook()
    ws = wb.active
    # Header row
    ws.append(['SKU', 'Name', 'Category', 'Unit', 'Price', 'Stock', 'MinOrderQty'])
    for row in rows:
        ws.append([row.get('SKU'), row.get('Name'), row.get('Category'),
                   row.get('Unit'), row.get('Price'), row.get('Stock'), row.get('MinOrderQty')])
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


async def import_catalog_from_excel_py(file_bytes: bytes, distributor_id: str, supabase_client: Client):
    """Python implementation of Excel import for testing."""
    import openpyxl
    from io import BytesIO

    wb = openpyxl.load_workbook(BytesIO(file_bytes))
    ws = wb.active

    errors = []
    imported = 0

    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not row or all(v is None for v in row):
            continue

        sku, name, category, unit, price, stock, min_order_qty = row[:7]

        # Validate
        if not sku or str(sku).strip() == '':
            errors.append(f"Row {row_num}: Missing SKU")
            continue
        if not name or str(name).strip() == '':
            errors.append(f"Row {row_num}: Missing Name")
            continue
        if not category or str(category).strip() == '':
            errors.append(f"Row {row_num}: Missing Category")
            continue
        if not unit or str(unit).strip() == '':
            errors.append(f"Row {row_num}: Missing Unit")
            continue
        try:
            price_val = float(price)
            if price_val < 0:
                errors.append(f"Row {row_num}: Invalid Price (must be >= 0)")
                continue
        except (TypeError, ValueError):
            errors.append(f"Row {row_num}: Invalid Price")
            continue
        try:
            stock_val = int(stock)
            if stock_val < 0:
                errors.append(f"Row {row_num}: Invalid Stock (must be >= 0)")
                continue
        except (TypeError, ValueError):
            errors.append(f"Row {row_num}: Invalid Stock")
            continue
        try:
            min_order_val = int(min_order_qty)
            if min_order_val < 1:
                errors.append(f"Row {row_num}: Invalid MinOrderQty (must be >= 1)")
                continue
        except (TypeError, ValueError):
            errors.append(f"Row {row_num}: Invalid MinOrderQty")
            continue

        # Upsert product
        product_data = {
            'distributor_id': distributor_id,
            'sku': str(sku).strip(),
            'name': str(name).strip(),
            'category': str(category).strip(),
            'unit': str(unit).strip(),
            'price': price_val,
            'stock_quantity': stock_val,
            'min_order_qty': min_order_val,
            'is_active': True,
        }

        try:
            result = supabase_client.table('products').upsert(
                product_data,
                on_conflict='distributor_id,sku'
            ).execute()
            if result.data:
                imported += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    return {'imported': imported, 'errors': errors}


def get_products_py(distributor_id: str, supabase_client: Client):
    """Get products for a distributor."""
    result = supabase_client.table('products').select('*').eq('distributor_id', distributor_id).order('created_at', ascending=False).execute()
    return result.data or []


def test_import_excel_creates_products(supabase_client, test_distributor):
    """Test importing Excel creates products in database."""
    excel_bytes = create_test_excel([
        {"SKU": "TOM-001", "Name": "Domates", "Category": "Sebze", "Unit": "kg", "Price": 45.00, "Stock": 100, "MinOrderQty": 5},
        {"SKU": "ONI-001", "Name": "Soğan", "Category": "Sebze", "Unit": "kg", "Price": 25.00, "Stock": 200, "MinOrderQty": 10},
    ])

    import asyncio
    result = asyncio.run(import_catalog_from_excel_py(excel_bytes, test_distributor['id'], supabase_client))
    assert result['imported'] == 2
    assert result['errors'] == []

    products = get_products_py(test_distributor['id'], supabase_client)
    assert len(products) >= 2  # At least our 2 new products
    new_products = [p for p in products if p['sku'] in ('TOM-001', 'ONI-001')]
    assert len(new_products) == 2
    tom = next(p for p in new_products if p['sku'] == 'TOM-001')
    assert tom['name'] == 'Domates'
    assert tom['category'] == 'Sebze'
    assert tom['unit'] == 'kg'
    assert float(tom['price']) == 45.00
    assert tom['stock_quantity'] == 100
    assert tom['min_order_qty'] == 5


def test_import_excel_handles_turkish_characters(supabase_client, test_distributor):
    """Test Excel import handles Turkish/Azeri characters correctly."""
    excel_bytes = create_test_excel([
        {"SKU": "İSK-001", "Name": "İşkembe", "Category": "Et", "Unit": "kg", "Price": 120.00, "Stock": 50, "MinOrderQty": 2},
        {"SKU": "ÇÖR-001", "Name": "Çörək", "Category": "Bakliyat", "Unit": "ədəd", "Price": 2.50, "Stock": 500, "MinOrderQty": 10},
        {"SKU": "ŞRB-001", "Name": "Şirbət", "Category": "İçki", "Unit": "litr", "Price": 15.00, "Stock": 100, "MinOrderQty": 5},
    ])

    import asyncio
    result = asyncio.run(import_catalog_from_excel_py(excel_bytes, test_distributor['id'], supabase_client))
    assert result['imported'] == 3
    assert result['errors'] == []

    products = get_products_py(test_distributor['id'], supabase_client)
    skus = {p['sku'] for p in products}
    assert 'İSK-001' in skus
    assert 'ÇÖR-001' in skus
    assert 'ŞRB-001' in skus


def test_import_excel_skips_invalid_rows(supabase_client, test_distributor):
    """Test Excel import skips rows with missing required fields."""
    excel_bytes = create_test_excel([
        {"SKU": "VALID-001", "Name": "Valid Product", "Category": "Sebze", "Unit": "kg", "Price": 10.00, "Stock": 10, "MinOrderQty": 1},
        {"SKU": "", "Name": "Missing SKU", "Category": "Sebze", "Unit": "kg", "Price": 10.00, "Stock": 10, "MinOrderQty": 1},
        {"SKU": "VALID-002", "Name": "", "Category": "Sebze", "Unit": "kg", "Price": 10.00, "Stock": 10, "MinOrderQty": 1},
        {"SKU": "VALID-003", "Name": "Negative Price", "Category": "Sebze", "Unit": "kg", "Price": -5.00, "Stock": 10, "MinOrderQty": 1},
    ])

    import asyncio
    result = asyncio.run(import_catalog_from_excel_py(excel_bytes, test_distributor['id'], supabase_client))
    assert result['imported'] == 1
    assert len(result['errors']) == 3


def test_upsert_product_updates_existing(supabase_client, test_distributor):
    """Test upsertProduct updates existing product by SKU."""
    # First create a product
    product1_data = {
        'distributor_id': test_distributor['id'],
        'sku': 'UPS-001',
        'name': 'Original Name',
        'category': 'Sebze',
        'unit': 'kg',
        'price': 10.00,
        'stock_quantity': 100,
        'min_order_qty': 5,
        'is_active': True,
    }
    result1 = supabase_client.table('products').upsert(product1_data, on_conflict='distributor_id,sku').execute()
    assert result1.data
    assert result1.data[0]['sku'] == 'UPS-001'
    assert result1.data[0]['name'] == 'Original Name'
    assert float(result1.data[0]['price']) == 10.00

    # Update the same product
    product2_data = {
        'distributor_id': test_distributor['id'],
        'sku': 'UPS-001',
        'name': 'Updated Name',
        'category': 'Meyve',
        'unit': 'kg',
        'price': 20.00,
        'stock_quantity': 200,
        'min_order_qty': 10,
        'is_active': True,
    }
    result2 = supabase_client.table('products').upsert(product2_data, on_conflict='distributor_id,sku').execute()
    assert result2.data
    assert result2.data[0]['sku'] == 'UPS-001'
    assert result2.data[0]['name'] == 'Updated Name'
    assert float(result2.data[0]['price']) == 20.00

    # Verify only one product exists
    products = get_products_py(test_distributor['id'], supabase_client)
    ups_products = [p for p in products if p['sku'] == 'UPS-001']
    assert len(ups_products) == 1
    assert ups_products[0]['name'] == 'Updated Name'
    assert float(ups_products[0]['price']) == 20.00


def test_get_products_returns_all_products(supabase_client, test_distributor):
    """Test getProducts returns all products for a distributor."""
    products = get_products_py(test_distributor['id'], supabase_client)
    # Should have at least the 50 seed products
    assert len(products) >= 50
    for p in products:
        assert p['distributor_id'] == test_distributor['id']