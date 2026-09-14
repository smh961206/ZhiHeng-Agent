"""Stable ASGI entrypoint; implementation lives in the API layer."""

from .api.factory import create_app

app = create_app()
