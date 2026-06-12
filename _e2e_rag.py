from core.rag import get_rag_engine

engine = get_rag_engine()
print("1. Status:", engine.get_status())

print("\n2. Building index...")
result = engine.index_documents("", force=True)
print("   Result:", result)

print("\n3. Keyword search test:")
kw = engine._keyword_search("What is Transformer?", 3)
for r in kw:
    print(f"   [{r['score']:.2f}] {r['meta'].get('file','?')}: {r['text'][:80]}...")

print("\n4. Full query test:")
q = engine.query("What is Transformer?", top_k=3)
print(f"   Answer: {q.answer[:200]}...")
print(f"   Sources: {len(q.sources)}")
for s in q.sources:
    print(f"   [{s['score']:.2f}] {s['file']}")

print("\n5. All tests passed!")
