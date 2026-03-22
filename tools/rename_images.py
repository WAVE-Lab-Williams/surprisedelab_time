import shutil
from collections import defaultdict
from pathlib import Path

input_folder = "people_samebody_unrenamed"
output_folder = "people_samebody"

src = Path(input_folder)
dst = Path(output_folder)

if not src.exists():
    raise SystemExit(f"Source folder not found: {src}")

dst.mkdir(parents=True, exist_ok=True)

pngs = sorted(src.glob("*.png"))
if not pngs:
    raise SystemExit(f"No .png files found in {src}")

counters: dict[str, int] = defaultdict(int)
for img in pngs:
    prefix = img.stem[:2]
    counters[prefix] += 1
    new_name = f"{prefix}-{counters[prefix]}.png"
    shutil.copy2(img, dst / new_name)
    print(f"  {img.name} has been renamed to {new_name}")

print(f"\nDone. {len(pngs)} file(s) copied to {dst}/")
