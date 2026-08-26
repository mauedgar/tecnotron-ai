import argparse
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


class RepoPackagerExactTests(unittest.TestCase):
    def _run_exact(self, root, paths, budget=8000):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "exact", "--root", str(root), "--paths", paths, "--budget", str(budget)],
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout)

    def test_exact_returns_stable_json_with_required_keys(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "src").mkdir()
            (root / "src" / "a.py").write_text("print('a')", encoding="utf-8")

            out = self._run_exact(root, "src/a.py")

            self.assertEqual(out["provider"], "repo-packager")
            self.assertIn(out["quality_status"], ("COMPLETE", "PARTIAL"))
            self.assertEqual(out["requested_paths"], ["src/a.py"])
            self.assertEqual(out["included_paths"], ["src/a.py"])
            self.assertEqual(out["omitted_paths"], [])
            self.assertGreater(out["tokens"], 0)
            self.assertEqual(len(out["evidence"]), 1)
            self.assertEqual(out["evidence"][0]["path"], "src/a.py")
            self.assertEqual(out["evidence"][0]["content"], "print('a')")

    def test_exact_respects_budget(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "a.py").write_text("x" * 400, encoding="utf-8")
            (root / "b.py").write_text("y" * 400, encoding="utf-8")

            out = self._run_exact(root, "a.py,b.py", budget=100)

            self.assertEqual(out["quality_status"], "PARTIAL")
            self.assertEqual(len(out["included_paths"]), 1)
            self.assertEqual(len(out["omitted_paths"]), 1)

    def test_exact_applies_default_exclusions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / ".env").write_text("SECRET=123", encoding="utf-8")
            (root / "src").mkdir()
            (root / "src" / "main.py").write_text("ok", encoding="utf-8")

            out = self._run_exact(root, ".env,src/main.py")

            self.assertIn("src/main.py", out["included_paths"])
            self.assertIn(".env", out["omitted_paths"])

    def test_exact_blocks_traversal_outside_root(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "safe.txt").write_text("safe", encoding="utf-8")
            outside = Path(directory).parent / "outside_fixture_target.txt"
            outside.write_text("no", encoding="utf-8")
            try:
                rel_outside = str(outside).replace("\\", "/")
                out = self._run_exact(root, f"../outside_fixture_target.txt,safe.txt")

                self.assertIn("safe.txt", out["included_paths"])
                self.assertIn("../outside_fixture_target.txt", out["omitted_paths"])
            finally:
                outside.unlink(missing_ok=True)

    def test_exact_creates_no_cache(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "f.txt").write_text("content", encoding="utf-8")
            cache_dir = root / ".repo-packager-cache"

            self._run_exact(root, "f.txt")

            self.assertFalse(cache_dir.exists())

    def test_exact_missing_files_go_to_omitted(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "real.txt").write_text("ok", encoding="utf-8")

            out = self._run_exact(root, "real.txt,ghost.txt")

            self.assertIn("real.txt", out["included_paths"])
            self.assertIn("ghost.txt", out["omitted_paths"])

    def test_exact_preserves_requested_order(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ("c.py", "a.py", "b.py"):
                (root / name).write_text(name, encoding="utf-8")

            out = self._run_exact(root, "c.py,a.py,b.py")

            self.assertEqual(out["requested_paths"], ["c.py", "a.py", "b.py"])
            self.assertEqual(out["included_paths"], ["c.py", "a.py", "b.py"])

    def test_exact_no_npx_or_repomix_called(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "x.py").write_text("x", encoding="utf-8")
            args = argparse.Namespace(root=str(root), paths="x.py", budget=8000)
            with mock.patch.object(PACK.subprocess, "run") as mock_run:
                import io
                from contextlib import redirect_stdout
                buf = io.StringIO()
                with redirect_stdout(buf):
                    PACK.mode_exact(args)
                mock_run.assert_not_called()
            out = json.loads(buf.getvalue())
            self.assertEqual(out["included_paths"], ["x.py"])


if __name__ == "__main__":
    unittest.main()
