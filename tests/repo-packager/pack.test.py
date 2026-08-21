import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / ".opencode" / "skills" / "repo-packager" / "scripts" / "pack.py"
SPEC = importlib.util.spec_from_file_location("repo_packager", SCRIPT)
PACK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PACK)


class RepoPackagerTests(unittest.TestCase):
    def test_filters_default_ignore_and_windows_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / ".gitignore").write_text("ignored/\n", encoding="utf-8")
            files = {
                "src/main.py": "print('ok')",
                ".env": "SECRET=value",
                "node_modules\\lib\\index.js": "module.exports = 1",
                "__pycache__/module.pyc": "cache",
                "ignored/file.txt": "ignored",
            }

            self.assertEqual(PACK.filter_excluded_files(files, root), {"src/main.py": "print('ok')"})

    def test_rebuilds_a_cache_created_before_exclusions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture = root / "repo.json"
            fixture.write_text("{}", encoding="utf-8")
            unfiltered = {"src/main.py": "", ".env": "SECRET"}
            PACK.load_or_build_graph(fixture, unfiltered)

            filtered = {"src/main.py": ""}
            graph = PACK.load_or_build_graph(fixture, filtered)

            self.assertEqual(set(graph.nodes), set(filtered))

    def test_reduced_declares_partial_and_omits_excluded_content(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture = root / "repo.json"
            fixture.write_text(
                json.dumps({"files": {"src/a.py": "x" * 16, "src/b.py": "y" * 16, ".env": "SECRET"}}),
                encoding="utf-8",
            )

            result = subprocess.run(
                [sys.executable, str(SCRIPT), "reducido", "--json", str(fixture), "--budget", "4"],
                capture_output=True,
                text=True,
                check=True,
            )

            self.assertIn("Status: PARTIAL", result.stdout)
            self.assertNotIn("SECRET", result.stdout)

    def test_expanded_limit_exposes_requested_included_and_omitted_paths(self):
        paths = ",".join(f"src/{index}.py" for index in range(11))
        with mock.patch.object(PACK.subprocess, "run") as run:
            run.return_value = subprocess.CompletedProcess([], 0, json.dumps({"files": {}}), "")
            with mock.patch.object(sys, "argv", ["pack.py", "ampliado", "--paths", paths]):
                from io import StringIO
                from contextlib import redirect_stdout

                output = StringIO()
                with redirect_stdout(output):
                    PACK.main()

        self.assertIn("Status: PARTIAL", output.getvalue())
        self.assertIn("Paths requested:", output.getvalue())
        self.assertIn("Paths included:", output.getvalue())
        self.assertIn("Paths omitted: src/10.py", output.getvalue())


if __name__ == "__main__":
    unittest.main()
