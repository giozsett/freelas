import urllib.request
import json

try:
    req = urllib.request.Request('http://127.0.0.1:8000/api/candidaturas/')
    req.add_header('Accept', 'application/json')
    response = urllib.request.urlopen(req)
    print("Status:", response.status)
    print("Response:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
