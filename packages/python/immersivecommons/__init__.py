"""immersivecommons — thin, spec-derived client for the Immersive Commons
Agent REST API (https://www.immersivecommons.com).

    from immersivecommons import Client
    ic = Client(token="agt_...")
    events = ic.list_upcoming_events(limit=5)
"""
from ._generated import API_VERSION, DEFAULT_BASE_URL, OPERATIONS
from .client import Client, IcApiError

__version__ = "0.1.0"
__all__ = ["Client", "IcApiError", "API_VERSION", "DEFAULT_BASE_URL", "OPERATIONS", "__version__"]
