"""
store.py - SQLite User Profile & Conversation History Store for WhatsApp.

Maintains per-phone farmer state across WhatsApp conversations:
- Preferred language ('en', 'mr', 'hi')
- Selected crops & batch quantity
- Resolved village origin
- Last 10 conversation turns for contextual follow-up parity with the website.
"""

import os
import re
import json
import sqlite3
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger("whatsapp_store")

DB_DIR = Path(__file__).resolve().parent / ".." / "data"
DB_PATH = DB_DIR / "whatsapp_users.db"


def _get_connection() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the SQLite tables for user profiles and message history."""
    conn = _get_connection()
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_profiles (
                    phone TEXT PRIMARY KEY,
                    language TEXT DEFAULT 'en',
                    crop TEXT DEFAULT 'onion',
                    quantity REAL DEFAULT 20.0,
                    village TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS conversation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(phone) REFERENCES user_profiles(phone)
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_history_phone ON conversation_history(phone, timestamp)
            """)
    finally:
        conn.close()


# Initialize on import
init_db()


def clean_phone_number(raw_phone: str) -> str:
    """Normalizes phone number to digits only."""
    return re.sub(r"[^\d]", "", str(raw_phone)) or "test_user"


def get_user_profile(raw_phone: str) -> Dict[str, Any]:
    """Retrieves user profile; creates default if new user."""
    phone = clean_phone_number(raw_phone)
    conn = _get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT phone, language, crop, quantity, village FROM user_profiles WHERE phone = ?", (phone,))
        row = cur.fetchone()
        if row:
            return {
                "phone": row["phone"],
                "language": row["language"] or "en",
                "crop": row["crop"] or "onion",
                "quantity": float(row["quantity"] or 20.0),
                "village": row["village"]
            }
        else:
            # Create default profile for first-time user
            with conn:
                conn.execute(
                    "INSERT INTO user_profiles (phone, language, crop, quantity, village) VALUES (?, 'en', 'onion', 20.0, NULL)",
                    (phone,)
                )
            return {
                "phone": phone,
                "language": "en",
                "crop": "onion",
                "quantity": 20.0,
                "village": None
            }
    finally:
        conn.close()


def update_user_profile(
    raw_phone: str,
    language: Optional[str] = None,
    crop: Optional[str] = None,
    quantity: Optional[float] = None,
    village: Optional[str] = None
) -> Dict[str, Any]:
    """Updates fields in user profile."""
    phone = clean_phone_number(raw_phone)
    # Ensure profile exists
    current = get_user_profile(phone)

    new_lang = language if language is not None else current["language"]
    new_crop = crop if crop is not None else current["crop"]
    new_qty = quantity if quantity is not None else current["quantity"]
    new_village = village if village is not None else current["village"]

    conn = _get_connection()
    try:
        with conn:
            conn.execute("""
                UPDATE user_profiles
                SET language = ?, crop = ?, quantity = ?, village = ?, updated_at = CURRENT_TIMESTAMP
                WHERE phone = ?
            """, (new_lang, new_crop, new_qty, new_village, phone))
        return {
            "phone": phone,
            "language": new_lang,
            "crop": new_crop,
            "quantity": new_qty,
            "village": new_village
        }
    finally:
        conn.close()


def add_message_history(raw_phone: str, role: str, content: str):
    """Appends a conversation message to user's history."""
    phone = clean_phone_number(raw_phone)
    conn = _get_connection()
    try:
        with conn:
            conn.execute(
                "INSERT INTO conversation_history (phone, role, content) VALUES (?, ?, ?)",
                (phone, role, content)
            )
            # Prune older messages keeping last 20 records (10 turns)
            conn.execute("""
                DELETE FROM conversation_history
                WHERE phone = ? AND id NOT IN (
                    SELECT id FROM conversation_history
                    WHERE phone = ?
                    ORDER BY id DESC
                    LIMIT 20
                )
            """, (phone, phone))
    finally:
        conn.close()


def get_conversation_history(raw_phone: str, limit: int = 10) -> List[Dict[str, str]]:
    """Retrieves last N turns (oldest first for prompt context)."""
    phone = clean_phone_number(raw_phone)
    conn = _get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT role, content FROM conversation_history
            WHERE phone = ?
            ORDER BY id DESC
            LIMIT ?
        """, (phone, limit * 2))
        rows = cur.fetchall()
        # Reverse to chronological order (oldest -> newest)
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
    finally:
        conn.close()
