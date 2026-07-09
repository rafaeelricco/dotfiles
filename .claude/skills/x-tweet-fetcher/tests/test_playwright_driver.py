from unittest.mock import Mock

import pytest

from xtf.backends import _playwright_driver


def test_page_text_returns_playwright_aria_snapshot():
    page = Mock()
    page.locator.return_value.aria_snapshot.return_value = "- text: loaded"

    assert _playwright_driver._page_text(page) == "- text: loaded"
    page.locator.assert_called_once_with("body")
    page.locator.return_value.aria_snapshot.assert_called_once_with(timeout=5000)


def test_snapshot_failure_never_falls_back_to_body_text_or_html(monkeypatch):
    playwright = Mock()
    browser = Mock()
    context = Mock()
    page = Mock()
    page.locator.return_value.aria_snapshot.side_effect = RuntimeError("snapshot failed")
    context.new_page.return_value = page

    monkeypatch.setattr(
        _playwright_driver,
        "_launch_browser",
        Mock(return_value=(playwright, browser)),
    )
    monkeypatch.setattr(_playwright_driver, "_new_context", Mock(return_value=context))
    monkeypatch.setattr(_playwright_driver, "_safe_goto", Mock())
    monkeypatch.setattr(_playwright_driver.time, "sleep", Mock())

    assert _playwright_driver._fetch_url_text("https://example.test") is None
    page.inner_text.assert_not_called()
    page.content.assert_not_called()


@pytest.mark.parametrize(
    "error",
    (ImportError("missing package"), RuntimeError("missing browser")),
)
def test_check_camofox_rejects_unusable_playwright(monkeypatch, error):
    monkeypatch.setattr(
        _playwright_driver,
        "_launch_browser",
        Mock(side_effect=error),
    )

    assert _playwright_driver.check_camofox() is False


def test_check_camofox_closes_successful_probe(monkeypatch):
    playwright = Mock()
    browser = Mock()
    monkeypatch.setattr(
        _playwright_driver,
        "_launch_browser",
        Mock(return_value=(playwright, browser)),
    )

    assert _playwright_driver.check_camofox() is True
    browser.close.assert_called_once_with()
    playwright.stop.assert_called_once_with()


def test_launch_failure_stops_started_playwright(monkeypatch):
    import playwright.sync_api

    playwright_controller = Mock()
    playwright_controller.chromium.launch.side_effect = RuntimeError("launch failed")
    manager = Mock()
    manager.start.return_value = playwright_controller
    monkeypatch.setattr(
        playwright.sync_api,
        "sync_playwright",
        Mock(return_value=manager),
    )
    monkeypatch.setattr(_playwright_driver, "_resolve_chromium_executable", Mock(return_value=None))

    with pytest.raises(RuntimeError, match="launch failed"):
        _playwright_driver._launch_browser()

    playwright_controller.stop.assert_called_once_with()
