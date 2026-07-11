import pytest

import xtf.backends.nitter as nitter_module
from xtf.backends.nitter import NitterBackend
from xtf.exceptions import BackendUnavailable, NotFound, RateLimited, UpstreamDown
from xtf.router import Router


INSTANCES = ["https://first.example", "https://second.example"]


def make_backend():
    backend = NitterBackend(instances=INSTANCES)
    backend._live = INSTANCES[0]
    return backend


def test_not_found_propagates_without_instance_failover(monkeypatch):
    backend = make_backend()
    calls = []

    def not_found(url, **_kwargs):
        calls.append(url)
        raise NotFound("missing")

    monkeypatch.setattr(nitter_module.http, "get_text", not_found)

    with pytest.raises(NotFound, match="missing"):
        backend._get_html("/alice/status/123")

    assert calls == ["https://first.example/alice/status/123"]
    assert backend._live == "https://first.example"


def test_rate_limit_fails_over_to_working_instance(monkeypatch):
    backend = make_backend()
    calls = []

    def fetch(url, **_kwargs):
        calls.append(url)
        if url.startswith(INSTANCES[0]):
            raise RateLimited("slow down")
        return "<html>ok</html>"

    monkeypatch.setattr(nitter_module.http, "get_text", fetch)

    assert backend._get_html("/alice") == "<html>ok</html>"
    assert calls == [f"{INSTANCES[0]}/alice", f"{INSTANCES[1]}/alice"]
    assert backend._live == INSTANCES[1]


def test_rate_limit_wins_after_mixed_transient_exhaustion(monkeypatch):
    backend = make_backend()

    def fail(url, **_kwargs):
        if url.startswith(INSTANCES[0]):
            raise RateLimited("slow down")
        raise UpstreamDown("offline")

    monkeypatch.setattr(nitter_module.http, "get_text", fail)

    with pytest.raises(RateLimited, match="slow down"):
        backend._get_html("/alice")


def test_all_upstream_outages_become_backend_unavailable(monkeypatch):
    backend = make_backend()

    def fail(url, **_kwargs):
        raise UpstreamDown(url)

    monkeypatch.setattr(nitter_module.http, "get_text", fail)

    with pytest.raises(BackendUnavailable) as exc:
        backend._get_html("/alice")

    assert INSTANCES[0] in str(exc.value)
    assert INSTANCES[1] in str(exc.value)


def test_auto_router_still_falls_back_after_rate_limits(monkeypatch):
    backend = make_backend()

    def rate_limited(_url, **_kwargs):
        raise RateLimited("slow down")

    monkeypatch.setattr(nitter_module.http, "get_text", rate_limited)

    class Browser:
        name = "browser"

        def fetch_replies(self, _username, _tweet_id):
            return ["fallback"]

    router = Router(nitter_instances=INSTANCES)
    router.nitter = backend
    router.browser = Browser()

    assert router.fetch_replies("alice", "123") == ["fallback"]
    assert router.last_backend == "browser"
