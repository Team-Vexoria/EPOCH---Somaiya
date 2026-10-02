import sys
import json
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

print("=== 1. TEST GET / (Health Check) ===")
res_health = client.get("/")
print("Status Code:", res_health.status_code)
print("Response:", res_health.json())
assert res_health.status_code == 200

print("\n=== 2. TEST POST /ask (JSON Response) ===")
payload = {"question": "What is PEFT?"}
res_ask = client.post("/ask", json=payload)
print("Status Code:", res_ask.status_code)
assert res_ask.status_code == 200
data = res_ask.json()
print("Keys:", list(data.keys()))
print("Path:", data["path"])
print("Time taken:", data["time_taken"], "s")
print("Sources:", data["sources"])
print("Steps:")
for s in data["steps"]:
    print(f"  - [{s['step']}] {s['details']} ({s['time_taken']}s)")
print("Answer Preview:", data["answer"][:120], "...\n")

# Verify all required keys are present
assert "answer" in data
assert "sources" in data
assert "path" in data
assert "steps" in data
assert "time_taken" in data
assert len(data["steps"]) >= 3

print("=== 3. TEST POST /ask/stream (SSE Streaming) ===")
events = []
with client.stream("POST", "/ask/stream", json={"question": "What is self-attention?"}) as response:
    print("Stream status code:", response.status_code)
    assert response.status_code == 200
    for line in response.iter_lines():
        if line and line.startswith("data: "):
            ev_data = json.loads(line[6:])
            events.append(ev_data)
            ev_type = ev_data.get("event")
            if ev_type == "step":
                print(f"  -> [EVENT: {ev_type}] step={ev_data.get('step')} msg={ev_data.get('message')}")
            elif ev_type == "step_done":
                print(f"  -> [EVENT: {ev_type}] step={ev_data.get('step')} details={ev_data.get('details')} ({ev_data.get('time_taken')}s)")
            elif ev_type == "complete":
                print(f"  -> [EVENT: {ev_type}] answer preview={ev_data.get('answer')[:60]}... total_time={ev_data.get('time_taken')}s")

print(f"Total SSE events received: {len(events)}")
assert any(e.get("event") == "complete" for e in events)

print("\n=== 4. TEST GET /ask/stream (Browser EventSource compatibility) ===")
get_events = []
with client.stream("GET", "/ask/stream?question=What+is+PEFT%3F") as response:
    assert response.status_code == 200
    for line in response.iter_lines():
        if line and line.startswith("data: "):
            ev_data = json.loads(line[6:])
            get_events.append(ev_data)

print(f"Total GET SSE events received: {len(get_events)}")
assert any(e.get("event") == "complete" for e in get_events)

print("\nALL TESTS PASSED SUCCESSFULLY! Both /ask and /ask/stream are fully verified.")
