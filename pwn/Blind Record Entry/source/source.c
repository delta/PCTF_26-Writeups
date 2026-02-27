#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

struct Entries {
       void * entries[50];
       int sizes[50];
       int inuse[50];
       int top;
};

struct Entries rec;

void init_rec(){
       rec.top = -1;
       for (int i = 0; i < 50; i++) {
               rec.entries[i] = NULL;
               rec.sizes[i] = 0;
               rec.inuse[i] = 0;
       }
}

void init_mem(unsigned short size){
       rec.entries[rec.top] = malloc(size);
       rec.inuse[rec.top] = 1;
       if (!rec.entries[rec.top]) {
               puts("Allocation  Failed");
               exit(1);
       }
}

int get_size(){
       char buf[16];
       if (fgets(buf, sizeof(buf), stdin) == NULL) {
               return 0;
       }
       return strtoul(buf, NULL , 10);
}

void add_entry(){
       if (rec.top < 49){
               int idx;
               int size;

               printf("Enter size of entry: ");
               size = get_size();

               if (size > 0){  
                       rec.sizes[++rec.top] = size;
                       init_mem(size);
               }
       }
}

void edit_entry(){
       printf("Enter the ID of the entry: ");
       int idx = get_size();
       if (!rec.inuse[idx] || idx < 0 || idx > rec.top){
               printf("invalid index");
               return;
       }
       printf("Enter position of data");
       int pos = get_size();
       int maxwrite = (rec.sizes[idx]<2000)?rec.sizes[idx]:2000;
       if (pos > maxwrite || pos < 0){
               printf("Invalid position ");
               return;
       }

       maxwrite -= pos;
       printf("Enter data: ");
       read(0, rec.entries[idx]+pos, maxwrite);
}

void delete_entry(){
       printf("Enter the ID of the entry: ");
       int idx = get_size();
       if (!rec.inuse[idx] || idx < 0 || idx > rec.top){
               printf("invalid index");
               return;
       }
       free(rec.entries[idx]);
       rec.inuse[idx] = 0;
       if (idx == rec.top)
               rec.top--;
}

void secret() {
       char exitleak = ((size_t) &exit >> 12) & 0xf;
       char heapleak = ((size_t) rec.entries[0] >> 12 & 0xf);
       printf("ASLR LSB for exit(): %hhx\n", exitleak);
       if (rec.entries[0] != NULL){
               printf("ASLR LSB for heap: %hhx\n", heapleak);
       }
}

int main() {
       setbuf(stdin, NULL);
       setbuf(stdout, NULL);
       setbuf(stderr, NULL);
    
       init_rec();
    
       while(1) {
       puts("\n1. Add Entry");
       puts("2. Edit Entry");
       puts("3. Delete Entry");
       puts("4. Exit");
       printf("> ");

       int choice = get_size();
       switch(choice){
               case 1: add_entry(); break;
               case 2: edit_entry(); break;
               case 3: delete_entry(); break;
               case 4: exit(0); break;
               case 5: secret(); break;
               default: puts("Invalid choice");
       }
       }
       return 0;
}
