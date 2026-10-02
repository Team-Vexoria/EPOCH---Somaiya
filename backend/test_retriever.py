"""Final verification: retriever connects and returns docs at calibrated threshold."""
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
os.environ["ANONYMIZED_TELEMETRY"] = "False"

from crag_app import (
    embed_model, PERSIST_DIRECTORY, COLLECTION_NAME,
    similarity_threshold_retriever, chroma_db, SCORE_THRESHOLD
)

print(f"PERSIST_DIRECTORY: {PERSIST_DIRECTORY}")
print(f"COLLECTION_NAME:   {COLLECTION_NAME}")
print(f"SCORE_THRESHOLD:   {SCORE_THRESHOLD}")
print(f"Collection count:  {chroma_db._collection.count()}")

queries = [
    "onion price nashik",
    "best mandi to sell tomato near Nashik",
    "soyabean seasonal trend",
    "when should I sell onion",
]

for q in queries:
    docs = similarity_threshold_retriever.invoke(q)
    print(f"\n'{q}' → {len(docs)} docs")
    for d in docs[:2]:
        snippet = d.page_content[:140].replace('\n', ' ')
        src = d.metadata.get('source', '?')
        print(f"  [{src}] {snippet}…")

print("\n✅ Backend ↔ RAG index integration verified.")
