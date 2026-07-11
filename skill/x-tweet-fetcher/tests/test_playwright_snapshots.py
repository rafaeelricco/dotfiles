import pytest

from xtf.parsers.snapshot import (
    extract_next_cursor,
    parse_article_snapshot,
    parse_replies_snapshot,
    parse_timeline_snapshot,
)


@pytest.mark.parametrize("anchor", ("- link [e1]:", "- link:"))
def test_timeline_accepts_camofox_and_playwright_anchors(anchor):
    snapshot = "\n".join((
        anchor,
        "- /url: /alice/status/123#m",
        '- link "Alice":',
        "- /url: /alice",
        '- link "@alice":',
        "- /url: /alice",
        '- link "1h":',
        "- /url: /alice/status/123#m",
        "- text: A tweet captured from an ARIA snapshot",
    ))

    tweet = parse_timeline_snapshot(snapshot)[0]

    assert (tweet["author"], tweet["tweet_id"], tweet["text"]) == (
        "@alice",
        "123",
        "A tweet captured from an ARIA snapshot",
    )


def test_playwright_reply_snapshot_preserves_structured_fields():
    snapshot = "\n".join((
        "- link:",
        "- /url: /bob/status/456#m",
        '- link "Bob":',
        "- /url: /bob",
        '- link "@bob":',
        "- /url: /bob",
        '- link "1h":',
        "- /url: /bob/status/456#m",
        "- text: Replying to",
        '- link "@alice":',
        "- /url: /alice",
        "- text: A reply",
    ))

    reply = parse_replies_snapshot(snapshot, original_author="alice")[0]

    assert (reply["author"], reply["tweet_id"], reply["text"]) == (
        "@bob",
        "456",
        "A reply",
    )


def test_playwright_article_snapshot_preserves_structured_fields():
    snapshot = "\n".join((
        '- heading "Article title" [level=1]',
        "- text: @alice",
        "- text: Alice",
        "- text: This paragraph contains the full article body for the parser.",
    ))

    article = parse_article_snapshot(snapshot)

    assert article["title"] == "Article title"
    assert article["author_handle"] == "@alice"
    assert article["content"]


def test_playwright_snapshot_preserves_pagination_cursor():
    snapshot = "\n".join((
        '- link "Load more":',
        '- /url: "?cursor=next%2Fpage"',
    ))

    assert extract_next_cursor(snapshot) == "next/page"
