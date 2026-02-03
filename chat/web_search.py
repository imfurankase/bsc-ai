from ddgs import DDGS 
import requests
from bs4 import BeautifulSoup
import logging
import os
try:
    from tavily import TavilyClient
except ImportError:
    TavilyClient = None

logger = logging.getLogger(__name__)


def search_web(query, max_results=5):
    """
    Search web using Tavily (if key exists) or DuckDuckGo (fallback)
    """
    # 1. Try Tavily API first (Fastest/Best)
    tavily_key = os.getenv("TAVILY_API_KEY")
    if tavily_key and TavilyClient:
        try:
            print(f"[Web Search] Using Tavily API for: {query}")
            tavily = TavilyClient(api_key=tavily_key)
            response = tavily.search(query, search_depth="basic", max_results=max_results)
            
            results = []
            for r in response.get('results', []):
                results.append({
                    'title': r.get('title', ''),
                    'snippet': r.get('content', ''), # Tavily provides good content directly
                    'url': r.get('url', ''),
                    'content': r.get('content', '') # Store rich content
                })
            return results
        except Exception as e:
            logger.error(f"Tavily search failed: {e}")
            print(f"[Web Search] Tavily failed, falling back to DuckDuckGo: {e}")

    # 2. Fallback to DuckDuckGo
    print(f"[Web Search] Using DuckDuckGo fallback for: {query}")
    try:
        with DDGS() as ddgs:
            results = []
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    'title': r.get('title', ''),
                    'snippet': r.get('body', ''),
                    'url': r.get('href', '')
                })
            return results
    except Exception as e:
        logger.error(f"Web search error: {e}")
        return []


import concurrent.futures

def fetch_webpage_content(url, max_chars=6000):
    """
    Fetch and extract main text content from a webpage
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        # Optimized timeouts: 2s connect, 5s read
        response = requests.get(url, headers=headers, timeout=(2, 5))
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header", "aside", "form", "iframe", "ads"]):
            script.decompose()
        
        # Get text
        text = soup.get_text(separator=' ', strip=True)
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        text = ' '.join(line for line in lines if line)
        
        # Truncate if too long
        if len(text) > max_chars:
            text = text[:max_chars] + "..."
        
        return text
    except Exception as e:
        logger.warning(f"Skipping {url}: {e}")
        return ""


def get_web_context(query):
    """
    Search web and fetch content from top results in parallel
    Returns formatted context string
    """
    results = search_web(query, max_results=5)
    
    if not results:
        return None
    
    # If results don't have content (DuckDuckGo), fetch it
    # Tavily usually provides good content in 'content' field via snippet, but we might want more
    
    urls_to_fetch = []
    headers_results = [] # Keep track of results needing fetch
    
    for r in results:
        # If content is missing or too short (DuckDuckGo snippet), add to fetch list
        if not r.get('content') or len(r.get('content', '')) < 200:
            urls_to_fetch.append(r)
    
    # Process necessary fetches in parallel
    if urls_to_fetch:
        print(f"[Web Search] Fetching content for {len(urls_to_fetch)} URLs...")
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor: # Increased workers
            future_to_result = {
                executor.submit(fetch_webpage_content, result['url'], max_chars=6000): result 
                for result in urls_to_fetch[:3] # Limit full scraping to top 3 to be fast
            }
            
            for future in concurrent.futures.as_completed(future_to_result):
                result = future_to_result[future]
                try:
                    page_content = future.result()
                    if page_content:
                        result['content'] = page_content
                except Exception:
                    pass # Keep original snippet/content if fetch fails
            
    context_parts = []
    context_parts.append(f"[Web Search Results for: {query}]\n")
    
    for i, result in enumerate(results, 1):
        context_parts.append(f"\n{i}. {result['title']}")
        # Use content if available (from Tavily or Fetch), else snippet
        content = result.get('content') or result.get('snippet', '')
        
        context_parts.append(f"   Content: {content[:4000]}...") # Limit individual context
        context_parts.append(f"   Source: {result['url']}\n")
    
    return '\n'.join(context_parts)
