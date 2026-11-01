#!/usr/bin/env python3
"""Verify documented Python invocations resolve to vendored scripts."""

import re
import unittest
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[2]
ROOT = SKILL_DIR.parents[2]
DOCS = (SKILL_DIR / "SKILL.md", ROOT / "docs/design/SKILLS.md")
SCRIPT_PATH = re.compile(
    r'(?<![\w/.-])(?:python3?|py -3)\s+"?(\.agents/skills/ui-ux-pro-max/scripts/[\w.-]+\.py)'
)


class SkillScriptPathsTest(unittest.TestCase):
    def test_documented_python_invocations_use_shipped_scripts(self):
        problems = []
        checked = 0
        for source in DOCS:
            content = source.read_text(encoding="utf-8")
            for match in SCRIPT_PATH.finditer(content):
                checked += 1
                rel = match.group(1)
                if not (ROOT / rel).is_file():
                    problems.append(f"{source}: {rel} does not exist")
        self.assertGreater(checked, 0, "No script invocations found to validate")
        self.assertEqual([], problems)


if __name__ == "__main__":
    unittest.main()
