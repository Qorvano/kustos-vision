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


def test_an_audio_track_is_recognised_in_the_moov(tmp_path: Path) -> None:
    from custom_components.kustos_vision.core.mp4 import has_audio_track

    with_audio = fragmented(FTYP, box("moov", b"\0" * 20 + b"mp4a" + b"\0" * 20), MOOF, MDAT)
    without = fragmented(FTYP, MOOV, MOOF, MDAT)
    assert has_audio_track(write(tmp_path, with_audio)) is True
    assert has_audio_track(write(tmp_path, without)) is False


def test_the_video_size_comes_from_the_track_header(tmp_path: Path) -> None:
    """tkhd stores width and height as 16.16 fixed point at the end of the
    box; the audio track's header carries zeros there and must be skipped."""
    import struct as st

    from custom_components.kustos_vision.core.mp4 import video_size

    def tkhd(width: int, height: int) -> bytes:
        # Version 0 payload per the specification: 76 bytes of fixed fields
        # and matrix before width and height.
        body = b"\0" * 76 + st.pack(">II", width << 16, height << 16)
        return box("tkhd", body)

    moov = box("moov", tkhd(0, 0) + tkhd(2880, 1620))
    data = fragmented(FTYP, moov, MOOF, MDAT)
    assert video_size(write(tmp_path, data)) == (2880, 1620)


def test_no_video_track_means_no_size(tmp_path: Path) -> None:
    from custom_components.kustos_vision.core.mp4 import video_size

    assert video_size(write(tmp_path, fragmented(FTYP, MOOV, MOOF, MDAT))) is None


# ----------------------------------------------------------------------
# The fragment index behind mid-segment seeking
# ----------------------------------------------------------------------


def full_box(kind: str, version: int, payload: bytes) -> bytes:
    return box(kind, bytes([version, 0, 0, 0]) + payload)


def make_moov(track_id: int = 1, timescale: int = 90000, width: int = 640) -> bytes:
    # Payload layout per spec (v0): 8 bytes of times, the track id, then 60
    # bytes of reserved fields, layer/group/volume and the matrix before
    # width and height land at payload offset 76.
    tkhd = full_box(
        "tkhd",
        0,
        b"\0" * 8
        + track_id.to_bytes(4, "big")
        + b"\0" * 60
        + (width << 16).to_bytes(4, "big")
        + (360 << 16).to_bytes(4, "big"),
    )
    mdhd = full_box("mdhd", 0, b"\0" * 8 + timescale.to_bytes(4, "big") + b"\0" * 4)
    mdia = box("mdia", mdhd)
    return box("moov", box("trak", tkhd + mdia))


def make_moof(track_id: int, base_time: int) -> bytes:
    tfhd = full_box("tfhd", 0, track_id.to_bytes(4, "big"))
    tfdt = full_box("tfdt", 1, base_time.to_bytes(8, "big"))
    return box("moof", box("traf", tfhd + tfdt))


def test_the_fragment_index_maps_time_to_bytes(tmp_path: Path) -> None:
    from custom_components.kustos_vision.core.mp4 import fragment_index

    data = fragmented(
        FTYP,
        make_moov(timescale=1000),
        make_moof(1, 0),
        MDAT,
        make_moof(1, 2000),
        MDAT,
    )
    path = write(tmp_path, data)
    index = fragment_index(path)
    assert index is not None
    assert index.init_end == len(FTYP) + len(make_moov(timescale=1000))
    assert [f.start_seconds for f in index.fragments] == [0.0, 2.0]
    assert index.fragments[0].offset == index.init_end
    assert index.data_end == len(data)


def test_the_index_stops_at_a_torn_tail(tmp_path: Path) -> None:
    """The ranged fetch this feeds must never hand a parser the torn bytes."""
    from custom_components.kustos_vision.core.mp4 import fragment_index

    good = fragmented(FTYP, make_moov(timescale=1000), make_moof(1, 0), MDAT)
    torn = make_moof(1, 1000) + MDAT[: len(MDAT) // 2]
    index = fragment_index(write(tmp_path, good + torn))
    assert index is not None
    assert len(index.fragments) == 1
    assert index.data_end == len(good)


def test_the_audio_traf_is_not_mistaken_for_video(tmp_path: Path) -> None:
    from custom_components.kustos_vision.core.mp4 import fragment_index

    audio_traf = box(
        "traf",
        full_box("tfhd", 0, (2).to_bytes(4, "big"))
        + full_box("tfdt", 1, (999_000).to_bytes(8, "big")),
    )
    video_traf = box(
        "traf",
        full_box("tfhd", 0, (1).to_bytes(4, "big"))
        + full_box("tfdt", 1, (3000).to_bytes(8, "big")),
    )
    moof = box("moof", audio_traf + video_traf)
    data = fragmented(FTYP, make_moov(timescale=1000), moof, MDAT)
    index = fragment_index(write(tmp_path, data))
    assert index is not None
    assert index.fragments[0].start_seconds == 3.0


def test_no_video_track_means_no_index(tmp_path: Path) -> None:
    from custom_components.kustos_vision.core.mp4 import fragment_index

    data = fragmented(FTYP, make_moov(width=0), make_moof(1, 0), MDAT)
    assert fragment_index(write(tmp_path, data)) is None
