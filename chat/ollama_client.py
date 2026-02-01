import requests
import json
import os
import logging
logging.basicConfig(level=logging.INFO)


def get_phi3_response_stream(messages, context=None):
    """Stream response from Phi-3 Mini with BSC branding, chat history, and optional RAG context"""
    # System message that enforces brand identity and behavior
    system_message = (
        "You are BSC AI, an intelligent assistant developed by BSC (Broadband Systems Corporation) "
        "in Rwanda to support digital innovation and national transformation. "
        "You were created entirely by BSC's engineering team and do not mention Meta, Llama, Phi, Microsoft, "
        "or any other external AI models or companies. "
        "Always refer to yourself as 'BSC AI' or 'I, BSC AI'. "
        "Keep responses professional, helpful, and grounded in facts. "
        "If asked about your origin, say: 'I was developed by BSC in Rwanda to advance local AI capabilities.' "
    )

    if context:
        # Check if it's web search results or document context
        # The context comes wrapped with [Real-time Data]: prefix from _combine_contexts
        is_realtime = "[Real-time Data]" in context or "[Web Search Results" in context
        print(f"[DEBUG] Context type detection - is_realtime: {is_realtime}")
        
        if is_realtime:
            system_message += (
                "\n\n**CRITICAL INSTRUCTION**: I am providing you with REAL-TIME DATA from a web search. "
                "You MUST use this information to answer the user's question accurately. "
                "Do NOT say you don't have real-time data - USE THE DATA PROVIDED BELOW. "
                "Always cite the source when answering.\n\n"
                "=== REAL-TIME SEARCH RESULTS ===\n"
                f"{context}\n"
                "=== END SEARCH RESULTS ===\n\n"
                "Based on the search results above, answer the user's question directly and accurately."
            )
        else:
            # Document context (RAG)
            system_message += (
                "\n\n**CRITICAL INSTRUCTION**: The user has uploaded documents. "
                "I am providing you with EXCERPTS from their uploaded documents below. "
                "You MUST use this document content to answer the user's question. "
                "Do NOT say you cannot access documents or PDFs - the document content is provided below. "
                "Answer questions based on the document excerpts provided.\n\n"
                "=== UPLOADED DOCUMENT CONTENT ===\n"
                f"{context[:6000]}\n"
                "=== END DOCUMENT CONTENT ===\n\n"
                "Use the document content above to answer the user's question directly."
            )

    # Build full message list with system message first
    chat_messages = [{"role": "system", "content": system_message}]
    chat_messages.extend(messages)
    
    # Debug: Print what we're sending
    print(f"[DEBUG] System message length: {len(system_message)}")
    if context:
        print(f"[DEBUG] Context preview: {context[:300]}...")
    
    try:
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        print(f"[DEBUG] Ollama Base URL: {base_url}")
        response = requests.post(
            f"{base_url}/api/chat",
            json={
                "model": "phi3:mini",
                "messages": chat_messages,
                "stream": True,
                "keep_alive": "10m",
                "options": {
                    "temperature": 0.1,
                    "top_p": 0.95,
                    "num_predict": 400,
                }
            },
            stream=True,
            timeout=120
        )
        
        for line in response.iter_lines():
            if line:
                try:
                    data = json.loads(line)
                    if "message" in data and "content" in data["message"]:
                        yield data["message"]["content"]
                except:
                    continue
    except Exception as e:
        print(f"[ERROR] Ollama Request Failed: {str(e)}")
        yield f"⚠️ Error: {str(e)}"