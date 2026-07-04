#!/usr/bin/env python3
from PIL import Image
import os

image_dir = "public/images"
gallery_files = [f for f in os.listdir(image_dir) if f.startswith('gallery_')]

for f in sorted(gallery_files):
    path = os.path.join(image_dir, f)
    with Image.open(path) as img:
        print(f"{f}: width={img.width}, height={img.height}, ratio={img.width/img.height:.2f}")
