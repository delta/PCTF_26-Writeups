//compile with stack canary and pie disabled
//gcc chal.c -o chal -no-pie -fno-stack-protector
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

void setup() {
    setvbuf(stdin, NULL, _IONBF, 0);
    setvbuf(stdout, NULL, _IONBF, 0);
}

void check_status(int id) {
    if (id == 0xc35e415f) { //bytecode for pop rdi; pop r14; ret;
        printf("Congratulations... jk...\n");
    }
}

void vuln() {
    char buffer[64];
    printf("The washing machine is running...\n");
    printf("Add your laundry: ");
    read(0, buffer, 256);
    printf("Laundry complete\n");
}

int main() {
    setup();
    check_status(0);
    puts("--- Laundromat v2.0 ---");
    vuln();
    return 0;
}

