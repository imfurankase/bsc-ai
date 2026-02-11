import requests
import json
import os
import logging
logging.basicConfig(level=logging.INFO)



def get_ai_response_stream(messages, context=None):
    """Stream response from AI Model (Llama 3.3 70b) with BSC branding, chat history, and optional RAG context"""
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
                "model": "llama3.3:70b",
                "messages": chat_messages,
                "stream": True,
                "keep_alive": "10m",
                "options": {
                    "temperature": 0.1,
                    "top_p": 0.95,
                    "num_predict": -1,
                    "num_ctx": 8192,
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

def get_ai_response(messages, context=None):
    """Get full response from AI Model (non-streaming wrapper)"""
    full_response = ""
    for chunk in get_ai_response_stream(messages, context):
        full_response += chunk
    return full_response


def _ollama_chat(messages, stream: bool, options: dict, timeout: int = 120) -> dict:
    """
    Low-level helper to call Ollama /api/chat.
    When stream=False, returns the parsed JSON response.
    """
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    response = requests.post(
        f"{base_url}/api/chat",
        json={
            "model": "llama3.3:70b",
            "messages": messages,
            "stream": stream,
            "keep_alive": "10m",
            "options": options,
        },
        stream=stream,
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json()


def get_web_tool_call(user_message: str) -> dict:
    """
    Ask the model to decide which Tavily tool (if any) to run.

    Returns a dict with shape:
      {"tool": "none"} OR {"tool": "tavily.search"|"tavily.extract"|"tavily.crawl"|"tavily.map"|"tavily.research", "args": {...}}
    """
    routing_system = (
        "You are a tool router. You decide whether to call Tavily web tools.\n"
        "You MUST output only valid JSON (no markdown, no explanation).\n\n"
        "Available tools:\n"
        "- tavily.search: {query, search_depth, topic, time_range, max_results, auto_parameters, include_answer, include_raw_content}\n"
        "- tavily.extract: {urls, extract_depth, format, query, chunks_per_source}\n"
        "- tavily.crawl: {url, instructions, max_depth, max_breadth, limit, allow_external, extract_depth, format, chunks_per_source}\n"
        "- tavily.map: {url, max_depth, max_breadth, limit}\n"
        "- tavily.research: {query}\n\n"
        "Rules:\n"
        "- If the user message contains a URL or domain and asks to get latest info from that site, prefer tavily.crawl.\n"
        "- If it's a single page URL to read, prefer tavily.extract.\n"
        "- If it's asking for a sitemap/list of pages, use tavily.map.\n"
        "- If it is time-sensitive news/current events, use tavily.search with topic='news' and time_range='day' or 'week'.\n"
        "- If web is NOT needed, return {\"tool\":\"none\"}.\n\n"
        "Safety constraints (you must respect):\n"
        "- max_results <= 8\n"
        "- crawl: max_depth <= 2, max_breadth <= 25, limit <= 30, allow_external=false\n"
        "- include_raw_content should be 'markdown' when searching/extracting\n"
    )

    messages = [
        {"role": "system", "content": routing_system},
        {"role": "user", "content": user_message},
    ]

    try:
        data = _ollama_chat(
            messages=messages,
            stream=False,
            options={
                "temperature": 0.0,
                "top_p": 0.9,
                "num_predict": 512,
                "num_ctx": 4096,
            },
            timeout=60,
        )
        content = (data.get("message") or {}).get("content") or ""

        # The router is instructed to return pure JSON; still be defensive.
        content = content.strip()
        if content.startswith("```"):
            content = content.strip("`").strip()

        tool_call = json.loads(content) if content else {"tool": "none"}
        if not isinstance(tool_call, dict):
            return {"tool": "none"}
        if "tool" not in tool_call:
            return {"tool": "none"}
        return tool_call
    except Exception as e:
        print(f"[WARN] Web tool routing failed: {e}")
        return {"tool": "none"}