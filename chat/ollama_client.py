import requests
import json
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
        "If real-time data is provided (weather, stock prices), use it to answer accurately. "
        "If no real-time data is given, do not invent numbers. Say 'I don't have live data for that.' "
    )

    if context:
        # Append document context to system message
        system_message += (
            "\n\nUse the following DOCUMENT EXCERPTS to answer questions when relevant. "
            "If the user refers to prior conversation (e.g., 'the 2nd idea'), recall it from chat history. "
            "If the answer isn't in the documents, rely on the conversation history or say you don't know.\n\n"
            "=== DOCUMENT EXCERPTS ===\n"
            f"{context[:6000]}\n"
            "=== END DOCUMENT ==="
        )

    # Build full message list with system message first
    chat_messages = [{"role": "system", "content": system_message}]
    chat_messages.extend(messages)
    
    try:
        response = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": "phi3:mini",  # ✅ CHANGED FROM "llama3:8b" TO "phi3"
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
        yield f"⚠️ Error: {str(e)}"