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

import aiohttp
from homeassistant.components.camera import async_get_image
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from ..core.config import CameraConfig, VisionProfile
from ..core.marks import (
    MARKS_FIELD,
    OBJECTS_FIELD,
    grounding_prompt,
    grounding_schema,
    marks_prompt,
    marks_schema_fragment,
    objects_prompt,
    objects_schema_fragment,
    parse_object_names,
)
from ..core.observations import fields_prompt, to_json_schema
from . import VisionError, VisionRequest, analysis_fields, build_prompt

_LOGGER = logging.getLogger(__name__)

# Long edge the snapshot is asked for. A camera frame is far larger than a
# vision model needs; sending it whole costs tokens on a hosted model and
# memory on a local one without adding anything the model can act on.
IMAGE_LONG_EDGE = 1024

SCHEMA_NAME = "kustos_vision_observations"


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


# Listing models loads nothing on the server and answers immediately or not
# at all; waiting longer only delays the error message.
LIST_MODELS_TIMEOUT_SECONDS = 15

# A probe completion may be the request that makes a swapping runner load
# the model from disk, which takes a minute on large models; giving up
# earlier reports a healthy endpoint as broken.
PROBE_TIMEOUT_SECONDS = 120

# Enough tokens for an acknowledgement in any tokenizer while cutting a
# chatty model short - the probe only proves the model answers at all.
PROBE_MAX_TOKENS = 8


def models_endpoint(url: str) -> str:
    """Normalise the configured URL to the model listing.

    Accepts the same spellings _endpoint does, so whatever URL worked for
    analyses also works for discovery.
    """
    trimmed = (url or "").rstrip("/")
    if trimmed.endswith("/chat/completions"):
        trimmed = trimmed[: -len("/chat/completions")]
    if not trimmed.endswith("/v1"):
        trimmed = f"{trimmed}/v1"
    return f"{trimmed}/models"


def _auth_headers(api_key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {api_key}"} if api_key else {}


def _describe(err: Exception) -> str:
    """An error line that is never empty.

    ServerDisconnectedError and friends stringify to nothing, and "could not
    be reached: " with nothing after the colon sent the diagnosis in circles.
    """
    text = str(err).strip()
    return f"{type(err).__name__}: {text}" if text else type(err).__name__


async def _post_once_retried(
    session: aiohttp.ClientSession,
    url: str,
    payload: dict[str, Any],
    headers: dict[str, str],
    timeout: float,
) -> aiohttp.ClientResponse:
    """POST, retrying a single time when a pooled connection turned out dead.

    A request the client aborts (our own timeout included) leaves its
    keep-alive socket poisoned; the server closing idle connections does the
    same. The next request then fails INSTANTLY without ever leaving the
    machine, and aiohttp deliberately does not retry non-idempotent requests
    on its own. One retry on a fresh connection is exactly the repair; a
    second failure is a real refusal and goes to the caller.
    """
    try:
        return await session.post(url, json=payload, headers=headers, timeout=timeout)
    except (aiohttp.ServerDisconnectedError, aiohttp.ClientOSError):
        return await session.post(url, json=payload, headers=headers, timeout=timeout)


async def async_list_models(
    hass: HomeAssistant, url: str, api_key: str = ""
) -> list[str]:
    """Ask an endpoint which models it offers (GET /v1/models)."""
    session = async_get_clientsession(hass)
    try:
        response = await session.get(
            models_endpoint(url),
            headers=_auth_headers(api_key),
            timeout=LIST_MODELS_TIMEOUT_SECONDS,
        )
        body = await response.text()
    except Exception as err:
        raise VisionError(
            f"the endpoint could not be reached: {_describe(err)}"
        ) from err
    if response.status >= 400:
        raise VisionError(f"the endpoint answered HTTP {response.status}: {body[:300]}")
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as err:
        raise VisionError(f"the answer was not JSON: {body[:200]}") from err
    data = parsed.get("data")
    if not isinstance(data, list):
        raise VisionError("the answer did not look like a model list")
    models = sorted(
        str(entry["id"])
        for entry in data
        if isinstance(entry, dict) and entry.get("id")
    )
    if not models:
        raise VisionError("the endpoint lists no models")
    return models


async def async_probe_model(
    hass: HomeAssistant, url: str, model: str, api_key: str = ""
) -> float:
    """One tiny completion against one model; the seconds it took, or raises.

    Text-only on purpose: reachability, authentication and model loading are
    what fail in practice, and a probe must not need a camera picture.
    """
    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "user", "content": "Reply with the single word OK."}
        ],
        "max_tokens": PROBE_MAX_TOKENS,
        "temperature": 0,
    }
    session = async_get_clientsession(hass)
    started = time.monotonic()
    try:
        response = await _post_once_retried(
            session,
            _endpoint(url),
            payload,
            {"Content-Type": "application/json", **_auth_headers(api_key)},
            PROBE_TIMEOUT_SECONDS,
        )
        body = await response.text()
    except Exception as err:
        raise VisionError(
            f"the model could not be reached: {_describe(err)}"
        ) from err
    if response.status >= 400:
        raise VisionError(f"the model answered HTTP {response.status}: {body[:300]}")
    try:
        content = json.loads(body)["choices"][0]["message"]["content"]
    except (json.JSONDecodeError, KeyError, IndexError, TypeError) as err:
        raise VisionError(f"unexpected answer shape: {body[:200]}") from err
    if not content:
        raise VisionError("the model answered nothing")
    return time.monotonic() - started


def _data_uri(content: bytes, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(content).decode('ascii')}"


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
    request: VisionRequest | None = None,
) -> tuple[Any, float]:
    """Send one picture and return the parsed answer and how long it took."""
    backend = profile.backend
    started = time.monotonic()

    if request is not None and request.frame is not None:
        # The frame the runner captured at trigger time - the whole point.
        content, mime = request.frame.content, request.frame.content_type
    else:
        content, mime = await _snapshot(hass, camera_entity_id)

    asked = analysis_fields(profile, request)
    # The split flow: the main model NAMES what it recognises, a grounding
    # model then LOCATES exactly those names in a second request. One model
    # doing both stays the default, for setups without the capacity for two
    # models - and for models strong enough to not need the split.
    split_marks = (
        request is not None and request.mark_objects and bool(request.marks_model)
    )
    # The current frame first, deliberately: a runner or model that honours
    # only the first image still answers about NOW, so the degradation is
    # graceful in the direction that matters.
    #
    # The questions travel HERE, in the prompt, and not only as schema
    # descriptions: llama.cpp turns the schema into a grammar and never
    # shows its text to the model, which then answers from the field names
    # alone. See fields_prompt.
    fields_text = fields_prompt(asked)
    if request is not None and request.mark_objects:
        fields_text += "\n\n" + (objects_prompt() if split_marks else marks_prompt())
    parts: list[dict[str, Any]] = [
        {"type": "text", "text": build_prompt(camera, profile)},
        {"type": "text", "text": fields_text},
    ]
    references = request.references if request is not None else ()
    if references:
        parts.append(
            {
                "type": "text",
                "text": (
                    "This is the current camera frame. Every field is about "
                    "this picture and about nothing else."
                ),
            }
        )
    parts.append({"type": "image_url", "image_url": {"url": _data_uri(content, mime)}})
    for reference in references:
        parts.append({"type": "text", "text": reference.preamble})
        parts.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": _data_uri(reference.content, reference.content_type)
                },
            }
        )
    if references:
        # Attention drifts to the most recent image; the last thing the model
        # reads has to be which picture the questions are about.
        parts.append(
            {
                "type": "text",
                "text": (
                    "The first picture is the current camera frame. Answer "
                    "every field from that picture."
                ),
            }
        )

    schema = to_json_schema(asked)
    if request is not None and request.mark_objects:
        # Required like every other field: strict runners refuse optionals,
        # and "nothing" is expressed as an empty list either way.
        if split_marks:
            schema["properties"][OBJECTS_FIELD] = objects_schema_fragment()
            schema["required"].append(OBJECTS_FIELD)
        else:
            schema["properties"][MARKS_FIELD] = marks_schema_fragment()
            schema["required"].append(MARKS_FIELD)

    payload: dict[str, Any] = {
        "model": backend.model,
        "messages": [{"role": "user", "content": parts}],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": SCHEMA_NAME,
                "strict": True,
                "schema": schema,
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
        response = await _post_once_retried(
            session,
            _endpoint(backend.url or ""),
            payload,
            headers,
            backend.timeout_seconds,
        )
        body = await response.text()
    except Exception as err:
        raise VisionError(
            f"the model at {backend.url} could not be reached: {_describe(err)}"
        ) from err

    if response.status >= 400:
        # The body usually says what is wrong (unknown model, no vision
        # support), and that is exactly what the user needs to see.
        raise VisionError(f"the model answered HTTP {response.status}: {body[:300]}")

    raw = _extract(body)
    if split_marks and isinstance(raw, dict):
        names = parse_object_names(raw.get(OBJECTS_FIELD))
        if names:
            try:
                raw[MARKS_FIELD] = await _async_ground(
                    hass, backend, request.marks_model, content, mime, names
                )
            except VisionError as err:
                # Decoration on top of a finished analysis: the answers
                # stand, the picture simply stays unmarked.
                _LOGGER.warning(
                    "kustos_vision: locating the objects failed: %s", err
                )
    return raw, time.monotonic() - started


async def _async_ground(
    hass: HomeAssistant,
    backend,
    marks_model: str,
    content: bytes,
    mime: str,
    names: tuple[str, ...],
) -> Any:
    """The second request of the split flow: locate the given names.

    Same endpoint and frame, different model, and a schema whose labels are
    an enum over the names - the locating model cannot even mislabel what it
    marks, because naming already happened in the main request.
    """
    payload: dict[str, Any] = {
        "model": marks_model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": grounding_prompt(names)},
                    {
                        "type": "image_url",
                        "image_url": {"url": _data_uri(content, mime)},
                    },
                ],
            }
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "kustos_vision_grounding",
                "strict": True,
                "schema": grounding_schema(names),
            },
        },
        "temperature": 0,
    }
    headers = {"Content-Type": "application/json"}
    if backend.api_key:
        headers["Authorization"] = f"Bearer {backend.api_key}"
    session = async_get_clientsession(hass)
    try:
        response = await _post_once_retried(
            session,
            _endpoint(backend.url or ""),
            payload,
            headers,
            backend.timeout_seconds,
        )
        body = await response.text()
    except Exception as err:
        raise VisionError(
            f"the marks model could not be reached: {_describe(err)}"
        ) from err
    if response.status >= 400:
        raise VisionError(
            f"the marks model answered HTTP {response.status}: {body[:300]}"
        )
    extracted = _extract(body)
    if not isinstance(extracted, dict):
        raise VisionError("the marks model answered no field set")
    return extracted.get(MARKS_FIELD, [])


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
