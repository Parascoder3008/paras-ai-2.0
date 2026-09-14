import importlib.util
import os
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('os_brain', ROOT / 'ai-os/tools/os_brain.py')
brain = importlib.util.module_from_spec(spec)
spec.loader.exec_module(brain)

class SearchScopeTests(unittest.TestCase):
    def test_current_memory_and_media_skills_are_indexed(self):
        paths = [Path(p) for p, _ in brain._docs()]
        self.assertIn(ROOT / 'memory/decisions.md', paths)
        self.assertIn(ROOT / '.agents/skills/hyperframes/SKILL.md', paths)
        self.assertFalse(any('archive' in p.parts or 'private' in p.parts or 'ec-system' in p.parts for p in paths))
        self.assertNotIn(ROOT / 'ai-os/dfy-offer.md', paths)

    def test_vault_is_project_scoped(self):
        sources = [p for p, label in brain.SOURCES if label == 'obsidian']
        self.assertTrue(all(not p or p.endswith(os.path.join('projects', 'Paras AI 2.0')) for p in sources))

if __name__ == '__main__':
    unittest.main()
