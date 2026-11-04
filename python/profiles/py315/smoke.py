"""Explicit Python 3.15 standard-library smoke; zero external dependencies."""
import sys

lazy import json
lazy import xml.etree.ElementTree as et


def run() -> dict[str, object]:
    if sys.version_info[:3] != (3, 15, 2):
        raise RuntimeError("unexpected Python runtime: " + sys.version)
    # Newly requested module remains unresolved until first reference.
    if 'xml.etree.ElementTree' in sys.modules:
        raise RuntimeError("lazy import eagerly loaded ElementTree")
    node = et.fromstring('<status ok="1"/>')
    if node.tag != 'status':
        raise RuntimeError("invalid parsed element")
    if 'xml.etree.ElementTree' not in sys.modules:
        raise RuntimeError("lazy import did not resolve ElementTree")
    sample = json.loads('{"runtime":"3.15.2","ok":true}')
    immutable = frozendict(sample)
    if immutable["ok"] is not True:
        raise RuntimeError("frozen value mismatch")
    if immutable["runtime"] != "3.15.2":
        raise RuntimeError("frozen runtime mismatch")
    try:
        immutable["runtime"] = "tampered"
    except TypeError:
        pass
    else:
        raise AssertionError("frozendict allowed mutation")
    return {"runtime": immutable["runtime"], "ok": immutable["ok"]}


if __name__ == "__main__":
    print(run())
