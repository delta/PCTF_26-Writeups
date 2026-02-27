#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <unistd.h>


#define MAX_CODE 4096
#define MAX_OBJS 16
#define MAX_REGS 8
#define PAC_KEY  0x1a5bfe810dce5825

#define PERM_NONE 0x00
#define PERM_R    0x01
#define PERM_W    0x02
#define PERM_X    0x04
#define PERM_RW   (PERM_R | PERM_W)

typedef enum { 
    TYPE_FREE=0, 
    TYPE_DATA=1, 
    TYPE_EXEC=2 
} obj_type_t;

void sys_alloc_data();
void sys_alloc_exec();
void sys_free();
void sys_split();
void sys_dup();
void sys_name();
void sys_write();
void sys_read();
void sys_exec();
void safe_handler();

typedef struct {
    char     name[8];
    uint8_t  perms; 
    uint8_t  type; 
    uint8_t  ref_count;
    uint8_t  padding; 
    uint32_t size;
    union {
        char     *buffer;
        uint64_t  func_ptr; 
    } content;
} vm_object_t;

vm_object_t objects[MAX_OBJS];
int         regs[MAX_REGS];
uint8_t     code[MAX_CODE];
uint32_t    pc = 0;
int         running = 1;

#define INS_HALT    0x00
#define INS_MOV_IMM 0x01 
#define INS_MOV_REG 0x02 
#define INS_ADD     0x03 
#define INS_SUB     0x04 
#define INS_XOR     0x05 
#define INS_SYS     0x06 

#define SYS_ALLOC_DATA 1
#define SYS_ALLOC_EXEC 2
#define SYS_FREE       3 
#define SYS_SPLIT      4 
#define SYS_NAME       5
#define SYS_WRITE      6
#define SYS_READ       7
#define SYS_EXEC       8
#define SYS_DUP        9

void error(const char *msg) {
    printf("[-] VM PANIC (PC=0x%x): %s\n", pc, msg);
    exit(1);
}

void safe_handler() { 
    printf(" Ping! System Secure.\n"); 
}

void win() {
    printf("CRITICAL: PRIVILEGE ESCALATION.\n");
    system("/bin/sh");
    exit(0);
}

uint8_t fetch8() { 
    if(pc>=MAX_CODE) 
        error("Segfault"); 
    return code[pc++]; 
}
uint32_t fetch32() { 
    if(pc+4>MAX_CODE) 
        error("Segfault"); 
    uint32_t var=*(uint32_t*)(code+pc); 
    pc+=4; 
    return var; 
}

void validate_id(int id) { 
    if(id<0||id>=MAX_OBJS) 
        error("Invalid ID");
}

int alloc_slot() { 
    for(int i=0; i<MAX_OBJS; i++) 
        if(objects[i].type==TYPE_FREE) 
            return i; 
    return -1; 
}

void sys_alloc_data() {
    int size = regs[1];
    int id = alloc_slot();
    if(id == -1) error("OOM");

    memset(&objects[id], 0, sizeof(vm_object_t));
    objects[id].type = TYPE_DATA;
    objects[id].perms = PERM_RW;
    objects[id].ref_count = 1;
    objects[id].size = size;
    objects[id].content.buffer = malloc(size);
    regs[0] = id;
    printf("alloc_data(%d) -> ID %d\n", size, id);
}

void sys_alloc_exec() {
    int target_func = regs[1];
    int id = alloc_slot();
    if(id == -1) error("OOM");

    memset(&objects[id], 0, sizeof(vm_object_t));
    objects[id].type = TYPE_EXEC;
    objects[id].perms = PERM_X; 
    objects[id].ref_count = 1;
    
    uint64_t raw_ptr = 0;
    switch(target_func) {
        case SYS_ALLOC_DATA: 
            raw_ptr = (uint64_t)sys_alloc_data;
            break;
        case SYS_ALLOC_EXEC: 
            raw_ptr = (uint64_t)sys_alloc_exec;
            break;
        case SYS_FREE:       
            raw_ptr = (uint64_t)sys_free;
            break;
        case SYS_SPLIT: 
            raw_ptr = (uint64_t)sys_split;
            break;
        case SYS_DUP:        
            raw_ptr = (uint64_t)sys_dup;
            break;
        case SYS_NAME:       
            raw_ptr = (uint64_t)sys_name;
            break;
        case SYS_WRITE:      
            raw_ptr = (uint64_t)sys_write;
            break;
        case SYS_READ:       
            raw_ptr = (uint64_t)sys_read;
            break;
        case SYS_EXEC:       
            raw_ptr = (uint64_t)sys_exec;
            break;
        default:             
            raw_ptr = (uint64_t)safe_handler;
            break;
    }

    objects[id].content.func_ptr = raw_ptr ^ PAC_KEY;
    regs[0] = id;
    printf("alloc_exec(task=%d) -> ID %d\n", target_func, id);
}

void sys_free() {
    printf("[SYS] GC Running...\n");
    int freed = 0;
    for(int i=0; i<MAX_OBJS; i++) {
        if(objects[i].type != TYPE_FREE && objects[i].ref_count == 0) {
            if(objects[i].type == TYPE_DATA) 
                free(objects[i].content.buffer);
            objects[i].type = TYPE_FREE;
            objects[i].perms = PERM_NONE;
            freed++;
        }
    }
    printf("Freed %d objects.\n", freed);
}

void sys_dup() {
    int id = regs[1];
    validate_id(id);
    if(objects[id].type == TYPE_FREE) 
        error("UAF");
    
    if(objects[id].ref_count >= 255) 
        error("Max Refs");
    
    objects[id].ref_count++;
    regs[0] = id;
    printf("dup(obj_%d) -> RefCount %d\n", id, objects[id].ref_count);
}

void sys_split() {
    int id = regs[1];
    validate_id(id);
    if(objects[id].type == TYPE_FREE) 
        error("UAF");

    if(objects[id].ref_count >= 255) 
        error("Max Refs");

    objects[id].ref_count += 2; 
    
    regs[0] = id; 
    regs[1] = id; 
    printf("split(obj_%d) -> RefCount %d\n", id, objects[id].ref_count);
}

void sys_name() {
    int id = regs[1];
    int len = regs[2];
    validate_id(id);

    if(objects[id].type == TYPE_EXEC) 
        error("Cannot name Executable");

    if(len > 64) 
        error("Name too long");

    printf("[SYS] name(obj_%d) -> Reading %d bytes\n", id, len);
    
    char *base = (char*)&objects[id];
    for(int i=0; i<len; i++) {
        if ((void*)(base + i) >= (void*)&objects[MAX_OBJS]) 
            error("Segfault");
        read(0, base + i, 1);
    }
}

void sys_write() {
    int id = regs[1]; int off = regs[2]; int val = regs[3];
    validate_id(id);
    if(!(objects[id].perms & PERM_W)) 
        error("Permission Denied");
    char *ptr = (char *)&objects[id].content.func_ptr;
    ptr[off] = (char)val;
}

void sys_read() {
    int id = regs[1]; 
    int off = regs[2];
    validate_id(id);
    if(!(objects[id].perms & PERM_R)) 
        error("Permission Denied");
    char *ptr = (char *)&objects[id].content.func_ptr;
    printf("Byte at +%d: 0x%02x\n", off, (unsigned char)ptr[off]);
}

void sys_exec() {
    int id = regs[1];
    validate_id(id);
    if(!(objects[id].perms & PERM_X)) 
        error("Permission Denied");
    if(objects[id].type != TYPE_EXEC) 
        error("Not Executable");
    
    uint64_t enc = objects[id].content.func_ptr;
    void (*f)() = (void (*)())(enc ^ PAC_KEY);
    
    printf("Executing Task %p...\n", f);
    f();
}

void run_vm() {
    while(running && pc < MAX_CODE) {
        uint8_t op = fetch8();
        switch(op) {
            case INS_HALT: 
                running = 0; 
                break;
            case INS_MOV_IMM: { 
                uint8_t r=fetch8(); 
                regs[r]=fetch32(); 
                break; 
            }
            case INS_MOV_REG: { 
                uint8_t d=fetch8(); 
                uint8_t s=fetch8(); 
                regs[d]=regs[s]; 
                break; 
            }
            case INS_ADD: { 
                uint8_t d=fetch8(); 
                uint8_t s=fetch8(); 
                regs[d]+=regs[s]; 
                break; 
            }
            case INS_SUB: { 
                uint8_t d=fetch8(); 
                uint8_t s=fetch8(); 
                regs[d]-=regs[s]; 
                break; 
            }
            case INS_XOR: { 
                uint8_t d=fetch8(); 
                uint8_t s=fetch8(); 
                regs[d]^=regs[s]; 
                break; 
            }
            case INS_SYS: {
                switch(regs[0]) {
                    case SYS_ALLOC_DATA: 
                        sys_alloc_data(); 
                        break;
                    case SYS_ALLOC_EXEC: 
                        sys_alloc_exec(); 
                        break;
                    case SYS_FREE:       
                        sys_free(); 
                        break;
                    case SYS_SPLIT: 
                        sys_split(); 
                        break;
                    case SYS_DUP:        
                        sys_dup(); 
                        break;
                    case SYS_NAME:       
                        sys_name(); 
                        break;
                    case SYS_WRITE:      
                        sys_write(); 
                        break;
                    case SYS_READ:       
                        sys_read(); 
                        break;
                    case SYS_EXEC:       
                        sys_exec(); 
                        break;
                    default: error("Unknown Syscall");
                } break;
            }
            default: error("Illegal Instruction");
        }
    }
}

int main() {
    setvbuf(stdout, NULL, _IONBF, 0);
    printf("TerViMator\n");
    printf("Waiting for bytecode...\n");
    int len = read(0, code, MAX_CODE);
    if(len <= 0) 
        exit(0);
    printf("Executing...\n");
    run_vm();
    return 0;
}
