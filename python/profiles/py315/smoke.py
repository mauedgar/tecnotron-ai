"""Explicit Python 3.15 standard-library smoke; zero external dependencies."""
import sys

lazy import json


def run() -> dict[str, object]:
    assert sys.version_info[:3] == (3, 15, 2), sys.version
    sample = json.loads('{"runtime":"3.15.2","ok":true}')
    immutable = frozendict(sample)
    assert immutable["ok"] is True
    assert immutable["runtime"] == "3.15.2"
    return {"runtime": immutable["runtime"], "ok": immutable["ok"]}


if __name__ == "__main__":
    print(run())
