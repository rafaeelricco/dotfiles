from unittest.mock import Mock

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
