"""Build the release ZIP from runtime files without development dependencies."""
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent.parent
extension = root / "extension"
version = json.loads((extension / "manifest.json").read_text())["version"]
output = root / "dist" / "youtube-shorts-blocker.zip"
output.parent.mkdir(exist_ok=True)
files = [extension / "manifest.json"]
for directory, suffixes in {"content": {".js", ".css"}, "popup": {".html", ".js", ".css"}, "icons": {".png"}}.items():
    files.extend(sorted(path for path in (extension / directory).rglob("*")
                        if path.is_file() and path.suffix in suffixes and not path.name.startswith(".")))
with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, path.relative_to(extension))
    archive.write(root / "LICENSE", "LICENSE")
    archive.writestr("INSTALL.txt", """YouTube Shorts Blocker

1. Extract this ZIP into a folder you will keep (not a temporary folder).
2. Open chrome://extensions in Chrome.
3. Turn on Developer mode in the upper-right corner.
4. Click Load unpacked and choose the extracted folder containing manifest.json.
5. Refresh any open YouTube tabs.

Click the extension in Chrome's Extensions menu to change Redirect Shorts links.
No Git, Node.js, or build tools are needed. Keep the extracted folder in place.
Updates are manual: replace its contents with a newer release, then click Reload
for this extension at chrome://extensions and refresh YouTube.

Project: https://github.com/foksa/youtube-shorts-blocker
""")
print(f"Packaged v{version}: {output}")
