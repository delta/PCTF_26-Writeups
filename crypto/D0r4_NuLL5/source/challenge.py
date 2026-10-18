import os
from dotenv import load_dotenv
load_dotenv()
from Crypto.Cipher import AES
from Crypto.Hash import SHA256, HMAC
from Crypto.Protocol.KDF import HKDF

flag = os.environ.get("FLAG", "p_ctf{HIDDEN}")

BANNER = r"""                                                                                                                                        
        ----------- dora - nulls - pctf - 2026 --------------
"""

users = {
    "Administrator": "****************************************************************"
}

def show_menu():
    print(BANNER)
    print("\n1. login")
    print("2. register")
    print("3. exit")
    return int(input("choose "))

def login():
    challenge_hex = input("challenge (hex): ").strip()
    challenge = bytes.fromhex(challenge_hex)
    
    if len(challenge) != 8:
        print("invalid challenge length")
        return
    
    username = input("username: ").strip()
    
    if not (6 < len(username) < 20):
        print("invalid username length")
        return
    
    if username not in users:
        print(f"user not found")
        return
    
    secret = users[username].encode()
    
    server_challenge = os.urandom(8)
    print(f"server challenge: {server_challenge.hex()}")
    
    response_hex = input("response (hex): ").strip()
    response = bytes.fromhex(response_hex)
    
    if len(response) != 8:
        print("invalid response length")
        return
    
    session_key = HKDF(
        master=secret,
        key_len=16,
        salt=challenge + server_challenge,
        hashmod=SHA256
    )
    
    expected = compute_credential(session_key, challenge)
    
    if verify_credential(session_key, expected, response):
        print(f"authentication successful: {username}")
        if username == "Administrator":
            print(f"flag: {flag}")
    else:
        print("authentication failed")

def register():
    username = input("username: ").strip()
    
    if not (6 < len(username) < 20):
        print("invalid username length")
        return
    
    if username in users:
        print("username exists")
        return
    
    password_hash = input("password hash (64 chars): ").strip()
    
    if len(password_hash) != 64:
        print("invalid hash length")
        return
    
    users[username] = password_hash
    print("registration successful")

def compute_credential(session_key, challenge):
    state = bytearray(16) + bytearray(challenge)
    cipher = AES.new(session_key, AES.MODE_ECB)
    
    for i in range(8):
        block = cipher.encrypt(state[i:i + 16])
        state[16 + i] ^= block[0]
    
    return bytes(state[-8:])

def verify_credential(session_key, expected, provided):
    h = HMAC.new(session_key, expected, SHA256)
    mask = h.digest()[:8]
    
    checksum = 0
    for i in range(8):
        checksum ^= expected[i] ^ provided[i] ^ mask[i]
    
    return checksum == 0

def main():
    for _ in range(0x1337):
        selection = show_menu()
        if selection == 1:
            login()
        elif selection == 2:
            register()
        else:
            print("goodbye")
            return

if __name__ == "__main__":
    main()