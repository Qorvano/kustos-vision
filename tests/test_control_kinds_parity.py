"""The control-kind table exists on both sides; this keeps them identical.

The panel offers only the kinds an entity can perform, and the backend refuses
the others. Those are two encodings of one rule, so they can drift: the panel
would offer something the save then rejects, or hide something that works. The
table is small and rarely edited, which is exactly when drift goes unnoticed.

Parsed from the TypeScript source rather than the built bundle, because the
bundle is minified and the source is what a future edit touches.
"""

from __future__ import annotations

import re
from pathlib import Path

from kustos_vision.core.config import KINDS_BY_DOMAIN

FRONTEND = (
    Path(__file__).resolve().parents[1] / "frontend" / "src" / "capabilities.ts"
)


def parse_frontend_table() -> dict[str, tuple[str, ...]]:
    """Read byDomain out of kindsForEntity."""
    source = FRONTEND.read_text(encoding="utf-8")
    block = re.search(
        r"const byDomain: Record<string, ControlKind\[\]> = \{(.*?)\n  \};",
        source,
        re.DOTALL,
    )
    assert block, "byDomain not found; the parity test needs updating"

    table: dict[str, tuple[str, ...]] = {}
    for line in block.group(1).splitlines():
        entry = re.match(r'\s*(\w+):\s*\[(.*?)\],', line)
        if entry:
            kinds = re.findall(r'"(\w+)"', entry.group(2))
            table[entry.group(1)] = tuple(kinds)
    return table


def test_the_two_tables_list_the_same_domains() -> None:
    assert set(parse_frontend_table()) == set(KINDS_BY_DOMAIN)


def test_every_domain_allows_the_same_kinds_in_the_same_order() -> None:
    """Order matters: the first entry is what the panel selects automatically
    when an entity is chosen."""
    frontend = parse_frontend_table()
    for domain, kinds in KINDS_BY_DOMAIN.items():
        assert frontend[domain] == kinds, f"{domain} differs between the two"


def test_the_table_is_not_empty() -> None:
    """A parser that silently matched nothing would make this suite pass while
    checking nothing at all."""
    assert len(parse_frontend_table()) >= 10
