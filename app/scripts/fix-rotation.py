#!/usr/bin/env python3
from PIL import Image
import os

image_dir = "public/images"
gallery_files = sorted([f for f in os.listdir(image_dir) if f.startswith('gallery_')])

for f in gallery_files:
    path = os.path.join(image_dir, f)
    with Image.open(path) as img:
        # Rotate 90 degrees counter-clockwise to restore portrait
        rotated = img.rotate(90, expand=True)
        # Resize to reasonable portrait size
        max_height = 1200
        if rotated.height > max_height:
            ratio = max_height / rotated.height
            new_width = int(rotated.width * ratio)
            rotated = rotated.resize((new_width, max_height), Image.LANCZOS)
        rotated.save(path, 'JPEG', quality=80, optimize=True)
        print(f"{f}: {rotated.width}x{rotated.height}")

print("Done!")
