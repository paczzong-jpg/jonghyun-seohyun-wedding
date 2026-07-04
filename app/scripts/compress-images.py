#!/usr/bin/env python3
from PIL import Image
import os
import sys

def compress_image(input_path, output_path, max_width=800, quality=75):
    with Image.open(input_path) as img:
        # Resize if wider than max_width
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.LANCZOS)
        
        # Convert RGBA to RGB if saving as JPEG
        if output_path.endswith('.jpg') or output_path.endswith('.jpeg'):
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            img.save(output_path, 'JPEG', quality=quality, optimize=True)
        else:
            img.save(output_path, 'PNG', optimize=True)
        
        original_size = os.path.getsize(input_path)
        new_size = os.path.getsize(output_path)
        print(f"{os.path.basename(input_path)}: {original_size/1024/1024:.1f}MB -> {new_size/1024/1024:.1f}MB")

if __name__ == "__main__":
    image_dir = "public/images"
    files = os.listdir(image_dir)
    for f in files:
        if f.endswith(('.jpg', '.jpeg', '.png')):
            input_path = os.path.join(image_dir, f)
            compress_image(input_path, input_path)
    print("Done!")
