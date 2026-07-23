from unittest.mock import Mock

import pytest

from xtf import cli
from xtf.backends import _camofox_driver, _playwright_driver
from xtf.backends.browser import BrowserBackend
from xtf.backends.fxtwitter import FxTwitterBackend, supplement_views
from xtf.backends.nitter import NitterBackend
from xtf.router import Router


def test_timeout_parser_default_and_positive_value():
    parser = cli.build_parser()
    assert parser.parse_args([]).timeout == 30
    assert parser.parse_args(["--timeout", "7"]).timeout == 7


@pytest.mark.parametrize("value", ("0", "-1", "1.5"))
def test_timeout_parser_rejects_non_positive_integers(value, capsys):
    with pytest.raises(SystemExit) as exc:
        cli.build_parser().parse_args(["--timeout", value])

    assert exc.value.code == 2
    assert "argument --timeout: must be a positive integer" in capsys.readouterr().err


@pytest.mark.parametrize(
    "args",
    (
        ["--user", "alice"],
        ["--url", "https://x.com/alice/status/123", "--replies"],
        ["--list", "123"],
    ),
)
def test_cli_forwards_timeout_to_router_and_view_supplements(monkeypatch, args):
    router_options = []
    supplement_timeouts = []

    class Item:
        def to_dict(self):
            return {
                "author": "@alice",
                "author_name": "Alice",
                "text": "hello",
                "likes": 0,
                "replies": 0,
                "views": 1,
            }

    class FakeRouter:
        last_backend = "fake"

        def __init__(self, **kwargs):
            router_options.append(kwargs)

        def fetch_timeline(self, _username, limit=20):
            return [Item()]

        def fetch_replies(self, _username, _tweet_id):
            return [Item()]

        def fetch_list(self, _list_id, limit=20):
            return [Item()]

    def record_supplement(items, max_supplement=50, timeout=5):
        supplement_timeouts.append(timeout)
        return items

    monkeypatch.setattr(cli, "Router", FakeRouter)
    monkeypatch.setattr(cli, "supplement_views", record_supplement)

    with pytest.raises(SystemExit) as exc:
        cli.main([*args, "--timeout", "7"])

    assert exc.value.code == 0
    assert router_options[0]["timeout"] == 7
    assert supplement_timeouts == [7]


def test_router_and_http_backends_receive_timeout(monkeypatch):
    router = Router(
        timeout=7,
        nitter_instances=["https://nitter.example"],
        browser_nitter="https://nitter.example",
    )
    assert router.fxtwitter.timeout == 7
    assert router.nitter.timeout == 7
    assert router.browser.timeout == 7

    fx_timeouts = []

    def fake_get_json(url, **kwargs):
        fx_timeouts.append(kwargs["timeout"])
        if "/status/" in url:
            return {"code": 200, "tweet": {"views": 1}}
        return {"user": {"screen_name": "alice"}}

    monkeypatch.setattr("xtf.backends.fxtwitter.http.get_json", fake_get_json)
    backend = FxTwitterBackend(timeout=7)
    backend.fetch_tweet("alice", "123")
    backend.fetch_user_info("alice")
    backend.fetch_user_info_dict("alice")
    supplement_views(
        [{"author": "@alice", "tweet_id": "123", "views": 0}],
        timeout=7,
    )
    assert fx_timeouts == [7, 7, 7, 7]

    nitter_timeouts = []

    def probe(_url, timeout):
        nitter_timeouts.append(timeout)
        return True

    def get_text(_url, **kwargs):
        nitter_timeouts.append(kwargs["timeout"])
        return "<html>ok</html>"

    monkeypatch.setattr("xtf.backends.nitter.http.probe", probe)
    monkeypatch.setattr("xtf.backends.nitter.http.get_text", get_text)
    nitter = NitterBackend(instances=["https://nitter.example"], timeout=7)
    assert nitter.available() is True
    assert nitter._get_html("/alice") == "<html>ok</html>"
    assert nitter_timeouts == [7, 7]


def test_browser_forwards_timeout_without_changing_render_wait():
    calls = []

    class Driver:
        def check_camofox(self, port, timeout):
            calls.append(("check", port, timeout))
            return True

        def camofox_fetch_page(self, url, session_key, wait, port, timeout):
            calls.append(("fetch", url, session_key, wait, port, timeout))
            return "- text: empty"

        def camofox_search(self, query, num, port, timeout):
            calls.append(("search", query, num, port, timeout))
            return []

    backend = BrowserBackend(
        nitter_instance="https://nitter.example",
        timeout=7,
    )
    backend._drv = Driver()

    assert backend.available() is True
    backend.fetch_timeline("alice")
    backend.search_mentions("alice", limit=3)

    assert all(call[-1] == 7 for call in calls)
    assert [call[3] for call in calls if call[0] == "fetch"] == [8]


def test_camofox_requests_receive_timeout(monkeypatch):
    timeouts = []

    class Response:
        def __init__(self, body=b"{}"):
            self.body = body

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def read(self):
            return self.body

    def urlopen(request, timeout):
        timeouts.append(timeout)
        url = request.full_url if hasattr(request, "full_url") else request
        method = request.get_method() if hasattr(request, "get_method") else "GET"
        if method == "POST":
            return Response(b'{"tabId":"tab"}')
        if "snapshot" in url:
            return Response(b'{"snapshot":"snapshot"}')
        return Response()

    monkeypatch.setattr(_camofox_driver.urllib.request, "urlopen", urlopen)

    assert _camofox_driver.check_camofox(timeout=7) is True
    assert _camofox_driver.camofox_open_tab("https://example.test", "session", timeout=7) == "tab"
    assert _camofox_driver.camofox_snapshot("tab", timeout=7) == "snapshot"
    _camofox_driver.camofox_close_tab("tab", timeout=7)
    assert timeouts == [7, 7, 7, 7]


def test_camofox_facades_forward_timeout_without_changing_wait(monkeypatch):
    open_tab = Mock(return_value="tab")
    snapshot = Mock(return_value="snapshot")
    close_tab = Mock()
    sleep = Mock()
    monkeypatch.setattr(_camofox_driver, "camofox_open_tab", open_tab)
    monkeypatch.setattr(_camofox_driver, "camofox_snapshot", snapshot)
    monkeypatch.setattr(_camofox_driver, "camofox_close_tab", close_tab)
    monkeypatch.setattr(_camofox_driver.time, "sleep", sleep)

    assert _camofox_driver.camofox_fetch_page(
        "https://example.test",
        "session",
        wait=6,
        timeout=7,
    ) == "snapshot"
    open_tab.assert_called_once_with(
        "https://example.test",
        "session",
        port=9377,
        timeout=7,
    )
    snapshot.assert_called_once_with("tab", port=9377, timeout=7)
    close_tab.assert_called_once_with("tab", port=9377, timeout=7)
    sleep.assert_called_once_with(6)

    fetch_page = Mock(return_value=None)
    monkeypatch.setattr(_camofox_driver, "camofox_fetch_page", fetch_page)
    _camofox_driver.camofox_search("query", engine="duckduckgo", timeout=7)
    assert fetch_page.call_args.kwargs == {"wait": 5, "port": 9377, "timeout": 7}
    fetch_page.reset_mock()
    _camofox_driver.camofox_search("query", timeout=7)
    assert fetch_page.call_args.kwargs == {"wait": 4, "port": 9377, "timeout": 7}


def test_playwright_facades_forward_timeout_without_changing_wait(monkeypatch):
    playwright_controller = Mock()
    browser = Mock()
    context = Mock()
    page = Mock()
    page.locator.return_value.aria_snapshot.return_value = "- text: loaded"
    context.new_page.return_value = page
    launch = Mock(return_value=(playwright_controller, browser))
    safe_goto = Mock()
    sleep = Mock()
    monkeypatch.setattr(_playwright_driver, "_launch_browser", launch)
    monkeypatch.setattr(_playwright_driver, "_new_context", Mock(return_value=context))
    monkeypatch.setattr(_playwright_driver, "_safe_goto", safe_goto)
    monkeypatch.setattr(_playwright_driver.time, "sleep", sleep)

    assert _playwright_driver.camofox_fetch_page(
        "https://example.test",
        "session",
        wait=6,
        timeout=7,
    ) == "- text: loaded"
    launch.assert_called_once_with(timeout_seconds=7)
    safe_goto.assert_called_once_with(
        page,
        "https://example.test",
        timeout_seconds=7,
    )
    sleep.assert_called_once_with(6)

    launch.reset_mock()
    safe_goto.reset_mock()
    sleep.reset_mock()
    monkeypatch.setattr(_playwright_driver, "_extract_google_results", Mock(return_value=[]))
    assert _playwright_driver.camofox_search("query", timeout=7) == []
    launch.assert_called_once_with(timeout_seconds=7)
    safe_goto.assert_called_once()
    assert safe_goto.call_args.kwargs == {"timeout_seconds": 7}
    sleep.assert_called_once_with(4)


def test_playwright_converts_seconds_to_milliseconds(monkeypatch):
    page = Mock()
    _playwright_driver._safe_goto(
        page,
        "https://example.test",
        timeout_seconds=7,
    )
    page.goto.assert_called_once_with(
        "https://example.test",
        timeout=7000,
        wait_until="domcontentloaded",
    )

    import playwright.sync_api

    playwright_controller = Mock()
    browser = Mock()
    playwright_controller.chromium.launch.return_value = browser
    manager = Mock()
    manager.start.return_value = playwright_controller
    monkeypatch.setattr(
        playwright.sync_api,
        "sync_playwright",
        Mock(return_value=manager),
    )
    monkeypatch.setattr(_playwright_driver, "_resolve_chromium_executable", Mock(return_value=None))

    returned_controller, returned_browser = _playwright_driver._launch_browser(
        timeout_seconds=7
    )

    assert returned_controller is playwright_controller
    assert returned_browser is browser
    assert playwright_controller.chromium.launch.call_args.kwargs["timeout"] == 7000
    browser.close()
    playwright_controller.stop()
