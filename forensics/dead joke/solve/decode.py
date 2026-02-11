#!/usr/bin/env python3
import sys
import math
import numpy as np
from PIL import Image

def bilinear(img, x, y):
    H, W = img.shape
    if x < 0 or x >= W-1 or y < 0 or y >= H-1:
        return 0.0
    x0 = int(x);  y0 = int(y)
    dx = x - x0;  dy = y - y0
    v00 = img[y0, x0]
    v10 = img[y0, x0+1]
    v01 = img[y0+1, x0]
    v11 = img[y0+1, x0+1]
    return (v00*(1-dx)*(1-dy) +
            v10*dx*(1-dy) +
            v01*(1-dx)*dy +
            v11*dx*dy)

def decode_ring(img, radius):
    H, W = img.shape
    cx, cy = W/2.0, H/2.0

    # 8 angles: 0 → 157.5 step 22.5
    angles_deg = [i*22.5 for i in range(8)]
    samples = []

    for a in angles_deg:
        theta = math.radians(a)
        x = cx + radius * math.cos(theta)
        y = cy - radius * math.sin(theta)   # anticlockwise in image coords
        samples.append(bilinear(img, x, y))

    samples = np.array(samples, dtype=float)

    # threshold = (max + min) / 2
    thr = (samples.max() + samples.min()) / 2.0

    bits = [1 if v > thr else 0 for v in samples]

    # assemble byte (MSB = first angle)
    value = 0
    for b in bits:
        value = (value << 1) | b

    return bits, value, samples, thr

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 simple_decode.py image.png radius")
        sys.exit(1)

    img_path = sys.argv[1]
    radius = float(sys.argv[2])

    img = np.array(Image.open(img_path).convert("L"), dtype=float)

    bits, value, samples, thr = decode_ring(img, radius)

    print("Samples:", samples)
    print("Threshold:", thr)
    print("Bits:", bits)
    print(f"Decoded byte: 0x{value:02X} ({value:08b})")

if __name__ == "__main__":
    main()
