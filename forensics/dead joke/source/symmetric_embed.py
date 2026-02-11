#!/usr/bin/env python3

import sys
import math
from typing import List
import numpy as np
from PIL import Image

DEFAULT_PAYLOAD = bytes([
    0xFF, 0xD2, 0xFB, 0xF2, 0xF7, 0xFC, 0xE7, 0xEF, 0xE9,
    0xD0, 0xB8, 0xA8, 0xD9, 0xA4, 0xB4, 0xE2, 0xB6, 0xA0,
    0xFA, 0xB8, 0xE5
])


NUM_RINGS = 21
RMIN = 100
RMAX = 1480.0      
ANGLES = 16        
SLOT_COUNT = ANGLES // 2    
SPOT_SIGMA = 5              
RING_SIGMA = 2.0            
STRENGTH_MULT = 1000.0      

# Load grayscale image as float32 numpy array
def load_gray(path: str) -> np.ndarray:
    im = Image.open(path).convert("L")
    return np.array(im, dtype=np.float32)

# Save uint8 numpy array as an image
def save_uint8(path: str, arr: np.ndarray):
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    im.save(path)

# Generate radii spaced evenly between RMIN and RMAX
def user_radii(num_rings: int = NUM_RINGS, rmin: float = RMIN, rmax: float = RMAX) -> List[float]:
    return list(np.linspace(rmin, rmax, num_rings))

# Core embedding logic: insert FFT spikes according to the ring/slot rules
def embed_payload_with_user_rules(gray: np.ndarray, payload: bytes):
    if len(payload) != NUM_RINGS:
        raise ValueError(f"payload must be exactly {NUM_RINGS} bytes")

    H, W = gray.shape
    cy, cx = H // 2, W // 2  # image center

    # Make sure radii fit inside the image
    if RMAX >= min(H, W) / 2.0 - 1.0:
        raise ValueError("Image too small for chosen radii range.")

    # FFT of the input image
    F = np.fft.fft2(gray)
    Fshift = np.fft.fftshift(F)
    mag = np.abs(Fshift)
    phase = np.angle(Fshift)

    radii = user_radii()

    # Precompute grids for distance calculations
    yy, xx = np.indices((H, W))
    rr = np.sqrt((xx - cx)**2 + (yy - cy)**2)

    # We'll add bumps to magnitude in a separate buffer
    delta_mag = np.zeros_like(mag, dtype=np.float32)

    # Choose a magnitude for the bumps based on median of FFT
    mag_med = float(np.median(mag)) + 1e-12
    spot_amplitude = mag_med * STRENGTH_MULT

    # Go ring by ring and embed 8 bits per byte
    for ring_idx in range(NUM_RINGS):
        r = float(radii[ring_idx])
        byte_value = int(payload[ring_idx])

        for bit_pos in range(8):
            bit = (byte_value >> (7 - bit_pos)) & 1

            # If bit = 0, skip (bright=0 in the poem/rules)
            if bit == 0:
                continue

            slot = bit_pos
            angle_deg = slot * (360.0 / ANGLES)
            angle_rad = math.radians(angle_deg)

            # Coordinates of the spot for this bit
            x_spot = cx + r * math.cos(angle_rad)
            y_spot = cy - r * math.sin(angle_rad)

            # Mirror spot across origin (+180 degrees)
            x_mirror = 2.0 * cx - x_spot
            y_mirror = 2.0 * cy - y_spot

            # Gaussian spot around actual bit location
            dx = xx - x_spot
            dy = yy - y_spot
            spot = np.exp(-0.5 * (dx*dx + dy*dy) / (SPOT_SIGMA**2))

            # Gaussian spot for mirrored copy
            dxm = xx - x_mirror
            dym = yy - y_mirror
            spot_m = np.exp(-0.5 * (dxm*dxm + dym*dym) / (SPOT_SIGMA**2))

            # Keep these spikes concentrated along the ring radius
            radial_mask = np.exp(-0.5 * ((rr - r)**2) / (RING_SIGMA**2))

            delta_mag += spot_amplitude * (spot * radial_mask)
            delta_mag += spot_amplitude * (spot_m * radial_mask)

    # Combine modified magnitude with original phase
    new_mag = mag + delta_mag
    new_Fshift = new_mag * np.exp(1j * phase)

    # Move FFT back and reconstruct spatial image
    new_F = np.fft.ifftshift(new_Fshift)
    recon = np.fft.ifft2(new_F)
    recon_real = np.real(recon)

    # Normalize reconstructed image to 0–255
    rmin, rmax = float(recon_real.min()), float(recon_real.max())
    recon_norm = (recon_real - rmin) / (rmax - rmin + 1e-12)
    stego_uint8 = (recon_norm * 255.0).astype(np.uint8)

    # Also return a visualization of the log-magnitude (for debugging)
    logmag = np.log1p(new_mag)
    lm_min, lm_max = float(logmag.min()), float(logmag.max())
    logmag_u8 = ((logmag - lm_min) / (lm_max - lm_min + 1e-12) * 255.0).astype(np.uint8)

    return stego_uint8, logmag_u8, new_mag, mag, radii

# Prints a summary of FFT peaks — optional debugging helper
def print_logmag_info(new_mag: np.ndarray, radii: List[float], angles: int = ANGLES):
    logmag = np.log1p(new_mag)
    print("=== Log-Magnitude Summary ===")
    print("shape:", logmag.shape)
    print("min/median/max:",
          float(logmag.min()),
          float(np.median(logmag)),
          float(logmag.max()))

    # Show the top few FFT peaks and nearest expected bit centers
    flat = logmag.ravel()
    K = min(12, flat.size)
    idxs = np.argpartition(flat, -K)[-K:]
    idxs = idxs[np.argsort(-flat[idxs])]

    H, W = logmag.shape
    cy, cx = H // 2, W // 2

    expected = []
    for ridx, r in enumerate(radii):
        for slot in range(angles // 2):
            angle_deg = slot * (360.0 / angles)
            a = math.radians(angle_deg)
            sx = int(round(cx + r * math.cos(a)))
            sy = int(round(cy - r * math.sin(a)))
            expected.append((ridx, slot, sx, sy))

    print("\nStrongest FFT peaks and nearest expected bit locations:")
    for i, idx in enumerate(idxs[:K]):
        y, x = divmod(int(idx), W)
        val = float(flat[idx])

        best = None
        bestd = 1e9
        for ridx, slot, sx, sy in expected:
            d = math.hypot(sx - x, sy - y)
            if d < bestd:
                bestd = d
                best = (ridx, slot, sx, sy)

        print(f"{i:02d}: ({x},{y}) value={val:.6e}  nearest=ring{best[0]} slot{best[1]} at ({best[2]},{best[3]}) dist={bestd:.1f}")

# Main CLI entry point
def main():
    if len(sys.argv) != 4:
        print("Usage: python3 fft_embed_user_rules.py input.png out_gray.png out_logmag.png")
        sys.exit(1)

    input_path = sys.argv[1]
    out_gray = sys.argv[2]
    out_logmag = sys.argv[3]

    print("Loading input:", input_path)
    gray = load_gray(input_path)

    print("Embedding payload into FFT rings...")
    stego_img, logmag_img, new_mag, mag_orig, radii = embed_payload_with_user_rules(gray, DEFAULT_PAYLOAD)

    save_uint8(out_gray, stego_img)
    save_uint8(out_logmag, logmag_img)

    print("Saved stego image:", out_gray)
    print("Saved FFT log-magnitude image:", out_logmag)

    print_logmag_info(new_mag, radii, ANGLES)

if __name__ == "__main__":
    main()
