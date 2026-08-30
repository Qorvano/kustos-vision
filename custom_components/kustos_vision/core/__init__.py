"""Home-Assistant-free core of kustos_vision.

Everything in this package is plain Python: it builds argument lists, decides
what to delete, maps names to time and turns observation definitions into
schemas. Nothing here imports Home Assistant, so all of it is testable without
spinning up a hass instance.
"""
