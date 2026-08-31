"""Reading the top-level structure of a fragmented MP4.

Exists for one reason: a recorder killed in the middle of a write leaves a
segment whose last fragment is torn off mid-box. Handed such a file, ffmpeg's
concat demuxer does not skip the bad packet, it abandons the whole job, so an
export of a day ended at the first crash-made gap and silently dropped
everything after it. Measured against a real recording: a file whose final
mdat declared 79954 bytes but held fewer stopped a three-file join at
58 seconds; cut back to its last complete fragment, the same join produced all
186.

Only box headers are read, so walking a file costs a handful of seeks no
matter how large it is.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass
from itertools import pairwise
from pathlib import Path
from typing import BinaryIO

# A box header is size (4 bytes) plus type (4 bytes); a declared size of 1
# means a 64-bit size follows, 0 means the box runs to the end of the file.
# Both straight from the ISO base media file format.
_HEADER = struct.Struct(">I4s")
_LARGESIZE = struct.Struct(">Q")


@dataclass(frozen=True, slots=True)
class Box:
    """One top-level box, as far as the header claims."""

    kind: str
    offset: int
    size: int
    complete: bool

    @property
    def end(self) -> int:
        return self.offset + self.size


def top_level_boxes(fh: BinaryIO, file_size: int) -> list[Box]:
    """Walk the top-level boxes of an MP4, tolerating a torn tail.

    Stops at the first header that cannot be read or that declares an
    impossible size; everything before it is trustworthy, which is all the
    caller needs.
    """
    boxes: list[Box] = []
    offset = 0
    while offset + _HEADER.size <= file_size:
        fh.seek(offset)
        header = fh.read(_HEADER.size)
        if len(header) < _HEADER.size:
            break
        declared, raw_kind = _HEADER.unpack(header)
        header_length = _HEADER.size
        if declared == 1:
            large = fh.read(_LARGESIZE.size)
            if len(large) < _LARGESIZE.size:
                break
            declared = _LARGESIZE.unpack(large)[0]
            header_length += _LARGESIZE.size
        elif declared == 0:
            declared = file_size - offset
        if declared < header_length:
            # A size smaller than its own header is not a box, it is damage.
            break
        boxes.append(
            Box(
                kind=raw_kind.decode("latin-1"),
                offset=offset,
                size=declared,
                complete=offset + declared <= file_size,
            )
        )
        offset += declared
    return boxes


def _moov_bytes(path: Path) -> bytes:
    """The moov box, which describes every track without carrying media."""
    file_size = path.stat().st_size
    with path.open("rb") as fh:
        for box in top_level_boxes(fh, file_size):
            if box.kind == "moov" and box.complete:
                fh.seek(box.offset)
                return fh.read(box.size)
    return b""


def has_audio_track(path: Path) -> bool:
    """Whether the file carries an audio track.

    The sample description names its format, so an AAC track shows up as an
    "mp4a" entry inside the moov. Needed by the stamped export: feeding a
    concat of silent segments an audio graph fails outright, and pretending a
    sound track exists where none does is how players get handed data that
    does not match its declaration.
    """
    return b"mp4a" in _moov_bytes(path)


def video_size(path: Path) -> tuple[int, int] | None:
    """The visible width and height, read from the track header.

    Needed so the timestamp the export burns in can be sized relative to the
    picture without probing tools: ffprobe is not guaranteed to exist next to
    the ffmpeg Home Assistant ships. The tkhd box stores both as 16.16 fixed
    point; the audio track's header carries zeros there, so the first nonzero
    pair is the video.
    """
    moov = _moov_bytes(path)
    offset = 0
    while (found := moov.find(b"tkhd", offset)) != -1:
        offset = found + 4
        # Byte layout from the specification: after the fourcc come version
        # and flags; version 1 widens the two timestamps and the duration
        # from 4 to 8 bytes, shifting width and height back by 12.
        version = moov[found + 4] if found + 4 < len(moov) else None
        # From the fourcc: 4 bytes version+flags, then (v0) three 4-byte
        # timestamps/id, 4 reserved, 4 duration, 8 reserved, three 2-byte
        # fields, 2 reserved, the 36-byte matrix = 76 into the payload; v1
        # widens the two timestamps and the duration by 4 bytes each. The
        # first attempt was four bytes short and read 0x4000 out of the
        # identity matrix as a 16384-pixel width, caught against a real file.
        at = found + 4 + (88 if version == 1 else 76)
        if at + 8 > len(moov):
            continue
        width = int.from_bytes(moov[at : at + 4], "big") >> 16
        height = int.from_bytes(moov[at + 4 : at + 8], "big") >> 16
        if width and height:
            return width, height
    return None


def playable_length(path: Path) -> int:
    """How many leading bytes of the file are worth handing to a demuxer.

    Equal to the file size when the file is intact. For a torn file, the end
    of the last complete moof/mdat pair: the moof describes the samples, the
    mdat carries them, and one without the other produces exactly the corrupt
    packet that makes a join give up. Zero when not even one pair survived,
    in which case there is nothing to play at all.
    """
    file_size = path.stat().st_size
    with path.open("rb") as fh:
        boxes = top_level_boxes(fh, file_size)

    last_pair_end = 0
    for previous, box in pairwise(boxes):
        if (
            box.kind == "mdat"
            and box.complete
            and previous.kind == "moof"
            and previous.complete
        ):
            last_pair_end = box.end
    if last_pair_end == 0:
        # Not one whole fragment; an init-only file plays nothing and some
        # demuxers refuse a zero-duration input outright.
        return 0

    walked_to_end = boxes[-1].end == file_size and all(b.complete for b in boxes)
    # A complete file can still be a torn one: killed between writing the moof
    # and its mdat, it ends with a structurally whole moof describing samples
    # that were never written, and that reads as the same corrupt packet. Any
    # moof after the last finished pair marks the file as cut there.
    dangling_moof = any(
        b.kind == "moof" and b.offset >= last_pair_end for b in boxes
    )
    if walked_to_end and not dangling_moof:
        return file_size
    return last_pair_end


def _children(data: bytes, start: int, end: int):
    """Walk the child boxes of a container within already-read bytes."""
    offset = start
    while offset + 8 <= end:
        declared = int.from_bytes(data[offset : offset + 4], "big")
        kind = data[offset + 4 : offset + 8].decode("latin-1")
        if declared == 1:
            declared = int.from_bytes(data[offset + 8 : offset + 16], "big")
        elif declared == 0:
            declared = end - offset
        if declared < 8 or offset + declared > end:
            return
        yield kind, offset + 8, offset + declared
        offset += declared


@dataclass(frozen=True, slots=True)
class Fragment:
    """One moof/mdat pair: where it starts and when its footage begins."""

    offset: int
    start_seconds: float


@dataclass(frozen=True, slots=True)
class FragmentIndex:
    """Everything a player needs to fetch a segment from the middle.

    ``init_end`` is where ftyp and moov stop: those bytes plus any run of
    fragments form a valid stream, which is what makes a ranged fetch work at
    all. ``data_end`` stops at the last complete fragment, so a tail torn off
    mid-write never reaches a parser that treats it as fatal.
    """

    init_end: int
    data_end: int
    fragments: tuple[Fragment, ...]


def _video_track(moov: bytes) -> tuple[int, int] | None:
    """The video track's id and timescale, from tkhd and mdhd.

    The video track is the one whose header carries a nonzero width; the
    audio track stores zeros there.
    """
    for kind, payload, end in _children(moov, 8, len(moov)):
        if kind != "trak":
            continue
        track_id = None
        width = 0
        timescale = None
        for k2, p2, e2 in _children(moov, payload, end):
            if k2 == "tkhd":
                version = moov[p2]
                at = p2 + (20 if version == 1 else 12)
                track_id = int.from_bytes(moov[at : at + 4], "big")
                wat = p2 + (88 if version == 1 else 76)
                width = int.from_bytes(moov[wat : wat + 4], "big") >> 16
            elif k2 == "mdia":
                for k3, p3, _ in _children(moov, p2, e2):
                    if k3 == "mdhd":
                        version = moov[p3]
                        at = p3 + (20 if version == 1 else 12)
                        timescale = int.from_bytes(moov[at : at + 4], "big")
        if width and track_id is not None and timescale:
            return track_id, timescale
    return None


def _fragment_start(moof: bytes, track_id: int, timescale: int) -> float | None:
    """When a fragment's footage begins, from the video traf's tfdt."""
    for kind, payload, end in _children(moof, 8, len(moof)):
        if kind != "traf":
            continue
        this_track = None
        base_time = None
        for k2, p2, _ in _children(moof, payload, end):
            if k2 == "tfhd":
                this_track = int.from_bytes(moof[p2 + 4 : p2 + 8], "big")
            elif k2 == "tfdt":
                version = moof[p2]
                length = 8 if version == 1 else 4
                base_time = int.from_bytes(moof[p2 + 4 : p2 + 4 + length], "big")
        if this_track == track_id and base_time is not None:
            return base_time / timescale
    return None


def fragment_index(path: Path) -> FragmentIndex | None:
    """Map a fragmented MP4's time axis onto byte offsets.

    Exists so a click into the middle of a segment costs the bytes from the
    right fragment onward instead of the whole prefix: a daylight segment of
    these cameras measures 150 to 170 megabytes, and playback used to wait
    for all of it. Only box headers and the small moof boxes are read.
    """
    file_size = path.stat().st_size
    with path.open("rb") as fh:
        boxes = top_level_boxes(fh, file_size)
        moov = next((b for b in boxes if b.kind == "moov" and b.complete), None)
        if moov is None:
            return None
        fh.seek(moov.offset)
        track = _video_track(fh.read(moov.size))
        if track is None:
            return None
        track_id, timescale = track

        fragments: list[Fragment] = []
        data_end = moov.end
        for previous, box in pairwise(boxes):
            if (
                box.kind != "mdat"
                or not box.complete
                or previous.kind != "moof"
                or not previous.complete
            ):
                continue
            # Every complete pair extends the safe range, including a final
            # audio-only flush that carries no video traf; measured on a real
            # file whose last 2.8 kilobytes were exactly that. Only pairs
            # with a video time become seek targets.
            data_end = box.end
            fh.seek(previous.offset)
            start = _fragment_start(fh.read(previous.size), track_id, timescale)
            if start is None:
                continue
            fragments.append(Fragment(offset=previous.offset, start_seconds=start))
    if not fragments:
        return None
    walked_to_end = boxes[-1].end == file_size and all(b.complete for b in boxes)
    dangling_moof = any(b.kind == "moof" and b.offset >= data_end for b in boxes)
    if walked_to_end and not dangling_moof:
        # Same rule as playable_length: an intact file is served whole. The
        # measured real file ended in 2.8 kilobytes of complete boxes that
        # form no pair, and clipping those would clip valid data.
        data_end = file_size
    return FragmentIndex(
        init_end=moov.end, data_end=data_end, fragments=tuple(fragments)
    )
