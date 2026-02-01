"""
Email-based OTP service for Django backend.

Handles:
- OTP generation (numeric, configurable length)
- Storage in Django cache with TTL
- Sending OTP via SMTP (Django email)
- Verification with expiry and single-use
- Rate limiting per email per purpose
"""
from __future__ import annotations

import random
import string
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils import timezone

# Purpose constants for OTP (used in cache keys and API)
OTP_PURPOSE_SIGNUP = 'signup'
OTP_PURPOSE_LOGIN = 'login'
OTP_PURPOSE_PASSWORD_RESET = 'password_reset'
OTP_PURPOSE_EMAIL_VERIFY = 'email_verify'

OTP_PURPOSES = (
    OTP_PURPOSE_SIGNUP,
    OTP_PURPOSE_LOGIN,
    OTP_PURPOSE_PASSWORD_RESET,
    OTP_PURPOSE_EMAIL_VERIFY,
)


def _cache_key_otp(email: str, purpose: str) -> str:
    """Cache key for storing OTP data."""
    return f"otp:{purpose}:{email.lower().strip()}"


def _cache_key_rate(email: str, purpose: str) -> str:
    """Cache key for rate-limit counter."""
    return f"otp_rate:{purpose}:{email.lower().strip()}"


def _generate_code(length: int = None) -> str:
    """Generate a numeric OTP code."""
    length = length or getattr(settings, 'OTP_LENGTH', 6)
    return ''.join(random.choices(string.digits, k=length))


def _is_rate_limited(email: str, purpose: str) -> bool:
    """Return True if this email has exceeded send rate for the given purpose."""
    key = _cache_key_rate(email, purpose)
    data = cache.get(key)
    if not data:
        return False
    count = data.get('count', 0)
    max_count = getattr(settings, 'OTP_RATE_LIMIT_COUNT', 3)
    return count >= max_count


def _increment_rate(email: str, purpose: str) -> None:
    """Increment rate-limit counter for this email/purpose."""
    key = _cache_key_rate(email, purpose)
    window = getattr(settings, 'OTP_RATE_LIMIT_WINDOW_SECONDS', 900)
    data = cache.get(key) or {'count': 0}
    data['count'] = data['count'] + 1
    cache.set(key, data, timeout=window)


def send_otp(email: str, purpose: str) -> tuple[bool, str]:
    """
    Generate OTP, store in cache, and send via email.

    Args:
        email: Recipient email (normalized to lowercase).
        purpose: One of OTP_PURPOSES (signup, login, password_reset, email_verify).

    Returns:
        (success: bool, message: str)
    """
    email = email.strip().lower()
    if not email or '@' not in email:
        return False, 'Invalid email address.'
    if purpose not in OTP_PURPOSES:
        return False, 'Invalid purpose.'

    if _is_rate_limited(email, purpose):
        return False, 'Too many OTP requests. Please try again later.'

    code = _generate_code()
    valid_seconds = getattr(settings, 'OTP_VALID_SECONDS', 600)
    cache_key = _cache_key_otp(email, purpose)
    cache.set(cache_key, {'code': code, 'created_at': timezone.now().isoformat()}, timeout=valid_seconds)
    _increment_rate(email, purpose)

    subject = 'Your verification code'
    message = f'Your verification code is: {code}\n\nIt is valid for {valid_seconds // 60} minutes. Do not share it.'
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
    if not from_email:
        from_email = getattr(settings, 'EMAIL_HOST_USER', 'noreply@example.com')

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        return False, f'Failed to send email: {str(e)}'

    return True, 'OTP sent to your email.'


def verify_otp(email: str, code: str, purpose: str) -> tuple[bool, str]:
    """
    Verify OTP for the given email and purpose. OTP is consumed (single-use).

    Args:
        email: Email that received the OTP.
        code: User-supplied OTP code.
        purpose: Same purpose used when sending.

    Returns:
        (success: bool, message: str)
    """
    email = email.strip().lower()
    if not email or not code or purpose not in OTP_PURPOSES:
        return False, 'Invalid email, code, or purpose.'

    cache_key = _cache_key_otp(email, purpose)
    data = cache.get(cache_key)
    if not data:
        return False, 'OTP expired or not found. Please request a new code.'
    stored_code = (data.get('code') or '').strip()
    if not stored_code or stored_code != code.strip():
        return False, 'Invalid or expired code.'
    cache.delete(cache_key)
    return True, 'Verification successful.'


def consume_otp_if_valid(email: str, code: str, purpose: str) -> bool:
    """
    Verify OTP and consume it. Returns True only if valid; no message.
    Convenience wrapper for use in other flows (e.g. signup, password reset).
    """
    ok, _ = verify_otp(email, code, purpose)
    return ok
