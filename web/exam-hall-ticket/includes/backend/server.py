import codecs
import io
import json
import os
import random
import secrets
import string
import time
import subprocess
import threading
import signal
import psycopg2
from flask import (
    Flask,
    Response,
    jsonify,
    make_response,
    request,
    send_from_directory,
    stream_with_context,
)
from PyPDF2 import PdfReader
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import re

app = Flask(__name__, static_folder="front")

DB_HOST = "db"
DB_NAME = "pctf"
DB_USER = "pctf"
DB_PASS = "password"
PDF_SECRET = "pdf_soooo_fun_also_pctf26_is_goated"
FLAG = "p_ctf{Wh0_nEed$_h@!!_Ti(kEt$_anYW@Y}"
QUEUE_COUNT = 100
USER_QUEUES = {}
RATE_LIMIT_WINDOW = 120
RATE_LIMIT_THRESHOLD = 150
USER_RATE_LIMITS = {}
USER_HAS_UPLOADED = {}
app.config['MAX_CONTENT_LENGTH'] = 4 * 1024 * 1024

try:
    signal.signal(signal.SIGCHLD, signal.SIG_IGN)
except AttributeError:
    pass
    
try:
    codecs.lookup("euctw")
except LookupError:

    def search_function(encoding):
        if encoding.lower() == "euctw":
            return codecs.lookup("euc_tw")
        return None

    codecs.register(search_function)

upload_lock = threading.Lock()

def get_db_connection(token=None):
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        options="-c client_encoding=SQL_ASCII",
    )

    conn.set_client_encoding("BIG5")
    if token: 
        cur = conn.cursor()
        cur.execute("SET app.current_session_token = %s", (token,))
        cur.close()
    return conn


def gen_roll():
    """Generates format: AB9876YZ"""
    letters = string.ascii_uppercase
    digits = string.digits
    return (
        "".join(random.choices(letters, k=2))
        + "".join(random.choices(digits, k=4))
        + "".join(random.choices(letters, k=2))
    )


def get_or_create_session(req):
    token = req.cookies.get("session_token")

    if token and len(token) == 48:
        if token not in USER_QUEUES:
            USER_QUEUES[token] = 100
        return token, False
    token = secrets.token_hex(24)
    roll = gen_roll()
    attendance = random.randint(0, 74)

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO students (session_token, roll, attendance) VALUES (%s, %s, %s) ON CONFLICT (session_token) DO NOTHING",
            (token, roll, attendance),
        )
        conn.commit()
        conn.close()
        print(f"[SESSION] New User: {token[:8]}... | Roll: {roll}")
    except Exception as e:
        print(f"[ERROR] Session Init: {e}")

    return token, True


@app.route("/")
def index():
    return send_from_directory("front", "index.html")


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory("front", path)
    
def has_valid_where(payload: str) -> bool:

    if ";" not in payload:
        return False
    forbidden_pattern = re.compile(
        r"\b(INSERT|DELETE|DROP|ALTER|TRUNCATE|REPLACE|MERGE)\b", 
        re.I
    )
    if forbidden_pattern.search(payload):
        return False
    
    WHERE_RE = re.compile(r"where\s+session_token\s*=", re.I)
    after = payload.split(";", 1)[1]
    stmt = after.split(";", 1)[0]
    return bool(WHERE_RE.search(stmt))

@app.route("/hallticket", methods=["GET"])
def get_hallticket():
    token, is_new = get_or_create_session(request)

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT roll, attendance FROM students WHERE session_token = %s", (token,)
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Session Invalid. Please clear cookies and refresh."})

    resp = make_response(
        jsonify({"roll": row[0], "attendance": row[1], "eligible": row[1] >= 75})
    )

    if is_new:
        resp.set_cookie(
            "session_token", token, httponly=True, samesite="None", max_age=86400
        )

    return resp

@app.route("/hallticket", methods=["POST"])
def post_hallticket():
    token = request.cookies.get("session_token")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        raw_data = request.get_data()
        data = json.loads(raw_data.decode("latin1"))
    except:
        return jsonify({"error": "Invalid JSON"}), 400

    roll_input = data.get("roll", "")
    
    if token not in roll_input:
        return jsonify({"error": "Invalid user"}), 400
    if not has_valid_where(roll_input):
        return jsonify({"error": "Invalid user"}), 400
    conn = get_db_connection(token=token)
    cur = conn.cursor()

    query = f"SELECT roll, attendance FROM students WHERE roll = '{roll_input}' AND session_token = '{token}'"

    try:
        cur.execute(query)
        conn.commit()
        row = cur.fetchone() if cur.description else None
        conn.close()

        if not row:
            return jsonify({"status": "Attendance updated"})

        return jsonify({"roll": row[0], "attendance": row[1], "eligible": row[1] >= 75})
    except Exception as e:
        return jsonify({"error": "Backend error"}), 500


@app.route("/health")
def health():
    return "OK"


@app.route("/download-ticket", methods=["GET"])
def download_ticket():
    token = request.cookies.get("session_token")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
    
    if token not in USER_QUEUES: USER_QUEUES[token] = 100
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT roll, attendance FROM students WHERE session_token = %s", (token,)
    )
    row = cur.fetchone()
    conn.close()

    if not row or row[1] < 75:
        return jsonify({"error": "Not Eligible"}), 403

    roll, attendance = row

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    p.setTitle(f"Hall Ticket - {roll}")
    p.setAuthor("PCTF")
    p.setKeywords(f"{PDF_SECRET}")
    p.setSubject("exam hall ticket")
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, 750, "Pragyan CTF - Hall Ticket")
    p.setFont("Helvetica", 12)
    p.drawString(100, 720, f"Roll Number: {roll}")
    p.drawString(100, 700, f"Attendance: {attendance}%")
    p.drawString(100, 680, "Date of Examination: 1/4/2026")
    p.drawString(100, 660, "Status: ELIGIBLE")
    p.setFillColorRGB(1, 1, 1)
    p.drawString(100, 20, "L2FkbWluL3Byb2Nlc3Mtam9i")
    p.setFillColorRGB(0, 0, 0)
    p.showPage()
    p.save()

    real_pdf_bytes = buffer.getvalue()
    real_size = len(real_pdf_bytes)

    target_size = 2 * 1024 * 1024
    padding_size = target_size - real_size
    padding = b" " * padding_size

    full_data = real_pdf_bytes + padding
    range_header = request.headers.get("Range", None)

    start_byte = 0
    end_byte = target_size - 1

    if range_header:
        try:
            byte_range = range_header.split("=")[1]
            start_str, end_str = byte_range.split("-")
            start_byte = int(start_str) if start_str else 0

            end_byte = int(end_str) if end_str else target_size - 1
        except:
            pass

    data_to_send = full_data[start_byte : end_byte + 1]

    def generate():
        chunk_size = 1024 * 5
        total_len = len(data_to_send)

        current_file_pos = start_byte

        for i in range(0, total_len, chunk_size):
            chunk = data_to_send[i : i + chunk_size]
            yield chunk

            current_file_pos += len(chunk)

            if current_file_pos > (real_size + 1024):
                time.sleep(5)

    response = Response(stream_with_context(generate()), mimetype="application/pdf")
    response.headers["Content-Disposition"] = (
        f"attachment; filename=HallTicket_{roll}.pdf"
    )
    response.headers["Accept-Ranges"] = "bytes"
    response.headers["Content-Length"] = len(data_to_send)

    if range_header:
        response.status_code = 206
        response.headers["Content-Range"] = (
            f"bytes {start_byte}-{end_byte}/{target_size}"
        )

    return response

UPLOAD_DIR = "/tmp/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route("/bot-init")
def bot_init():
    token,_ = get_or_create_session(request)
    resp = make_response("ok")
    resp.set_cookie("session_token", token)
    return resp

@app.route('/queue-status', methods=['GET'])
def get_queue_status():
    token = request.cookies.get("session_token")
    
    if not token:
        return jsonify({"message": "Waiting for upload..."})

    count = USER_QUEUES.get(token, QUEUE_COUNT)
    has_uploaded = USER_HAS_UPLOADED.get(token, False)
    if not has_uploaded:
        return jsonify({
            "message": "Waiting for upload..."
        })
    
    if count > 0:
        return jsonify({
            "error": "Printer queue is full, please try again later.",
        })

    return jsonify({
        "count": 0,
        "message": "Queue cleared! Printing...",
        "msg": FLAG
    })
    
@app.route('/admin/process-job', methods=['POST'])
def process_job():
    if request.remote_addr != "127.0.0.1":
        return jsonify({"error": "Internal access only"}), 403
    
    token = request.cookies.get("session_token")
    if not token: 
        return jsonify({"error": "No session"}), 400
    data = request.get_json(force=True, silent=True) 
    
    if not data or data.get('count') != 100:
        return jsonify({"error": "Not first in the print queue."}), 400
    USER_QUEUES[token] = 0
    
    print(f"[SERVER] Queue cleared via strict protocol for {token[:8]}")
    return jsonify({"status": "Queue Cleared", "remaining": 0})

@app.route("/print-upload", methods=["POST"])
def print_upload():
    token = request.cookies.get("session_token")
    if not token:
        return jsonify({"error": "Unauthorized: No Session"}), 401
    with upload_lock:
        if USER_HAS_UPLOADED.get(token):
            return jsonify({"error": "Already uploaded"}), 429
            
        USER_HAS_UPLOADED[token] = True
    
    f = request.files.get("file")
    if not f or not f.filename.endswith(".pdf"):
        return jsonify({"error": "Invalid file"}), 400
    
    path = os.path.join(UPLOAD_DIR, secrets.token_hex(8) + ".pdf")
    f.save(path)
    
    try:
        reader = PdfReader(path)
        meta = reader.metadata
        key = meta.get("/Keywords", "")
        if key != PDF_SECRET:
            return jsonify({"error": "Invalid Signature"}), 403
    except:
        with upload_lock:
            USER_HAS_UPLOADED[token] = False
        return jsonify({"error": "Corrupt PDF"}), 400

    print(f"[SERVER] Launching Bot for user {token[:8]}...")
    # PASS TOKEN TO BOT
    subprocess.Popen(["node", "bot.js", path, token])
    
    return jsonify({"status": "Document verified. Added to print queue"})

@app.route("/view/<name>")
def view_file(name):
    path = os.path.join(UPLOAD_DIR, name)
    if not os.path.exists(path):
        return "Not found", 404
    try:
        reader = PdfReader(path)
        meta = reader.metadata
        title = meta.get("/Title", "")
    except:
        title = ""
    return f"""
    <html><body>
        <h2>Printing Preview</h2>
        <div id="meta">{title}</div>
    </body></html>
    """
    
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"error": "File too large. Max limit is 3MB."}), 413
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, threaded=True)