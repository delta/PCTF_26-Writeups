#!/usr/bin/env python3
import os
import json
import random
from datetime import datetime
from decimal import Decimal, getcontext
from dotenv import load_dotenv

load_dotenv(override=True)
getcontext().prec = 150

class FinalLatticeCanteen:
    def __init__(self):
        self.session_id = os.urandom(8).hex()
        self.prng = random.Random()
        self.prng.seed(os.urandom(16))
        self.vch_id = None
        self.wallet_balance = 30
        self.cart = []
        self.action_count = 0
        self.poisoned = False
        self.protocol_ok = False
        self.bound_len = False
        self.flag = "p_ctf{flag}"
        if os.path.exists("flag.txt"):
            with open("flag.txt", "r") as f:
                self.flag = f.read().strip()
        else:
            self.flag = os.getenv("FLAG", "p_ctf{flag}")

    def _check_poison(self):
        self.action_count += 1
        self.protocol_ok = False
        self.bound_len = False
        if self.action_count > 650:
            self.poisoned = True

    def extract(self, code):
        self._check_poison()
        if self.poisoned:
            return "NO_VALIDITY"
        if self.vch_id is None:
            self.vch_id = "VCH_" + hex(self.prng.getrandbits(64))[2:].upper()
        if code.upper() == self.vch_id:
            self.protocol_ok = True
            self.bound_len = True
            return json.dumps({
                "ID": self.vch_id,
                "STATUS": "SPECULATIVE_ACCEPTED",
                "HINT": "optimistic_verification_active"
            })
        return "NO_VALIDITY"

    def add_item(self, item):
        self._check_poison()
        item = item.upper()
        if item in ["BIRIYANI", "SODA", "RAITA"]:
            self.cart.append(item)
            return f"ADDED {item} TO TRAY"
        return "ITEM NOT FOUND"

    def redeem(self, coupon_id, mode, proof_json):
        spec_ok = self.protocol_ok and self.bound_len
        self._check_poison()
        if self.poisoned:
            return "TRANSACTION FAILED"
        if mode.upper() == "KITCHEN":
            if spec_ok:
                if "BIRIYANI" in self.cart:
                    return (
                        "\nORDER CONFIRMED\n"
                        "MUTTON BIRIYANI SERVED\n"
                        f"DELIVERED: {self.flag}"
                    )
                return "ORDER QUEUED: WAIT FOR BIRIYANI ON TRAY"
            return "TRANSACTION FAILED: VOUCHER SPECULATION REJECTED"
        return "UNKNOWN COMMAND"

    def query(self):
        self._check_poison()
        a = -self.prng.getrandbits(32)
        b = self.prng.getrandbits(32)
        c = self.prng.getrandbits(32)
        D = Decimal(b * b) - Decimal(4 * a * c)
        root = (-Decimal(b) - D.sqrt()) / (Decimal(2 * a))
        s_val = str(root)
        if "." in s_val:
            lat, lon = s_val.split(".")
            lon = lon[:100]
        else:
            lat, lon = s_val, "0"
        return (
            f"TS:{datetime.now().strftime('%M%S')} | "
            f"CALIB_LAT:{lat} | "
            f"CALIB_LON:{lon} | "
            f"S:0 | AC:{self.action_count}"
        )

def main():
    node = FinalLatticeCanteen()
    print("---  Biriyani Coupon System ---")
    print(f"Wallet Balance: ₹{node.wallet_balance}")
    print(f"Session: {node.session_id}")
    while True:
        try:
            cmd = input("> ").strip()
            if not cmd:
                continue
            parts = cmd.split(" ", 3)
            op = parts[0].upper()
            if op == "QUERY":
                print(node.query())
            elif op == "EXTRACT" and len(parts) > 1:
                print(node.extract(parts[1]))
            elif op == "ADD" and len(parts) > 1:
                print(node.add_item(parts[1]))
            elif op == "REDEEM" and len(parts) >= 3:
                proof = parts[3] if len(parts) == 4 else "[]"
                print(node.redeem(parts[1], parts[2], proof))
            elif op == "HELP":
                print("""
AVAILABLE COMMANDS:
  QUERY
  EXTRACT <voucher>
  ADD <item>
  REDEEM <voucher> KITCHEN <proof>
  EXIT
""")
            elif op == "EXIT":
                break
            else:
                print("COMMAND NOT FOUND")
        except EOFError:
            break
        except Exception:
            print("ERROR")

if __name__ == "__main__":
    main()