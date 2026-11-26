"""Offline launcher for Orbita on Python 3.8 or newer."""
import argparse
import errno
import os
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class AtlasHandler(SimpleHTTPRequestHandler):
    extensions_map = dict(SimpleHTTPRequestHandler.extensions_map, **{
        ".js": "text/javascript",
        ".gltf": "model/gltf+json",
        ".webp": "image/webp",
        ".glb": "model/gltf-binary",
        ".bin": "application/octet-stream",
        ".wasm": "application/wasm",
        ".json": "application/json",
    })

    def list_directory(self, path):
        self.send_error(404)
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--launch", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent / "dist"
    try:
        port = int(os.environ.get("ORBITA_PORT", "4173"))
        if not 0 <= port <= 65535:
            raise ValueError("ORBITA_PORT must be between 0 and 65535")
        if not (root / "index.html").is_file():
            raise FileNotFoundError("Missing dist/index.html")
        handler = partial(AtlasHandler, directory=str(root))
        try:
            server = ThreadingHTTPServer(("127.0.0.1", port), handler)
        except OSError as error:
            if not args.launch or error.errno not in (errno.EADDRINUSE, errno.EACCES, 10048, 10013):
                raise
            server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    except (ValueError, OSError) as error:
        parser.exit(1, "Orbita: {}\n".format(error))

    with server:
        url = "http://127.0.0.1:{}/".format(server.server_port)
        print("Orbita: {} (Ctrl+C to stop)".format(url), flush=True)
        if args.launch and os.environ.get("ORBITA_NO_BROWSER") != "1":
            if not webbrowser.open(url):
                print("Open this address manually: {}".format(url), flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
