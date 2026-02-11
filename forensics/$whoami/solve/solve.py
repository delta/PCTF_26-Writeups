import hmac
import binascii
from Cryptodome.Hash import MD4, MD5


USER = "t.stark"
DOMAIN = ""
SERVER_CHALLENGE = "e3ec06e38823c231" # done
NTPROOFSTR = "977bf57592dc13451d54be92d94a095d"

BLOB_HEX="01010000000000005c9535bd3c97dc01bd8ada676c80c3180000000002002c00530055004e004c00410042002d0050005200450043004900530049004f004e002d005400310036003500300001002c00530055004e004c00410042002d0050005200450043004900530049004f004e002d00540031003600350030000400000003002c00730075006e006c00610062002d0070007200650063006900730069006f006e002d0074003100360035003000070008005c9535bd3c97dc01060004000200000008005000500000000000000000000000003000005057d986966e3d7d60e8bd92deb9e761f8ce9fa4941212bdba96c1840385d47e8b7fdec0ec98e0038631cb9ce097e391536012e8cff9908f333c76f932a7e9930a001000000000000000000000000000000000000900200063006900660073002f00310030002e0031002e00350034002e003100300032000000000000000000"

TEAMS = ["Arcadia", "Terrabound", "OceanMining", "SuperheroCallcentre"]


START_TIME = 1451606300
END_TIME   = 1451606500

def calc_ntlmv2_proof(password, user, domain, challenge, blob):
    try:
        srv_chal = binascii.unhexlify(challenge)
        cli_blob = binascii.unhexlify(blob)
        
        
        h_md4 = MD4.new()
        h_md4.update(password.encode('utf-16le'))
        nt_hash = h_md4.digest()

        identity = user.upper().encode('utf-16le') + domain.upper().encode('utf-16le')
        h1 = hmac.new(nt_hash, identity, MD5)
        ntlmv2_hash = h1.digest()
        
        data_to_sign = srv_chal + cli_blob
        h2 = hmac.new(ntlmv2_hash, data_to_sign, MD5)
        
        return h2.hexdigest()
    except Exception as e:
        return None


print(f"[*] Starting Brute Force: {USER}@{DOMAIN}")
print(f"[*] Searching Epoch Range: {START_TIME} -> {END_TIME}")

found = False
for team in TEAMS:
    if found: break
    for timestamp in range(START_TIME, END_TIME):
        candidate_pass = f"{team}{timestamp}"
        
        calculated_proof = calc_ntlmv2_proof(candidate_pass, USER, DOMAIN, SERVER_CHALLENGE, BLOB_HEX)
        
        if calculated_proof == NTPROOFSTR:
            print(f"\n[+] !!! PASSWORD CRACKED !!!")
            print(f"    Password:  {candidate_pass}")
            print(f"    Flag:      pctf{{{USER}:{candidate_pass}}}")
            found = True
            break

if not found:
    print("\n[-] Password not found. Double check DOMAIN or Range.")