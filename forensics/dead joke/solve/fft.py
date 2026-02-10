import numpy as np
import cv2

# Load input image (grayscale)
img = cv2.imread("y0uc4n7533m3", cv2.IMREAD_GRAYSCALE)
if img is None:
    raise ValueError("Could not read input.png")

# Compute FFT
f = np.fft.fft2(img)
fshift = np.fft.fftshift(f)

# Log magnitude spectrum
magnitude = np.abs(fshift)
log_mag = np.log1p(magnitude)  # log(1 + |F|)

# Normalize to 0–255 for PNG output
log_mag_norm = cv2.normalize(log_mag, None, 0, 255, cv2.NORM_MINMAX)
log_mag_norm = np.uint8(log_mag_norm)

# Save output
cv2.imwrite("outfft.png", log_mag_norm)
print("Saved output.png")
