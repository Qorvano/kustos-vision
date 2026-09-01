# Kustos Vision

Records your camera streams, shows them in its own Home Assistant panel, and
lets an LLM of your choosing turn what it sees into sensors.

It does not run object detection. That is the point: detection is what makes a
conventional NVR expensive to run, and Kustos Vision leaves it to a model you pick,
local or hosted. What stays on your machine is remuxing, which never decodes a
frame.

## Status

| Milestone | Contents | Status |
|---|---|---|
| M1 | Recording, retention, segment index, entities | done |
| M2 | Sidebar panel, live view, camera settings | done |
| M3 | Timeline and playback | done |
| M4 | LLM vision and the sensors it feeds | done |

## What it costs to run

Recording remuxes the RTSP packets straight into MP4 segments with
`ffmpeg -c copy`. No frame is decoded, so six streams cost roughly 12 % of one
core, about 3 % of a Raspberry Pi 5. The only decoding is one frame per finished
segment for the timeline preview, which is tens of milliseconds.

Storage depends on your cameras' bitrates. A 2K stream at 4 Mbit/s is about
1.8 GB per hour; the substream of the same camera is usually under a tenth of
that.

## Requirements

Home Assistant 2026.8 or newer. Nothing else: no add-on, no MQTT broker, no
other integration, and no third-party front-end card. Recording uses the ffmpeg
that Home Assistant already ships.

## The panel

Kustos Vision adds its own entry to the sidebar. Cameras are added there, not in a
config flow: pick a Home Assistant camera entity and Kustos Vision proposes the
rest, by looking at the other entities of the same device and matching them on
generic traits. It proposes which of them are the streams, and which drive pan,
tilt, light and siren. Every proposal is editable, because a proposal is a
heuristic and the assignment is the truth. Nothing in those rules names a brand,
so they work the same for any camera integration.

Views are user-defined tabs: a name, a set of cameras and a column count. Live
pictures use Home Assistant's own APIs and fall through three transports in
order: WebRTC (sub-second, and on Home Assistant OS served by the go2rtc that
ships with core), native HLS where the browser plays it, and MJPEG as the one
that always works. A tile that is not on screen opens no stream at all.

The panel is a projection of the websocket API and nothing more. Deleting the
built front-end costs the rendering and no capability, which is asserted by a
test rather than merely intended.

## Recordings

The recordings tab plays a day as one continuous stretch. The bar underneath
shows what exists and, deliberately, where it does not: a hole means a camera
rebooted, the network dropped or Home Assistant restarted, and hiding that
would let a viewer conclude that nothing happened. Hovering shows the preview
frame at that moment; clicking seeks there.

Playback is built on MediaSource Extensions rather than on a player library.
Segments are appended one after another with their timestamps shifted into
place, so the seams are invisible. The codec is read out of the file itself,
because MediaSource rejects a wrong codec string with a decode error rather
than anything useful.

A range can be downloaded as one file. The segments are joined with stream copy
and streamed straight to the browser, so an export never re-encodes and never
leaves a second copy behind.

## Vision

Kustos Vision runs no detection of its own. A snapshot goes to a model you choose,
and the answers become sensors.

Each camera gets a list of questions. A question has a type, and that decides
both the entity and the shape the model has to answer in:

| Type | Entity | Example question |
|---|---|---|
| yes/no | `binary_sensor` | Is a parcel at the door? |
| text | `sensor` | Who is visible? |
| count | `sensor` | How many people are there? |
| choice | `sensor` | What is in view: nothing, a person, a vehicle? |

Two backends, both first class:

* **Home Assistant AI Task**, which covers every provider Home Assistant
  supports and will cover whatever comes next without Kustos Vision changing.
* **An OpenAI-compatible endpoint** given by URL, which is what a local
  llama.cpp, LM Studio or vLLM offers, and several hosted services too.

Both are needed. Not every installation has an AI Task provider configured, and
some local runners expose a conversation entity without an AI Task one.

Triggers are the camera's own motion or person detection, which costs Home
Assistant nothing. Three limits apply per camera and none is optional: a
cooldown so a burst of motion is one analysis, a daily budget so a
misconfigured trigger cannot run away overnight, and one analysis at a time so
a slow model cannot queue up behind itself.

The frame is taken at the moment the analysis starts, decoded from the
camera's own stream with ffmpeg. Asking the camera entity for a still is only
the fallback, because camera integrations may serve stills cached minutes
earlier, and an analysis answered from such a picture is wrong about time in
a way nothing downstream can detect. The exact frame every run was answered
from is kept (a fixed ring per camera under the local state directory) and
shown beside the run in the panel's history, with the raw answer next to it.
Improving a question is otherwise guesswork.

A question can carry up to two **reference pictures**: stored photos the
model gets to compare against, such as a shot of the backyard with every bin
in place. Boxes with labels can be drawn onto a reference in the panel; the
labels are burned into the copy the model sees while the original stays
editable. References always travel after the current frame and are introduced
as explicitly not being evidence, so a truncating runner or a drifting model
degrades toward the evidence. A button takes the current camera frame as a
new reference through the same capture pipeline.

**Persons**: people configured with a name and up to two reference photos get
a presence `binary_sensor` on the hub device. Cameras opt in per profile with
a single switch. A match turns the sensor on; not being matched in one frame
never turns it off - someone turning round is not a departure - only the
configurable off-delay after the last sighting does. Presence deliberately
does not survive a restart: after one, "not seen since the restart" is the
honest answer.

The `kustos_vision.analyze` service runs an analysis on demand and returns the
answers, for trying a question out and for automations that know about a moment
Kustos Vision's own triggers would miss.

## Recording layout

```
<storage>/<camera>/<YYYY-MM-DD>/<HH-MM-SS>_<stream>.mp4
<storage>/<camera>/<YYYY-MM-DD>/<HH-MM-SS>_<stream>.jpg
```

Plain files in plain directories, readable in any file manager. Put the storage
location under your media folder and Home Assistant's media browser will play
them without Kustos Vision being involved at all.

Those two are the only things written there. Snapshots sent to a model are held
in memory and never land on disk, the segment index lives beside your Home
Assistant configuration, and an export is streamed to the browser rather than
assembled somewhere first.

The location can be changed at any time under Settings, Storage. Nothing is
moved or deleted: existing recordings stay where they are and new ones go to
the new place. Copy the old tree across first and it is picked up again, because
the index stores paths relative to the root.

File names are in local time because you read them. The index stores UTC,
which is what every comparison and retention decision uses, so the twice-yearly
clock change cannot confuse it.

## Retention

Two limits, each switchable on its own, and both may be active at once:

* **Age, per camera.** Anything older than N days for that camera goes.
* **Total size, across all cameras.** While everything together exceeds the
  budget, the globally oldest segment goes, whichever camera wrote it.

Age is applied first, then size is measured against what is left. The segment
each stream is currently writing into is never deleted. If the budget cannot be
met without deleting those, the `Over budget` sensor says by how much rather
than the setting being silently ignored.

**Leaving the size budget unset does not mean unlimited.** Recording that fills
a disk and then dies with "no space left on device" is not an acceptable
default, so the limit falls back to what the location actually holds, minus
headroom for one retention interval. A budget you set yourself is capped by the
same ceiling: a limit larger than the volume is not a limit.

The headroom is measured rather than assumed. A retention run happens once per
segment length, and between two runs each recorded stream can add at most one
more segment, so the largest segment seen so far times the number of streams
bounds the growth. That also absorbs the preview images, which are three orders
of magnitude smaller than the segments and are not counted in the index.

## Entities

Per camera:

| Entity | Meaning |
|---|---|
| `binary_sensor.<camera>_recording` | Whether ffmpeg is actually running. Off means something is wrong, and the attributes say which stream and what it reported. |
| `sensor.<camera>_used_storage` | Space this camera's recordings occupy. |
| `sensor.<camera>_oldest_recording` | How far back coverage actually reaches, which is not the same as the configured retention. |
| `switch.<camera>_recording` | Pause and resume without changing the configuration. |

Overall: `sensor.kustos_vision_total_storage`, `sensor.kustos_vision_free_storage`,
`sensor.kustos_vision_over_budget`.

Each vision question adds one more entity, named after the question.

## Development

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements_test.txt

.venv/bin/pytest tests -q                          # core, no Home Assistant
.venv/bin/pytest -c tests_ha/pytest.ini tests_ha -q # Home Assistant layer
.venv/bin/ruff check custom_components tests tests_ha
```

The panel is built separately:

```bash
cd frontend
npm install
npm run typecheck
npm run build     # writes custom_components/kustos_vision/frontend/dist/panel.js
```

That bundle is committed. HACS ships what is in the repository and never runs a
build, so a source change without a rebuild would ship the old panel; CI fails
when the two disagree.

The `core/` package never imports Home Assistant, so everything in it (ffmpeg
argument construction, retention decisions, the index, the configuration model)
is testable as plain Python. The end-to-end tests record with a real ffmpeg and
skip themselves when the binary is missing.

`requirements_test.txt` pins the runtime dependencies of the Home Assistant
integrations Kustos Vision declares. Home Assistant installs those itself at
runtime; the test harness does not.
