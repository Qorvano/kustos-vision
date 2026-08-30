"""Entities that hold what the model saw.

One entity per observation, created and removed as the user edits the
questions in the panel. They are ordinary sensors, so everything in Home
Assistant that reacts to a sensor works with them: automations, dashboards,
history, voice.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import MAX_LENGTH_STATE_STATE
from homeassistant.core import callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .coordinator import CamwatchCoordinator
from .core.observations import Observation
from .entity import CamwatchCameraEntity

# A state longer than this is rejected by Home Assistant outright, so free-text
# answers are shortened for the state and kept whole in an attribute. The
# ellipsis makes it visible that there is more rather than looking like the
# model simply stopped.
ELLIPSIS = "…"


def shorten(text: str) -> str:
    """Fit an answer into a state value without losing that it was cut."""
    if len(text) <= MAX_LENGTH_STATE_STATE:
        return text
    return text[: MAX_LENGTH_STATE_STATE - len(ELLIPSIS)] + ELLIPSIS


class ObservationEntity(CamwatchCameraEntity):
    """Base for the entities that carry one answer."""

    def __init__(
        self,
        coordinator: CamwatchCoordinator,
        camera_slug: str,
        observation: Observation,
    ) -> None:
        super().__init__(coordinator, camera_slug, f"vision_{observation.key}")
        self.observation = observation
        # Deliberately the short label, not the question: Home Assistant builds
        # the entity id from the name, and a question makes an identifier that
        # is both unusable in an automation and unstable, because improving the
        # wording would rename the entity. The full question is an attribute.
        self._attr_name = observation.display_name

    @property
    def vision_state(self):
        return self.coordinator.vision.state_for(self.camera_slug)

    @property
    def answer(self):
        return self.vision_state.values.get(self.observation.key)

    @property
    def available(self) -> bool:
        """Available once there is an answer.

        Before the first analysis there is nothing to report, and saying
        "unknown" would be indistinguishable from the model having answered
        that nothing is there.
        """
        profile = self.coordinator.config.vision_for(self.camera_slug)
        if profile is None or profile.observation(self.observation.key) is None:
            return False
        return self.answer is not None

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        state = self.vision_state
        attributes: dict[str, object] = {
            "question": self.observation.question,
            "checked_at": state.last_run.isoformat() if state.last_run else None,
        }
        if state.last_error:
            attributes["last_error"] = state.last_error
        return attributes


@callback
def async_setup_observations(
    entry: ConfigEntry,
    coordinator: CamwatchCoordinator,
    async_add_entities: AddConfigEntryEntitiesCallback,
    build: Callable[[str, Observation], Iterable[ObservationEntity]],
) -> None:
    """Add observation entities now, and again whenever one is added.

    Questions are edited in the panel while Home Assistant runs, so entities
    have to appear afterwards. One removed leaves its entity behind as
    unavailable rather than being deleted, so re-adding the same question keeps
    its history.
    """
    known: set[tuple[str, str]] = set()

    @callback
    def _sync() -> None:
        entities: list[ObservationEntity] = []
        for profile in coordinator.config.vision:
            for observation in profile.observations:
                key = (profile.camera_slug, observation.key)
                if key in known:
                    continue
                known.add(key)
                entities.extend(build(profile.camera_slug, observation))
        if entities:
            async_add_entities(entities)

    _sync()
    entry.async_on_unload(coordinator.async_add_listener(_sync))
