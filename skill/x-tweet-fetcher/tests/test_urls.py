import pytest

from xtf.parsers.urls import parse_tweet_url


@pytest.mark.parametrize(
    "url",
    [
        "https://x.com/User_1/status/123",
        "https://twitter.com/User_1/status/123?s=20",
        "x.com/User_1/status/123",
        "www.twitter.com/User_1/status/123/",
        "https://www.x.com/User_1/status/123/photo/1",
    ],
)
def test_parse_tweet_url_accepts_supported_hosts(url):
    assert parse_tweet_url(url) == ("User_1", "123")


@pytest.mark.parametrize(
    "url",
    [
        "https://notx.com/user/status/123",
        "https://evil-twitter.com/user/status/123",
        "https://x.com.evil.example/user/status/123",
        "https://evil.example/x.com/user/status/123",
        "https://x.com@evil.example/user/status/123",
    ],
)
def test_parse_tweet_url_rejects_lookalike_hosts(url):
    with pytest.raises(ValueError):
        parse_tweet_url(url)
