//gcc -no-pie -Wl,--section-start=.got.plt=0x400a00 -o challenge chal.c

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>


void win() {
   printf("\nCongratulations: \n");
   char flag[50];
   FILE *f = fopen("flag.txt", "r");
   fgets(flag, sizeof(flag), f);
   printf("%s", flag);
   fclose(f);
   _exit(0);  
}

void vuln() {
   char buffer[100];
   fgets(buffer, 100, stdin);
   printf(buffer);
   exit(0);
}

int main(){
   setvbuf(stdout, NULL, _IONBF, 0);
   setvbuf(stdin,NULL, _IONBF, 0);
   printf("I am the talking mirror. Tell me anything and I shall repeat it.\n");
   vuln();
   printf("Thanks for playing.");
}
