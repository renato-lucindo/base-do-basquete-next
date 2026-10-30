#!/usr/bin/env python3
"""Check that vendored catalog hashes survive LF and CRLF checkouts."""

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

DATA = Path(__file__).resolve().parents[2] / "data"
SNAPSHOT_FILES = (
    "google-fonts.csv",
    "google-font-licenses.json",
    "icons.csv",
    "phosphor-icons-upstream.json",
)


def digest(path):
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


class CatalogSummaryLineEndingsTest(unittest.TestCase):
    def test_committed_snapshot_matches_normalized_sources(self):
        summary = json.loads((DATA / "catalog-summary.json").read_text(encoding="utf-8"))
        for name in SNAPSHOT_FILES:
            self.assertEqual(
                summary["snapshots"][name]["sha256"],
                digest(DATA / name),
                f"{name}: committed snapshot must match the normalized source",
            )

    def test_crlf_checkout_produces_the_committed_hashes(self):
        summary = json.loads((DATA / "catalog-summary.json").read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as tmp:
            for name in SNAPSHOT_FILES:
                raw = (DATA / name).read_bytes().replace(b"\r\n", b"\n")
                crlf_copy = Path(tmp) / name
                crlf_copy.write_bytes(raw.replace(b"\n", b"\r\n"))
                self.assertEqual(
                    digest(crlf_copy),
                    summary["snapshots"][name]["sha256"],
                    f"{name}: CRLF checkout must not alter the snapshot digest",
                )


if __name__ == "__main__":
    unittest.main()
