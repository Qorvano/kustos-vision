"""The LLM tool that looks through a camera right now.

The observation sensors hold the answer from the last trigger, which can be
minutes or hours old. A person asking their voice assistant what is going on
in the garden wants the picture of this moment, so the assistant needs a way
to ask for one: this tool runs an analysis with the camera's configured
questions and hands the answers back to the model, which then phrases them.

Home Assistant's llm integration discovers this module in the package and
offers the tool through the Assist API, the same way climate_mode does.
"""

from __future__ import annotations

from typing import override

import voluptuous as vol
from homeassistant.components.llm import LLMTools
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.llm import LLM_API_ASSIST, LLMContext, Tool, ToolInput
from homeassistant.util.json import JsonObjectType

from .const import DOMAIN
from .coordinator import CamwatchCoordinator
from .core.config import CameraConfig
from .vision import VisionError
from .vision_runner import ADHOC_KEY

# Domain-prefixed, which Home Assistant requires of integration tools since
# 2026.9 so that two integrations cannot offer the same name.
TOOL_NAME = f"{DOMAIN}__LookAtCamera"

TOOL_PROMPT = (
    f"Use {TOOL_NAME} for any question about what a camera sees right now:"
    " what is happening or visible in an area with a camera, whether something"
    " or someone is there, what something looks like. It takes a fresh picture"
    " and has it answer the person's question, passed verbatim; set"
    " check_persons when the question is about who is there or whether a"
    " particular person is present. The camera sensors only hold answers from"
    " the last trigger. Cameras and the areas they watch:"
)


@callback
def _coordinator(hass: HomeAssistant) -> CamwatchCoordinator | None:
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    return entries[0].runtime_data if entries else None


@callback
def _camera_area_id(
    hass: HomeAssistant, coordinator: CamwatchCoordinator, camera: CameraConfig
) -> str | None:
    """The area a camera belongs to.

    The camera's own setting from the panel wins; without one, the area the
    user assigned to the camera's device in Home Assistant counts, because
    that is where people put cameras into rooms.
    """
    if camera.area_id:
        return camera.area_id
    device = dr.async_get(hass).async_get_device(
        identifiers={(DOMAIN, f"{coordinator.entry.entry_id}_{camera.slug}")}
    )
    return device.area_id if device else None


@callback
def _area_name(hass: HomeAssistant, area_id: str | None) -> str | None:
    if area_id is None:
        return None
    area = ar.async_get(hass).async_get_area(area_id)
    return area.name if area else None


@callback
def _analysable(coordinator: CamwatchCoordinator) -> list[CameraConfig]:
    """The cameras that can be looked through: those with a vision profile,
    which is where the model to ask is configured."""
    return [
        camera
        for camera in coordinator.config.cameras
        if coordinator.config.vision_for(camera.slug) is not None
    ]


@callback
def _describe(
    hass: HomeAssistant, coordinator: CamwatchCoordinator, cameras: list[CameraConfig]
) -> str:
    lines = []
    for camera in cameras:
        area = _area_name(hass, _camera_area_id(hass, coordinator, camera))
        lines.append(f"{camera.name} ({area or 'no area'})")
    return ", ".join(lines)


class LookAtCameraTool(Tool):
    """Take a fresh picture with a camera and answer its questions from it."""

    name = TOOL_NAME
    description = (
        "Look through a camera right now and answer a question about what it"
        " sees: takes a fresh picture and has the vision model answer the"
        " question from that picture. With check_persons it also compares the"
        " picture with the configured people and names those recognised in"
        " persons_seen. Give the camera name or the area it watches; without"
        " both, the camera in the area of the voice satellite is used."
    )
    parameters = vol.Schema(
        {
            vol.Required(
                "question",
                description=(
                    "The question to answer from the picture, in the person's"
                    " own words and language."
                ),
            ): cv.string,
            vol.Optional(
                "check_persons",
                default=False,
                description=(
                    "Set true only when the question asks who is there or"
                    " whether a particular person is present: the picture is"
                    " then compared with the configured people's reference"
                    " photos, which costs extra time."
                ),
            ): cv.boolean,
            vol.Optional(
                "camera",
                description="Name of the camera, case-insensitive.",
            ): cv.string,
            vol.Optional(
                "area",
                description="Name of the area the camera watches.",
            ): cv.string,
        }
    )

    def __init__(self, coordinator: CamwatchCoordinator) -> None:
        self._coordinator = coordinator

    def _by_name(
        self, hass: HomeAssistant, cameras: list[CameraConfig], name: str
    ) -> list[CameraConfig]:
        wanted = name.strip().casefold()
        return [c for c in cameras if wanted in (c.name.casefold(), c.slug)]

    def _by_area(
        self, hass: HomeAssistant, cameras: list[CameraConfig], area_id: str
    ) -> list[CameraConfig]:
        return [
            c for c in cameras if _camera_area_id(hass, self._coordinator, c) == area_id
        ]

    @override
    async def async_call(
        self, hass: HomeAssistant, tool_input: ToolInput, llm_context: LLMContext
    ) -> JsonObjectType:
        args = self.parameters(tool_input.tool_args)
        cameras = _analysable(self._coordinator)
        available = _describe(hass, self._coordinator, cameras)

        if name := args.get("camera"):
            matches = self._by_name(hass, cameras, name)
            if not matches:
                return {
                    "success": False,
                    "error": f"No camera named '{name}'. Cameras: {available}",
                }
        elif area := args.get("area"):
            entry = ar.async_get(hass).async_get_area_by_name(area)
            if entry is None:
                return {"success": False, "error": f"Area '{area}' does not exist"}
            matches = self._by_area(hass, cameras, entry.id)
            if not matches:
                return {
                    "success": False,
                    "error": f"No camera watches area '{area}'. Cameras: {available}",
                }
        else:
            device = (
                dr.async_get(hass).async_get(llm_context.device_id)
                if llm_context.device_id
                else None
            )
            if device is None or not device.area_id:
                return {
                    "success": False,
                    "error": f"Name a camera or an area. Cameras: {available}",
                }
            matches = self._by_area(hass, cameras, device.area_id)
            if not matches:
                return {
                    "success": False,
                    "error": (
                        f"No camera watches the area of this device"
                        f" ({_area_name(hass, device.area_id)}). Cameras: {available}"
                    ),
                }

        if len(matches) > 1:
            return {
                "success": False,
                "error": (
                    "Several cameras match, name one:"
                    f" {_describe(hass, self._coordinator, matches)}"
                ),
            }
        camera = matches[0]

        # Forced, like the panel's button and the service: the person asked
        # this moment, so the cooldown does not apply. The daily budget does,
        # and a run already in progress is not interrupted. The question goes
        # to the model as the only field; the sensors are not involved.
        question: str = args["question"]
        try:
            result = await self._coordinator.vision.async_analyse(
                camera.slug,
                reason="assist",
                force=True,
                question=question,
                check_persons=args["check_persons"],
            )
        except VisionError as err:
            return {"success": False, "error": str(err)}
        if result is None:
            return {
                "success": False,
                "error": (
                    f"{camera.name} could not be analysed right now: today's"
                    " analysis budget is used up or an analysis is already running."
                ),
            }

        if ADHOC_KEY not in result.values:
            return {
                "success": False,
                "error": (
                    f"{camera.name} gave no usable answer:"
                    f" {result.problems.get(ADHOC_KEY, 'the model answered nothing')}"
                ),
            }
        # Which of the configured people the picture was checked against,
        # and which of them it showed: the answer text may say "a person",
        # this says who.
        people = self._coordinator.config.persons
        checked = [
            person.name for person in people.people
            if person.id in result.persons
        ]
        seen = [
            person.name for person in people.people
            if result.persons.get(person.id)
        ]
        return {
            "success": True,
            "result": {
                "camera": camera.name,
                "area": _area_name(hass, _camera_area_id(hass, self._coordinator, camera)),
                "question": question,
                "answer": result.values[ADHOC_KEY],
                "persons_seen": seen,
                "persons_checked": checked,
                "duration_s": round(result.duration_s, 1),
            },
        }


@callback
def async_get_tools(
    hass: HomeAssistant, llm_context: LLMContext, api_id: str
) -> LLMTools | None:
    """Offer the tool while a camera has questions to answer."""
    if api_id != LLM_API_ASSIST:
        return None
    coordinator = _coordinator(hass)
    if coordinator is None:
        return None
    cameras = _analysable(coordinator)
    if not cameras:
        return None
    return LLMTools(
        tools=[LookAtCameraTool(coordinator)],
        prompt=f"{TOOL_PROMPT} {_describe(hass, coordinator, cameras)}",
    )
