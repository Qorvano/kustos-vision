"""The box walk that keeps a torn segment from killing a whole export."""

from __future__ import annotations

import struct
from pathlib import Path

from custom_components.kustos_vision.core.mp4 import playable_length, top_level_boxes


def box(kind: str, payload: bytes = b"") -> bytes:
    return struct.pack(">I4s", 8 + len(payload), kind.encode()) + payload


def fragmented(*parts: bytes) -> bytes:
    return b"".join(parts)


def write(tmp_path: Path, data: bytes) -> Path:
    target = tmp_path / "segment.mp4"
    target.write_bytes(data)
    return target


FTYP = box("ftyp", b"iso5" * 3)
MOOV = box("moov", b"\0" * 64)
MOOF = box("moof", b"\0" * 48)
MDAT = box("mdat", b"\0" * 1000)


def test_an_intact_file_is_kept_whole(tmp_path: Path) -> None:
    data = fragmented(FTYP, MOOV, MOOF, MDAT, MOOF, MDAT)
    assert playable_length(write(tmp_path, data)) == len(data)


def test_a_torn_mdat_is_cut_at_the_previous_pair(tmp_path: Path) -> None:
    """The measured real case: the last mdat declares more bytes than exist."""
    good = fragmented(FTYP, MOOV, MOOF, MDAT)
    torn = MOOF + MDAT[: len(MDAT) // 2]
    assert playable_length(write(tmp_path, good + torn)) == len(good)


def test_a_lone_trailing_moof_is_dropped_too(tmp_path: Path) -> None:
    """A moof whose mdat never made it describes samples that do not exist,
    which is the same corrupt packet with one less byte of warning."""
    good = fragmented(FTYP, MOOV, MOOF, MDAT)
    assert playable_length(write(tmp_path, good + MOOF)) == len(good)


def test_a_torn_header_cannot_pass_as_a_box(tmp_path: Path) -> None:
    good = fragmented(FTYP, MOOV, MOOF, MDAT)
    assert playable_length(write(tmp_path, good + b"\x00\x00")) == len(good)


def test_a_file_without_one_whole_fragment_is_worthless(tmp_path: Path) -> None:
    data = fragmented(FTYP, MOOV) + MOOF + MDAT[:20]
    assert playable_length(write(tmp_path, data)) == 0


def test_a_size_to_end_of_file_box_counts_as_complete(tmp_path: Path) -> None:
    """size 0 means "to the end of the file" per the specification."""
    open_ended = struct.pack(">I4s", 0, b"mdat") + b"\0" * 500
    data = fragmented(FTYP, MOOV, MOOF, open_ended)
    assert playable_length(write(tmp_path, data)) == len(data)


def test_a_largesize_box_is_walked_correctly(tmp_path: Path) -> None:
    payload = b"\0" * 300
    large = struct.pack(">I4s", 1, b"mdat") + struct.pack(">Q", 16 + len(payload)) + payload
    data = fragmented(FTYP, MOOV, MOOF, large)
    assert playable_length(write(tmp_path, data)) == len(data)


def test_a_nonsense_size_stops_the_walk(tmp_path: Path) -> None:
    """A declared size smaller than the header itself is damage, not a box."""
    good = fragmented(FTYP, MOOV, MOOF, MDAT)
    junk = struct.pack(">I4s", 3, b"free")
    assert playable_length(write(tmp_path, good + junk + MOOF + MDAT)) == len(good)


def test_the_walk_reports_what_it_saw(tmp_path: Path) -> None:
    data = fragmented(FTYP, MOOV, MOOF, MDAT)
    path = write(tmp_path, data)
    with path.open("rb") as fh:
        kinds = [b.kind for b in top_level_boxes(fh, len(data))]
    assert kinds == ["ftyp", "moov", "moof", "mdat"]
