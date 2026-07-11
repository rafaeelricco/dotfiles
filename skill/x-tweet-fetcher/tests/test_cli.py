import json

import pytest

from xtf.cli import main


CASES = [
    ("--article", "Cannot parse Article URL or ID: bad"),
    ("--list", "Cannot parse List URL or ID: bad"),
]


@pytest.mark.parametrize(("flag", "message"), CASES)
@pytest.mark.parametrize("extra", ([], ["--pretty"]))
def test_invalid_browser_input_emits_json(flag, message, extra, capsys):
    with pytest.raises(SystemExit) as exc:
        main([flag, "bad", "--lang", "en", *extra])

    captured = capsys.readouterr()
    assert exc.value.code == 1
    assert json.loads(captured.out) == {
        "error": message,
        "error_code": "invalid_input",
    }
    assert captured.err == ""


@pytest.mark.parametrize(("flag", "message"), CASES)
def test_invalid_browser_input_preserves_text_only_stderr(flag, message, capsys):
    with pytest.raises(SystemExit) as exc:
        main([flag, "bad", "--lang", "en", "--text-only"])

    captured = capsys.readouterr()
    assert exc.value.code == 1
    assert captured.out == ""
    assert captured.err == f"Error: {message}\n"
