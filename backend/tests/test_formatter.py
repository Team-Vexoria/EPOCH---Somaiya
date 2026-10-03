"""
test_formatter.py - Unit tests for WhatsApp Markdown Formatter and Message Splitter.
"""

import unittest
from whatsapp.formatter import format_for_whatsapp, split_long_message, format_table


class TestWhatsAppFormatter(unittest.TestCase):

    def test_bold_formatting(self):
        input_text = "This is **important** market information and **₹4,000/qtl** modal rate."
        expected = "This is *important* market information and *₹4,000/qtl* modal rate."
        self.assertEqual(format_for_whatsapp(input_text), expected)

    def test_headings_conversion(self):
        input_text = "# Nashik APMC Advisory\n## Lasalgaon Rate\n### Modal Price"
        expected = "*Nashik APMC Advisory*\n*Lasalgaon Rate*\n*Modal Price*"
        self.assertEqual(format_for_whatsapp(input_text), expected)

    def test_bullet_conversion(self):
        input_text = "- Tomato: ₹35/kg\n* Onion: ₹40/kg\n- Soybean: ₹57/kg"
        expected = "• Tomato: ₹35/kg\n• Onion: ₹40/kg\n• Soybean: ₹57/kg"
        self.assertEqual(format_for_whatsapp(input_text), expected)

    def test_markdown_table_conversion(self):
        table_input = (
            "| Mandi | Price | Freight | Net |\n"
            "| :--- | :--- | :--- | :--- |\n"
            "| Lasalgaon | ₹4,000 | -₹35 | ₹3,940 |\n"
            "| Pimpalgaon | ₹3,850 | -₹42 | ₹3,783 |"
        )
        formatted = format_for_whatsapp(table_input)
        self.assertIn("• *Lasalgaon* – Price: ₹4,000 – Freight: -₹35 – Net: ₹3,940", formatted)
        self.assertIn("• *Pimpalgaon* – Price: ₹3,850 – Freight: -₹42 – Net: ₹3,783", formatted)

    def test_link_conversion(self):
        input_text = "Check the live map at [Mohra Dashboard](https://mohra.app/map) for details."
        expected = "Check the live map at Mohra Dashboard (https://mohra.app/map) for details."
        self.assertEqual(format_for_whatsapp(input_text), expected)

    def test_devanagari_marathi_hindi_preservation(self):
        input_text = (
            "🌾 **Mohra कृषी सल्लागार (नाशिक जिल्हा)**\n\n"
            "• **टोमॅटो (Tomato):** ₹३५ / किलो (₹३,५०० / क्विंटल)\n"
            "• **कांदा (Onion):** ₹४० / किलो (₹४,००० / क्विंटल)"
        )
        formatted = format_for_whatsapp(input_text)
        self.assertIn("🌾 *Mohra कृषी सल्लागार (नाशिक जिल्हा)*", formatted)
        self.assertIn("• *टोमॅटो (Tomato):* ₹३५ / किलो (₹३,५०० / क्विंटल)", formatted)

    def test_message_splitting_short(self):
        text = "Short message under limit."
        chunks = split_long_message(text, max_chars=3800)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0], text)

    def test_message_splitting_long(self):
        paragraph = "This is a detailed paragraph of market insights.\n\n"
        long_text = paragraph * 100  # ~5000 chars
        chunks = split_long_message(long_text, max_chars=1000)
        self.assertTrue(len(chunks) > 1)
        for chunk in chunks:
            self.assertTrue(len(chunk) <= 1000)
        # Verify content integrity
        combined = "".join(chunks)
        self.assertTrue("This is a detailed paragraph" in combined)


if __name__ == "__main__":
    unittest.main()
