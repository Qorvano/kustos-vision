"""The brand images Home Assistant shows for the integration.

Since Home Assistant 2026.3 a custom integration ships its own icons in a
``brand/`` directory inside the integration, and they take priority over the
central brands CDN, which no longer accepts custom integrations. The sizes
are the CDN's rules, which the local loader inherits: 256 pixels square for
the icon, 512 for the hDPI variant.
"""

from __future__ import annotations

import struct
from pathlib import Path

import pytest

BRAND_DIR = (
    Path(__file__).resolve().parents[1] / "custom_components" / "kustos_vision" / "brand"
)

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def png_size(path: Path) -> tuple[int, int]:
    """Width and height from the IHDR chunk, which every PNG starts with."""
    header = path.read_bytes()[:24]
    assert header[:8] == PNG_SIGNATURE, f"{path.name} is not a PNG"
    assert header[12:16] == b"IHDR"
    width, height = struct.unpack(">II", header[16:24])
    return width, height


@pytest.mark.parametrize(
    ("name", "size"),
    [
        ("icon.png", 256),
        ("icon@2x.png", 512),
        ("dark_icon.png", 256),
        ("dark_icon@2x.png", 512),
    ],
)
def test_the_icons_have_the_sizes_home_assistant_expects(name: str, size: int) -> None:
    path = BRAND_DIR / name
    assert path.is_file(), f"{name} is missing from the integration's brand directory"
    assert png_size(path) == (size, size)
