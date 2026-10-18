import socket
import time
import json
import random
from decimal import Decimal, getcontext
from fpylll import IntegerMatrix, LLL
from z3 import *

getcontext().prec = 150

def untemper(y):
    s = Solver()
    v = BitVec('v', 32)
    y1 = v ^ LShR(v, 11)
    y2 = y1 ^ ((y1 << 7) & 0x9d2c5680)
    y3 = y2 ^ ((y2 << 15) & 0xefc60000)
    y4 = y3 ^ LShR(y3, 18)
    s.add(y4 == y)
    if s.check() == sat:
        return s.model()[v].as_long()
    return None

def recover_coeffs_lll(x_val):
    K = 10**120
    X = int(x_val * K)
    X2 = int(x_val * x_val * K)
    M = IntegerMatrix(3, 3)
    M[0, 0], M[0, 2] = 1, X2
    M[1, 1], M[1, 2] = 1, X
    M[2, 2] = K
    LLL.reduction(M)
    for i in range(3):
        a, b = int(M[i][0]), int(M[i][1])
        c = int(round(-(a * x_val * x_val + b * x_val)))
        if a > 0: a, b, c = -a, -b, -c
        if -(2**32) <= a <= 0 and 0 <= b < 2**32 and 0 <= c < 2**32:
            return a, b, c
    return None

def solve():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(("localhost", 9294))
    def r():
        time.sleep(0.05)
        return s.recv(8192).decode()
    def w(m): s.sendall((m + "\n").encode())
    print(r())
    consecutive_samples = []
    total_queries_made = 0
    TARGET_SAMPLES = 240 
    print(f"[*] Collecting {TARGET_SAMPLES} samples...")
    while len(consecutive_samples) < TARGET_SAMPLES:
        total_queries_made += 1
        w("QUERY")
        res = r()
        try:
            parts = res.split(" | ")
            lat = parts[1].split(":")[1]
            lon = parts[2].split(":")[1]
            x_val = Decimal(f"{lat}.{lon}")
            coeffs = recover_coeffs_lll(x_val)
            if coeffs:
                a, b, c = coeffs
                consecutive_samples.append([-a, b, c])
                if len(consecutive_samples) % 50 == 0:
                    print(f"  Progress: {len(consecutive_samples)}/{TARGET_SAMPLES}")
            else:
                consecutive_samples = []
        except:
            consecutive_samples = []
    words = []
    for s_coeffs in consecutive_samples:
        words.extend(s_coeffs)
    print("[*] Finding block alignment...")
    found_state = None
    aligned_idx = -1
    for i in range(624):
        candidate_y = words[i:i+624]
        if len(candidate_y) < 624: break
        state_candidate = [untemper(y) for y in candidate_y]
        test_prng = random.Random()
        test_prng.setstate((3, tuple(state_candidate + [624]), None))
        predicted_next = test_prng.getrandbits(32)
        if predicted_next == words[i+624]:
            print(f"  [+] Alignment found at word offset {i}!")
            found_state = state_candidate
            aligned_idx = i
            break
    if found_state is None:
        print("[!] Failed to find block alignment.")
        return
    remaining_words = len(words) - (aligned_idx + 624 + 1)
    for _ in range(remaining_words):
        test_prng.getrandbits(32)
    final_prng = test_prng
    predicted_vch = "VCH_" + hex(final_prng.getrandbits(64))[2:].upper()
    print(f"[*] Predicted: {predicted_vch}")
    w("ADD BIRIYANI")
    print(f"  Add: {r().strip()}")
    w(f"EXTRACT {predicted_vch}")
    print(f"  Extract: {r().strip()}")
    w(f"REDEEM {predicted_vch} KITCHEN []")
    final = r()
    print(f"[*] Final: {final.strip()}")
    if "ORDER CONFIRMED" in final:
        print("\n[!!!] FLAG CAPTURED [!!!]")
    s.close()

if __name__ == "__main__":
    solve()