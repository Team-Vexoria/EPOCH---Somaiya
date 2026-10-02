import json
import sys
from pathlib import Path
import chromadb

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parents[1]

# Support both if ROOT is data/ or repo root
DOCUMENT_FILE = (
    ROOT / "rag" / "mandi_documents.jsonl"
    if (ROOT / "rag" / "mandi_documents.jsonl").exists()
    else ROOT / "data" / "rag" / "mandi_documents.jsonl"
)
DB_FOLDER = ROOT / "chroma_db" if (ROOT / "rag").exists() else ROOT / "data" / "chroma_db"

documents = []

with open(DOCUMENT_FILE, "r", encoding="utf-8") as file:
    for line in file:
        documents.append(json.loads(line))

if not documents:
    raise ValueError("No RAG documents found.")

client = chromadb.PersistentClient(path=str(DB_FOLDER))

collection = client.get_or_create_collection(
    name="nashik_mandi_advisory",
    metadata={
        "description": "Nashik-centred mandi advisory prototype"
    }
)

ids = [doc["id"] for doc in documents]
texts = [doc["text"] for doc in documents]
metadatas = [doc["metadata"] for doc in documents]

# Adds documents if new and updates them if the script is run again
collection.upsert(
    ids=ids,
    documents=texts,
    metadatas=metadatas
)

print(f"Indexed {collection.count()} RAG documents.")
print(f"Vector database saved in: {DB_FOLDER}")

# Test whether retrieval works
question = "Where should I sell onion near Nashik?"

results = collection.query(
    query_texts=[question],
    n_results=3
)

print("\nTest question:", question)
print("\nTop retrieved documents:")

for index, metadata in enumerate(results["metadatas"][0], start=1):
    print(
        f"{index}. {metadata['crop'].title()} | "
        f"{metadata['mandi']} | "
        f"Forecast ₹{metadata['forecast_price_rs_per_quintal']}/qtl | "
        f"{metadata['confidence']} confidence"
    )
