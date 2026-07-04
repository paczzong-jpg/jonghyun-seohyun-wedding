#!/usr/bin/env python3
from PIL import Image
import os

image_dir = "public/images"
files = [f for f in os.listdir(image_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]

for f in files:
    path = os.path.join(image_dir, f)
    with Image.open(path) as img:
        print(f"{f}: size={img.size}, orientation={img.getexif().get(0x0112, 'none')}")
