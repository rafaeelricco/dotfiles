import pytest

import xtf.backends.browser as browser_module
from xtf.backends.browser import BrowserBackend


@pytest.mark.parametrize(
    ("instance", "base"),
    [
        ("http://127.0.0.1:8788/", "http://127.0.0.1:8788"),
        ("https://nitter.example", "https://nitter.example"),
        ("nitter.example", "https://nitter.example"),
    ],
)
def test_browser_routes_preserve_normalized_nitter_base(monkeypatch, instance, base):
    backend = BrowserBackend(nitter_instance=instance)
    opened = []

    monkeypatch.setattr(backend, "_require", lambda _key: None)

    def capture_timeline(base_url, *_args, **_kwargs):
        opened.append(base_url)
        return [], 1

    monkeypatch.setattr(backend, "_paged_timeline", capture_timeline)
    backend.fetch_timeline("alice")
    backend.fetch_list("789")

    snapshots = iter([
        [{"author": "@bob", "tweet_id": "456", "replies": 1}],
        [],
    ])
    monkeypatch.setattr(
        browser_module,
        "parse_replies_snapshot",
        lambda *_args, **_kwargs: next(snapshots),
    )

    def capture_page(url, *_args, **_kwargs):
        opened.append(url)
        return "snapshot"

    monkeypatch.setattr(backend, "_fetch_page", capture_page)
    backend.fetch_replies("alice", "123")

    assert opened == [
        f"{base}/alice",
        f"{base}/i/lists/789",
        f"{base}/alice/status/123",
        f"{base}/bob/status/456",
    ]
