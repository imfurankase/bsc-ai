import requests
import socket
import os
import time

TARGETS = [
    "host.docker.internal",
    "172.17.0.1", # Default bridge gateway
    "localhost",
    "127.0.0.1"
]

PORT = 11434

print("=== Starting Ollama Connectivity Diagnosis ===")
print(f"Environment OLLAMA_BASE_URL: {os.getenv('OLLAMA_BASE_URL')}")

for host in TARGETS:
    print(f"\nTesting Host: {host}")
    
    # 1. DNS Resolution
    try:
        ip = socket.gethostbyname(host)
        print(f"  [DNS] Resolved to: {ip}")
    except Exception as e:
        print(f"  [DNS] Failed: {e}")
        # continue if DNS fails, might be an IP

    # 2. TCP Connection
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((host, PORT))
        if result == 0:
            print(f"  [TCP] Port {PORT} is OPEN")
        else:
            print(f"  [TCP] Port {PORT} returned error code: {result}")
        sock.close()
    except Exception as e:
        print(f"  [TCP] Connection failed: {e}")

    # 3. HTTP GET (Tags)
    try:
        url = f"http://{host}:{PORT}/api/tags"
        print(f"  [HTTP] GET {url}")
        resp = requests.get(url, timeout=3)
        print(f"  [HTTP] Status: {resp.status_code}")
        if resp.status_code == 200:
            print(f"  [HTTP] Success! Found {len(resp.json().get('models', []))} models")
    except Exception as e:
        print(f"  [HTTP] GET failed: {e}")

print("\n=== Diagnosis Complete ===")
