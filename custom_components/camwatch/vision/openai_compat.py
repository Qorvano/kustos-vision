"""Analysis through any endpoint that speaks the OpenAI chat protocol.

That covers a local llama.cpp server, LM Studio, vLLM and several hosted
services with one implementation, because they all accept the same request
shape. The picture is fetched from Home Assistant and inlined as a data URI,
which every one of them accepts and which needs no file to be shared between
the two machines.
"""

from __future__ import annotations

import base64
import json
import logging
import time
from typing import Any

from homeassistant.components.camera import async_get_image
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from ..core.config import CameraConfig, VisionProfile
from ..core.observations import to_json_schema
from . import VisionError, build_prompt

_LOGGER = logging.getLogger(__name__)

# Long edge the snapshot is asked for. A camera frame is far larger than a
# vision model needs; sending it whole costs tokens on a hosted model and
# memory on a local one without adding anything the model can act on.
IMAGE_LONG_EDGE = 1024

SCHEMA_NAME = "camwatch_observations"


def _endpoint(url: str) -> str:
    """Normalise the configured URL to the chat completions endpoint.

    Users paste whichever form their runner printed: with or without /v1, with
    or without the path. Accepting all of them avoids a support question whose
    answer is a slash.
    """
    trimmed = url.rstrip("/")
    if trimmed.endswith("/chat/completions"):
        return trimmed
    if trimmed.endswith("/v1"):
        return f"{trimmed}/chat/completions"
    return f"{trimmed}/v1/chat/completions"


async def _snapshot(hass: HomeAssistant, entity_id: str) -> tuple[bytes, str]:
    """Fetch a still from the camera."""
    try:
        image = await async_get_image(hass, entity_id, width=IMAGE_LONG_EDGE)
    except Exception as err:
        raise VisionError(f"no snapshot from {entity_id}: {err}") from err
    return image.content, image.content_type or "image/jpeg"


async def async_run(
    hass: HomeAssistant,
    camera: CameraConfig,
    profile: VisionProfile,
    camera_entity_id: str,
) -> tuple[Any, float]:
    """Send one picture and return the parsed answer and how long it took."""
    backend = profile.backend
    started = time.monotonic()

    content, mime = await _snapshot(hass, camera_entity_id)
    data_uri = f"data:{mime};base64,{base64.b64encode(content).decode('ascii')}"

    payload: dict[str, Any] = {
        "model": backend.model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": build_prompt(camera, profile)},
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            }
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": SCHEMA_NAME,
                "strict": True,
                "schema": to_json_schema(list(profile.observations)),
            },
        },
        # Nothing here benefits from invention: the same picture should give
        # the same answer twice.
        "temperature": 0,
    }

    headers = {"Content-Type": "application/json"}
    if backend.api_key:
        headers["Authorization"] = f"Bearer {backend.api_key}"

    session = async_get_clientsession(hass)
    try:
        response = await session.post(
            _endpoint(backend.url or ""),
            json=payload,
            headers=headers,
            timeout=backend.timeout_seconds,
        )
        body = await response.text()
    except Exception as err:
        raise VisionError(f"the model at {backend.url} could not be reached: {err}") from err

    if response.status >= 400:
        # The body usually says what is wrong (unknown model, no vision
        # support), and that is exactly what the user needs to see.
        raise VisionError(f"the model answered HTTP {response.status}: {body[:300]}")

    return _extract(body), time.monotonic() - started


def _extract(body: str) -> Any:
    """Pull the structured answer out of a chat completion response.

    Runners that do not implement structured output still answer, just with the
    JSON wrapped in prose or in a fenced block. Recovering it is worth doing;
    the alternative is telling the user their model is broken when it is not.
    """
    try:
        envelope = json.loads(body)
    except json.JSONDecodeError as err:
        raise VisionError(f"the answer was not JSON: {body[:200]}") from err

    try:
        content = envelope["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as err:
        raise VisionError(f"unexpected answer shape: {body[:200]}") from err

    if isinstance(content, dict):
        return content
    if not isinstance(content, str):
        raise VisionError(f"the model answered with {type(content).__name__}")

    text = content.strip()
    if text.startswith("```"):
        # A fenced block, with or without a language tag on the first line.
        text = text.split("\n", 1)[-1] if "\n" in text else text
        text = text.rsplit("```", 1)[0].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Last resort: the outermost braces, for a model that wrapped its JSON in
    # a sentence.
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError as err:
            raise VisionError(f"the answer was not usable JSON: {text[:200]}") from err
    raise VisionError(f"the answer contained no JSON: {text[:200]}")
