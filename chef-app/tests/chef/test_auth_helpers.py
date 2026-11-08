"""Python implementations of auth functions for testing."""
from supabase import Client
from typing import Optional, Dict, Any


def sign_in_with_phone(supabase_client: Client, phone: str) -> Optional[Dict[str, Any]]:
    """Initiate phone OTP sign in using Supabase Auth."""
    try:
        response = supabase_client.auth.sign_in_with_otp({"phone": phone})
        if response.session:
            return {
                "user": {
                    "id": response.user.id if response.user else None,
                    "phone": response.user.phone if response.user else phone,
                },
                "session": {
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                }
            }
        # If no session yet (OTP sent), return user info
        if response.user:
            return {
                "user": {
                    "id": response.user.id,
                    "phone": response.user.phone,
                },
                "session": None
            }
        return None
    except Exception:
        return None


def verify_otp(supabase_client: Client, phone: str, code: str) -> Optional[Dict[str, Any]]:
    """Verify OTP code and return session."""
    try:
        response = supabase_client.auth.verify_otp({"phone": phone, "token": code, "type": "sms"})
        if response.session and response.user:
            return {
                "user": {
                    "id": response.user.id,
                    "phone": response.user.phone,
                },
                "session": {
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                }
            }
        return None
    except Exception:
        return None


def get_current_restaurant(supabase_client: Client, session: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Get restaurant profile from session."""
    if not session or not session.get("user") or not session["user"].get("id"):
        return None

    user_id = session["user"]["id"]
    try:
        # Get restaurant by matching auth user id (assuming restaurants table has auth_user_id or we match by phone)
        # Since we don't have auth_user_id in restaurants table, we match by phone
        phone = session["user"].get("phone")
        if not phone:
            return None

        result = supabase_client.table('restaurants').select('*').eq('phone', phone).single().execute()
        if result.data:
            return result.data
        return None
    except Exception:
        return None