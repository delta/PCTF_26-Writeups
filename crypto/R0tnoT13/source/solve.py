#!/usr/bin/env python3
from Crypto.Util.number import long_to_bytes


r = None
cipher = None

with open("challenge.txt") as f:
    lines = [l.strip() for l in f if l.strip()]

mode = None
for line in lines:
    if line.startswith("== State"):
        mode = "state"
        continue
    if line.startswith("== Ciphertext"):
        mode = "cipher"
        continue

    if mode == "state":
        r = int(line)
    elif mode == "cipher":
        cipher = bytes.fromhex(line)

assert r is not None and cipher is not None

N = 128


def solve_for_k(k):
    eqs = []
    rhs = []

    
    for i in range(N):
        row = (1 << i) ^ (1 << ((i + k) % N))
        eqs.append(row)
        rhs.append((r >> i) & 1)

   
    m = len(eqs)
    mat = [eqs[i] | (rhs[i] << N) for i in range(m)]

    rank = 0
    where = [-1] * N

    for col in range(N):
        pivot = None
        for rr in range(rank, m):
            if (mat[rr] >> col) & 1:
                pivot = rr
                break
        if pivot is None:
            continue

        mat[rank], mat[pivot] = mat[pivot], mat[rank]
        where[col] = rank

        for rr in range(m):
            if rr != rank and ((mat[rr] >> col) & 1):
                mat[rr] ^= mat[rank]

        rank += 1

    
    if rank != N - 1:
        return None

 
    S0 = 0
    for i in range(N):
        if where[i] != -1:
            S0 |= ((mat[where[i]] >> N) & 1) << i

  
    free = [i for i in range(N) if where[i] == -1]
    if len(free) != 1:
        return None

    f = free[0]
    v = 1 << f


    for i in range(N):
        if where[i] != -1:
       
            if (mat[where[i]] >> f) & 1:
                v ^= 1 << i

    return S0, v


for k in range(1, N, 2):  # odd k only
    res = solve_for_k(k)
    if res is None:
        continue

    S0, v = res
    for S in (S0, S0 ^ v):
        ks = long_to_bytes(S, 16)
        flag = bytes(a ^ b for a, b in zip(cipher, ks))
        if flag.startswith(b"p_ctf{"):
            print("[+] FOUND")
            print("k =", k)
            print("FLAG =", flag.decode())
            print("STATE =", ks)
            exit()

print("[-] No solution found")
