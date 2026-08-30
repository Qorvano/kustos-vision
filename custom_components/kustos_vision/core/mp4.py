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
