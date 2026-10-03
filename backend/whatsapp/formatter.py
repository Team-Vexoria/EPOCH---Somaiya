"""
formatter.py - Formats markdown responses for WhatsApp rendering.

Converts standard markdown output from the CRAG assistant into clean WhatsApp-compatible text:
- **bold** -> *bold*
- Headings (#, ##, ###) -> *Heading*
- Bullet lists (- or *) -> •
- Markdown tables -> clean single-line rows joined with ' – '
- Links [text](url) -> text (url)
- Long message splitting (>3800 chars) on paragraph/sentence boundaries
"""

import re
from typing import List


def format_table(table_text: str) -> str:
    """
    Convert markdown table into clean line-by-line WhatsApp bullet points.
    Example:
    | Mandi | Price | Freight | Net |
    | Lasalgaon | ₹4,000 | -₹35 | ₹3,940 |
    ->
    • Lasalgaon – Price: ₹4,000 – Freight: -₹35 – Net: ₹3,940
    """
    lines = [line.strip() for line in table_text.strip().split("\n") if line.strip()]
    if not lines:
        return ""

    # Parse rows
    parsed_rows = []
    for line in lines:
        if not line.startswith("|") and not line.endswith("|"):
            continue
        cells = [c.strip() for c in line.split("|")[1:-1]]
        # Skip divider rows like |---|---|
        if all(re.match(r"^:?-+:?$", c) for c in cells if c):
            continue
        parsed_rows.append(cells)

    if not parsed_rows:
        return table_text

    header = parsed_rows[0]
    data_rows = parsed_rows[1:]

    if not data_rows:
        # Just header or single row
        return " • " + " – ".join(header)

    formatted_lines = []
    for row in data_rows:
        items = []
        for i, cell in enumerate(row):
            if not cell:
                continue
            col_name = header[i] if i < len(header) else ""
            if i == 0 or not col_name:
                items.append(f"*{cell}*")
            else:
                items.append(f"{col_name}: {cell}")
        formatted_lines.append("• " + " – ".join(items))

    return "\n".join(formatted_lines)


def format_for_whatsapp(text: str) -> str:
    """
    Transforms assistant markdown response to WhatsApp compatible format.
    """
    if not text:
        return ""

    out = text

    # 1. Transform markdown tables
    # Find table blocks (consecutive lines with pipes)
    table_pattern = re.compile(r"((?:^[ \t]*\|[^\n]+\|[ \t]*\n?)+)", re.MULTILINE)

    def _replace_table(match):
        return format_table(match.group(1))

    out = table_pattern.sub(_replace_table, out)

    # 2. Convert markdown headers (# Title, ## Title, ### Title) to *Title*
    out = re.sub(r"^[ \t]*#{1,6}[ \t]+([^\n]+)", r"*\1*", out, flags=re.MULTILINE)

    # 3. Convert markdown links [Label](url) -> Label (url) or just Label if internal
    def _format_link(match):
        label = match.group(1).strip()
        url = match.group(2).strip()
        if label.lower() in url.lower() or not url.startswith("http"):
            return label
        return f"{label} ({url})"

    out = re.sub(r"\[([^\]]+)\]\(([^\)]+)\)", _format_link, out)

    # 4. Convert bold ***text*** / **text** to *text* (including across newlines)
    out = re.sub(r"\*{3,}([^\*]+)\*{3,}", r"*\1*", out)
    out = re.sub(r"\*\*([^\*]+)\*\*", r"*\1*", out)
    out = re.sub(r"\*{2,}", "*", out)

    # 5. Convert bullet points (- item or * item) to • item
    out = re.sub(r"^[ \t]*[\-\*][ \t]+", r"• ", out, flags=re.MULTILINE)

    # 6. Clean up citation markers like 【1】 or 【source】
    out = re.sub(r"【.*?】", "", out)

    # 7. Remove raw horizontal rules (--- or ___)
    out = re.sub(r"^[ \t]*[-_]{3,}[ \t]*$", "", out, flags=re.MULTILINE)

    # 8. Normalize multiple blank lines to at most 2
    out = re.sub(r"\n{3,}", "\n\n", out)

    return out.strip()


def split_long_message(text: str, max_chars: int = 3800) -> List[str]:
    """
    Splits long messages into ordered chunks under max_chars,
    splitting cleanly at paragraph or sentence boundaries.
    """
    if not text or len(text) <= max_chars:
        return [text] if text else []

    chunks = []
    current_text = text

    while len(current_text) > max_chars:
        # Find best split point before max_chars
        split_point = -1

        # Try splitting at double newline (paragraph boundary)
        p_split = current_text.rfind("\n\n", 0, max_chars)
        if p_split > max_chars * 0.5:
            split_point = p_split + 2
        else:
            # Try single newline
            n_split = current_text.rfind("\n", 0, max_chars)
            if n_split > max_chars * 0.5:
                split_point = n_split + 1
            else:
                # Try sentence ending period / Devanagari danda ।
                for end_char in [". ", "। ", "! ", "? "]:
                    s_split = current_text.rfind(end_char, 0, max_chars)
                    if s_split > max_chars * 0.5:
                        split_point = s_split + len(end_char)
                        break

        # Fallback: hard cut at last whitespace
        if split_point == -1:
            w_split = current_text.rfind(" ", 0, max_chars)
            split_point = w_split if w_split > 0 else max_chars

        chunk = current_text[:split_point].strip()
        if chunk:
            chunks.append(chunk)
        current_text = current_text[split_point:].strip()

    if current_text:
        chunks.append(current_text)

    return chunks
