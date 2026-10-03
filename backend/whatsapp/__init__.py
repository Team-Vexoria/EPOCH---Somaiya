"""
WhatsApp Bot Package for Mohra (Sell Smart).
Provides complete Meta WhatsApp Cloud API integration reusing the website's Agentic CRAG pipeline.
"""

from whatsapp.router import router
from whatsapp.formatter import format_for_whatsapp, split_long_message
from whatsapp.client import send_whatsapp_text, verify_webhook_signature
from whatsapp.store import get_user_profile, update_user_profile, get_conversation_history

__all__ = [
    "router",
    "format_for_whatsapp",
    "split_long_message",
    "send_whatsapp_text",
    "verify_webhook_signature",
    "get_user_profile",
    "update_user_profile",
    "get_conversation_history",
]
