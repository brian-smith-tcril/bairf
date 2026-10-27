#!/usr/bin/env python3
"""Serve the diff viewer for one .patch file.

usage: serve.py <file.patch> [--port N]

/        the viewer (index.html beside this script)
/patch   the patch file, read on each request
"""
import argparse
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

HERE = Path(__file__).resolve().parent


def make_handler(patch: Path):
    class Handler(BaseHTTPRequestHandler):
        def send(self, status, body, content_type, headers=()):
            self.send_response(status)
            for key, value in headers:
                self.send_header(key, value)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            path = urlsplit(self.path).path
            if path in ('/', '/index.html'):
                self.send(200, (HERE / 'index.html').read_bytes(), 'text/html; charset=utf-8')
            elif path == '/patch':
                self.send(200, patch.read_bytes(), 'text/plain; charset=utf-8', [('X-Patch-Name', patch.name)])
            else:
                self.send(404, b'not found', 'text/plain')

        def log_message(self, *args):
            pass

    return Handler


def main():
    parser = argparse.ArgumentParser(description='Serve the diff viewer for one .patch file.')
    parser.add_argument('patch', type=Path)
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    patch = args.patch.resolve()
    if not patch.is_file():
        sys.exit(f'not a file: {patch}')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), make_handler(patch))
    print(f'http://127.0.0.1:{args.port}/  ({patch})', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
