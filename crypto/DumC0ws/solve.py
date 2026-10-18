import socket
import base64
import re
import sys
HOST = sys.argv[1] if len(sys.argv) > 1 else "34.57.66.189"
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 30012
def recv_until(sock, marker=b"Give your cow a name"):
    data = b""
    while marker not in data:
        chunk = sock.recv(4096)
        if not chunk:
            break
        data += chunk
    return data
def clean_b64(s):
    s = re.sub(r'[^A-Za-z0-9+/]', '', s)
    while len(s) % 4 != 0:
        s += '='
    return s
def parse_cow(data):
    text = data.decode(errors="ignore")
    strict_match = re.search(r"\[Name: ([A-Za-z0-9+/]*)\] says: ([A-Za-z0-9+/]+)", text)
    if strict_match:
        name_ct = base64.b64decode(clean_b64(strict_match.group(1))) if strict_match.group(1) else b""
        return name_ct, \
               base64.b64decode(clean_b64(strict_match.group(2)))
    matches = re.findall(r'[A-Za-z0-9+/]{8,}', text)
    if len(matches) >= 2:
        return base64.b64decode(clean_b64(matches[-2])), base64.b64decode(clean_b64(matches[-1]))
    elif len(matches) == 1:
        return b"", base64.b64decode(clean_b64(matches[0]))
    raise Exception(f"Failed to parse cowsay output.\nOutput: {text}")
def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))
def main():
    print("[*] Connection 1: Recovering Keystream...")
    s1 = socket.socket()
    s1.connect((HOST, PORT))
    recv_until(s1)
    known_plain = b"A" * 300
    s1.sendall(known_plain + b"\n")
    resp1 = recv_until(s1)
    name_ct1, _ = parse_cow(resp1)
    keystream = xor(name_ct1, known_plain)
    print(f"[+] Recovered {len(keystream)} bytes of Keystream from Connection 1.")
    s1.close()
    print("[*] Connection 2: Exploiting Nonce Reuse...")
    s2 = socket.socket()
    s2.connect((HOST, PORT))
    recv_until(s2)
    s2.sendall(b"\n")
    resp2 = recv_until(s2)
    _, sound_ct2 = parse_cow(resp2)
    secret_sound = xor(sound_ct2, keystream[:len(sound_ct2)])
    secret_str = secret_sound.decode(errors="ignore")
    print(f"[+] Decrypted Secret Sound: {secret_str!r}")
    print("[*] Submitting solution...")
    s2.sendall(f"FIX_COW {secret_str}\n".encode())
    final_resp = s2.recv(4096)
    while b"\n\n" not in final_resp:
        chunk = s2.recv(4096)
        if not chunk: break
        final_resp += chunk
    text = final_resp.decode(errors="ignore")
    print(f"[*] Server response: {text}")
    lines = text.splitlines()
    flag_b64 = None
    for line in lines:
        line = line.strip()
        if re.fullmatch(r"[A-Za-z0-9+/=]{30,}", line):
            flag_b64 = line
            break
    if flag_b64:
        enc_flag = base64.b64decode(clean_b64(flag_b64))
        offset = len(sound_ct2)
        flag = xor(enc_flag, keystream[offset:offset+len(enc_flag)])
        print(f"\n[SUCCESS] Flag: {flag.decode(errors='ignore')}")
    else:
        print("[-] Could not find encrypted flag in response.")
    s2.close()
if __name__ == "__main__":
    main()