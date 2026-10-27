# diff-viewer

Working docs for this sidequest. Nothing here is linked from a project repo.

A local viewer for one `.patch` file, rendered with `@pierre/diffs` (pinned, loaded from jsDelivr).

    python3 serve.py <file.patch> [--port 8765]

Open the printed URL. The patch is re-read on every page load, so regenerating it at the same path needs only a reload; a different file needs a restart. Split and wrap toggles are remembered per browser.
