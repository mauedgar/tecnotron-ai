"""Explicit Python 3.15 standard-library smoke; zero external dependencies."""
import sys

lazy import json
lazy import xml.etree.ElementTree as et


def run() -> dict[str, object]:
    assert sys.version_info[:3] == (3, 15, 2), sys.version
    # Newly requested module remains unresolved until first reference.
    assert 'xml.etree.ElementTree' not in sys.modules
    node = et.fromstring('<status ok="1"/>')
    assert node.tag == 'status'
    assert 'xml.etree.ElementTree' in sys.modules
    sample = json.loads('{"runtime":"3.15.2","ok":true}')
    immutable = frozendict(sample)
    assert immutable["ok"] is True
    assert immutable["runtime"] == "3.15.2"
    try:
        immutable["runtime"] = "tampered"
    except TypeError:
        pass
    else:
        raise AssertionError("frozendict allowed mutation")
    return {"runtime": immutable["runtime"], "ok": immutable["ok"]}


if __name__ == "__main__":
    print(run())
