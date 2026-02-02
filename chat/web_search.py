from ddgs import DDGS 
import requests
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)


def search_web(query, max_results=3):
    """
    Search the web using DuckDuckGo and return results
    """
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

def fetch_webpage_content(url, max_chars=2000):
    """
    Fetch and extract main text content from a webpage
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        # Reduced timeout to 3s for speed
        response = requests.get(url, headers=headers, timeout=3)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
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
    results = search_web(query, max_results=3)
    
    if not results:
        return None
    
    # Process results in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        # Submit fetch tasks for top 2 results only to save time
        future_to_url = {
            executor.submit(fetch_webpage_content, result['url'], max_chars=1500): result 
            for result in results[:2]
        }
        
        processed_results = []
        for future in concurrent.futures.as_completed(future_to_url):
            result = future_to_url[future]
            try:
                page_content = future.result()
                # Store content back in result object
                result['content'] = page_content
            except Exception:
                result['content'] = ""
            processed_results.append(result)
            
    # Sort back to original order (approximation, or just append non-fetched)
    # Actually, let's just use the original list and map content
    
    context_parts = []
    context_parts.append(f"[Web Search Results for: {query}]\n")
    
    for i, result in enumerate(results, 1):
        context_parts.append(f"\n{i}. {result['title']}")
        context_parts.append(f"   {result['snippet']}")
        
        # Add content if we fetched it (only for top 2)
        if 'content' in result and result['content']:
            context_parts.append(f"   Content: {result['content'][:800]}...")
        
        context_parts.append(f"   Source: {result['url']}\n")
    
    return '\n'.join(context_parts)
