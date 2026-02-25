import http.server
import socketserver
import os
import mimetypes


PORT = 9001
FILES_DIR = "./domain_files" 


DOMAIN_MAP = {
    # relevant files
    "novidia.gpu":      "mooooo.sh",                 
    "notflix.com":      "nginx.conf.bak",            
    "microslop.io":     "backup.sh",
    "chrome.ram":       "test_uid.jpeg",
    "twitter.x":        "flAg_!$_dEf|nitELy_heRe.jpeg", 
    # irrelevant files
    "google.meme":      "hint_1.txt",                
    "shallowseek.lo":   "hint_2.txt",                
    "amazon.bez":       "file_algo.php",             
    "metube.lol":       "ctf.jpeg",                
    "nosebook.com":     "flag.txt",                  
    "instakilogram.com":"game.jpeg",                 
    "toktik.rot":       "gng.jpeg",                  
    "shatgpt.com":      "Hechteeyemyel.html",        
    "banana.mephone":   "sadge.jpeg",                
    "nikey.adi":        "script.js",                 
    "samnotsung.com":   "source.html"
}

class VirtualHostHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        host_header = self.headers.get('Host', '').lower().split(':')[0]
        if host_header in DOMAIN_MAP:
            filename = DOMAIN_MAP[host_header]
            self.serve_file(filename)
        else:
            self.send_response(404)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(b"404 Not Found")

    def serve_file(self, filename):
        file_path = os.path.join(FILES_DIR, filename)
        
        if not os.path.exists(file_path):
            self.send_error(500, f"Server Configuration Error: '{filename}' missing.")
            return

        try:
            content_type, _ = mimetypes.guess_type(file_path)
            if not content_type:
                content_type = 'application/octet-stream'

            with open(file_path, 'rb') as f:
                content = f.read()
                
            self.send_response(200)
            self.send_header("Content-type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            
        except Exception as e:
            self.send_error(500, f"Internal Error: {str(e)}")
    def log_message(self, format, *args):
        pass

def run():
    print(f"[*] Server running on Port {PORT}")
    print(f"[*] Serving {len(DOMAIN_MAP)} domains from '{FILES_DIR}'")
    
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        httpd = socketserver.TCPServer(("", PORT), VirtualHostHandler)
        httpd.serve_forever()
    except PermissionError:
        print(f"[!] Error: You need root/sudo to run on port {PORT}.")
    except KeyboardInterrupt:
        print("\n[*] Stopping server.")
        httpd.server_close()

if __name__ == '__main__':
    run()