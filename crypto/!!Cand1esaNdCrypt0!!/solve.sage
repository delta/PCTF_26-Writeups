#!/usr/bin/env sage
import socket
import sys
import re
from sage.all import *
from Crypto.PublicKey import RSA

P1 = b"I approve the agreement:\n"
P2 = b"I authorize the transaction:\n"
SUFFIX_LEN = 48

def pad(m):
    return m + bytes([len(m) % 256])

def bytes_to_long(b):
    return int.from_bytes(b, 'big')

def long_to_bytes(n, length):
    return n.to_bytes(length, 'big')

def solve_challenge(host="127.0.0.1", port=1337):
    print(f"[*] Connecting to {host}:{port}...")
    sys.stdout.flush()
    try:
        s = socket.create_connection((host, int(port)), timeout=10)
    except Exception as e:
        print(f"[-] Connection failed: {e}")
        return
    
    def recv_until(marker):
        data = b""
        while marker not in data:
            chunk = s.recv(1)
            if not chunk: break
            data += chunk
        return data

    banner = recv_until(b"> ")
    output = banner.decode()
    
    print("[*] Parsing server parameters...")
    try:
        P = Integer(int(re.search(r"Prime: (0x[0-9a-f]+)", output).group(1), 16))
    except Exception as e:
        print(f"[-] Failed to parse Prime: {e}")
        s.close()
        return

    # Load RSA parameters from public.pem
    try:
        with open("source/public.pem", "rb") as f:
            pub_key = RSA.import_key(f.read())
            N = Integer(pub_key.n)
            E = Integer(pub_key.e)
    except Exception as e:
        print(f"[-] Failed to load RSA parameters from public.pem: {e}")
        s.close()
        return

    Fp = GF(P)
    print(f"[+] P: {hex(P)}")
    
    # Step 1: Request signature for approval
    s1_str = "A" * SUFFIX_LEN
    print(f"[*] Requesting signature for approval with suffix: {s1_str}")
    s.sendall(b"1\n")
    recv_until(b"Suffix:")
    s.sendall(s1_str.encode() + b"\n")
    
    response = recv_until(b"> ").decode()
    # Debug print for parsing issues
    if "SIG:" not in response:
        print(f"[debug] Raw response: {repr(response)}")
    try:
        sig = Integer(int(re.search(r"SIG: (0x[0-9a-f]+)", response).group(1), 16))
        L = Integer(re.search(r"L = (\d+)", response).group(1))
        X = Integer(re.search(r"X = (\d+)", response).group(1))
    except Exception as e:
        print(f"[-] Failed to parse signature, L, or X: {e}")
        s.close()
        return False

    print(f"[+] Received Signature and leaked values (L, X)")
    
    # Step 2: Recover hash and hidden coefficients
    h = pow(sig, E, N)
    h_fp = Fp(h)
    x1 = Fp(bytes_to_long(pad(P1 + s1_str.encode())))
    
    # L = X * (a - b) => a - b = L/X => b = a - L/X
    # h = x1^3 + a*x1^2 + (a - L/X)*x1
    # a * (x1^2 + x1) = h - x1^3 + (L/X)*x1
    diff = Fp(L) / Fp(X)
    a_val = (h_fp - x1^3 + diff * x1) / (x1^2 + x1)
    b_val = a_val - diff
    
    print(f"[+] Recovered hidden coefficients a and b")
    
    # Step 3: Find x2 such that f(x2) = h
    R = PolynomialRing(Fp, 'x')
    x = R.gen()
    poly = x^3 + a_val*x^2 + b_val*x - h_fp
    roots = [r[0] for r in poly.roots()]
    
    print(f"[*] Found {len(roots)} roots for collision")
    
    s2_str = None
    import random
    
    prefix_val = bytes_to_long(P2) << ((SUFFIX_LEN + 1) * 8)
    pad_val = (len(P2) + SUFFIX_LEN) % 256
    dim = SUFFIX_LEN

    # Pre-build and reduce lattice basis
    # 48D lattice needs a good basis for Babai in 128-bit field
    W = 10^100
    basis = Matrix(ZZ, dim + 1, dim + 1)
    basis[0, 0] = int(P) * W
    for i in range(dim):
        basis[i+1, 0] = pow(256, dim - 1 - i, int(P)) * W
        basis[i+1, i+1] = 1
    
    print(f"[*] Reducing {dim+1}x{dim+1} weighted lattice basis with LLL...")
    basis_reduced = basis.LLL()
    G, _ = basis_reduced.gram_schmidt()
    G_norms = [v.dot_product(v) for v in G]

    # Pre-calculate basis components for faster Babai
    reduced_basis_rows = [basis_reduced[i] for i in range(basis_reduced.nrows())]
    G_rows = [G[i] for i in range(G.nrows())]

    def babai_fast(target_vec, reduced_basis_rows, G_rows, G_norms):
        b = target_vec
        for i in reversed(range(len(reduced_basis_rows))):
            # dot_product is fast
            c = round(b.dot_product(G_rows[i]) / G_norms[i])
            if c != 0:
                b -= c * reduced_basis_rows[i]
        return target_vec - b

    # Randomized search: 30,000 targets is enough with BKZ-20
    random.seed()
    
    print(f"[*] Searching for printable suffix across {len(roots)} roots...")
    for root_idx, r in enumerate(roots):
        if s2_str: break
        target_val = (Fp(r) - Fp(prefix_val) - Fp(pad_val)) / Fp(256)
        target_val_int = int(target_val)
        
        for idx in range(30000):
            if idx % 10000 == 0 and idx > 0:
                print(f"    ... checked {idx} targets for root {root_idx+1}")
            
            # Randomized target in the printable space
            r_vec = [random.randint(40, 110) for _ in range(dim)]
            val_from_r = sum(r_vec[i] * pow(256, dim - 1 - i, int(P)) for i in range(dim))
            T_prime_W = ((target_val_int - val_from_r) % int(P)) * W
            
            # Minimize vector creation
            target_vec = vector(ZZ, [T_prime_W] + [0]*dim)
            res_vec = babai_fast(target_vec, reduced_basis_rows, G_rows, G_norms)
            
            # res_vec = lattice_vector
            # We want r_vec[i] + res_vec[i+1] to be printable
            candidate_bytes = []
            valid = True
            for i in range(dim):
                val = r_vec[i] + res_vec[i+1]
                if not (32 <= val <= 126):
                    valid = False
                    break
                candidate_bytes.append(int(val))
            
            if valid:
                s2_str = bytes(candidate_bytes).decode()
                print(f"[+] Found valid collision suffix: {s2_str}")
                break
    
    if not s2_str:
        print("[-] This session didn't yield a printable suffix. Reconnecting...")
        s.close()
        return False

    # Step 4: Execute transaction with collision suffix
    print(f"[*] Executing transaction with suffix: {s2_str}")
    s.sendall(b"2\n")
    recv_until(b"Suffix:")
    s.sendall(s2_str.encode() + b"\n")
    recv_until(b"Signature:")
    s.sendall(hex(sig).encode() + b"\n")
    
    final_response = recv_until(b"}").decode()
    if "p_ctf{" in final_response:
        print("\n" + "="*30)
        print("[!] FLAG CAPTURED!")
        print(final_response[final_response.find("p_ctf{"):])
        print("="*30)
        s.close()
        return True
    else:
        print("[-] Exploit failed.")
        s.close()
        return False

host = "127.0.0.1"
port = 1337
if len(sys.argv) > 1: host = sys.argv[1]
if len(sys.argv) > 2: port = int(sys.argv[2])

print("STARTING SOLVE")
sys.stdout.flush()

while True:
    if solve_challenge(host, port):
        break
