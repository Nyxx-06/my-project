import subprocess
import re
import signal
import sys

PORT = 5000
JS_FILE = "javser.js"

# Jalankan backend
backend = subprocess.Popen(["node", JS_FILE])
print(f"[INFO] Backend {JS_FILE} running at http://localhost:{PORT}")

# Jalankan cloudflared
process = subprocess.Popen(
    ["cloudflared", "tunnel", "--url", f"http://localhost:{PORT}"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True
)

# Function kalau CTRL+C ditekan
def cleanup(sig, frame):
    print("\n[INFO] Stopping services...")
    backend.terminate()
    process.terminate()
    sys.exit(0)

# Daftarin signal handler
signal.signal(signal.SIGINT, cleanup)

# Cari URL dari cloudflared
for line in process.stdout:
    match = re.search(r"https://[0-9a-zA-Z\-]+\.trycloudflare\.com", line)
    if match:
        print(f"[URL] {match.group(0)}")
        break

# Biarkan cloudflared jalan sampai CTRL+C ditekan
for line in process.stdout:
    pass
