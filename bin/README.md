# bin

Scripts for reviewing and maintaining the frontend-base port. Each reads the provenance
manifest, `frontend-base/manifest.tsv`, which maps every legacy file under `src/` to its
target under `frontend-base/src/` or to `dropped`. Each script's `--help` prints its header.

## Diffs

A port commit adds files under `frontend-base/src/`, so `git show` presents each one as
new. `port-diff` shows what the commit changed: every file it added or changed under
`frontend-base/src/`, as it stands at that commit, diffed against the file its change is
read from.

```sh
git -C ../frontend-app-learning fetch upstream
bin/port-diff <commit> -C ../frontend-app-learning -o dates.patch
```

- A file the commit adds to the package, with a manifest line, is diffed against its
  legacy file on `master`. The patch names it `master/<path>`.
- A file that was already in the package is diffed against the commit's parent, so the
  patch holds only the commit's own change. The patch names it `parent/<path>`.
- In such a file, a block the commit copied verbatim from the legacy file on `master` is
  put in the base as well, so it reads as unchanged lines and only lines found in neither
  place read as added. A block is a run of consecutive added lines, at least two of them
  with a letter or digit, that is a run of consecutive lines in the legacy file. A line
  the port changed relative to `master` reads as added; the `master` line it replaced is
  not shown.
- A file with neither, such as a new test, shows as added.
- Added files identical to their legacy file are left out of the patch and named on stderr.
- An added target merged from several legacy files stops the script, since there is no
  single file to diff against.
- `-w` leaves out changes in whitespace alone, such as lines the lint autofixer re-indented.
  A file whose only changes are whitespace is left out and named on stderr.
- `--whole` gives every line of each file as context, under a first line that says so. It
  is for the viewer, which then shows the usual few lines around each change and can expand
  the rest.
- `--master <ref>` diffs against another ref than `upstream/master`; without `-o` the patch
  goes to stdout.

To read the patch in a browser, serve it with `diff-viewer`. The page renders the patch with
[`@pierre/diffs`](https://www.npmjs.com/package/@pierre/diffs), loaded from jsDelivr, with
split and wrap toggles. It rereads the file on each load, so after rerunning `port-diff`,
reload the page.

The view is virtualized: only the files near the viewport are in the page, so the browser's
own find misses most of a large patch. The panel on the left stands in for it:

- With the search box empty it lists every file, each with the base it is shown against
  (`master`, `prev` for the commit's parent, `new`) and its added and removed line counts.
  Clicking a file scrolls to it.
- Typing in the box searches the file names and every line of the patch, context lines
  included, without regard to case, and lists the matches by file. Clicking one, or Enter
  and Shift+Enter, scrolls to that file or line; a line is selected. Escape clears the
  search. Unchanged lines that the patch leaves out, beyond the three lines of context
  around each change, are not searched.
- A patch made with `port-diff --whole` holds whole files. The page rebuilds both sides of
  each file from it and diffs them again, so each "N unmodified lines" bar expands, the
  search covers every line of every file, and jumping to a match inside a collapsed stretch
  expands it first.
- Ctrl+F puts the cursor in the box; pressed again from inside it, the browser's own find
  opens. `?q=<text>` in the address starts with that search.
- The `files` toggle hides the panel.

```sh
python3 bin/diff-viewer/serve.py dates.patch   # then open http://127.0.0.1:8765/
```

`--port N` serves on another port.

## Rebase audit

Before rebasing the `frontend-base` branch on a newer `master`, `rebase-audit <old-master>
<new-master> -C ../frontend-app-learning` lists `master`'s changes under `src/` that touch
ported files: each needs a re-port (`RE-PORT`) or a look (`UNMAPPED`). Changes to files the
manifest drops are listed for completeness.
