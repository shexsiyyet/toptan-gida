import os
import sys
import pytest
from supabase import create_client, Client

# Add tests directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# Test configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:54321")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "test-key")


@pytest.fixture(scope="session")
def supabase_client() -> Client:
    """Create Supabase client for testing."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


@pytest.fixture(scope="session")
def test_restaurant(supabase_client):
    """Get a test restaurant from seed data."""
    result = supabase_client.table('restaurants').select('*').limit(1).execute()
    if result.data:
        return result.data[0]
    pytest.skip("No restaurant found in seed data")


from test_auth_helpers import sign_in_with_phone, verify_otp, get_current_restaurant


def test_phone_otp_flow(supabase_client, test_restaurant):
    """Test phone OTP authentication flow."""
    # Step 1: Initiate phone OTP sign in
    session = sign_in_with_phone(supabase_client, test_restaurant['phone'])
    assert session is not None
    assert session['user']['phone'] == test_restaurant['phone']

    # Step 2: Get current restaurant from session
    restaurant = get_current_restaurant(supabase_client, session)
    assert restaurant is not None
    assert restaurant['id'] == test_restaurant['id']
    assert restaurant['phone'] == test_restaurant['phone']


def test_get_current_restaurant_without_session(supabase_client):
    """Test getCurrentRestaurant returns None when no session."""
    restaurant = get_current_restaurant(supabase_client, None)
    assert restaurant is None