import logging
import os
import re
from typing import Optional, Dict, Any, List, Tuple

from tavily import TavilyClient

logger = logging.getLogger(__name__)

# Simple in-memory cache for Tavily contexts
_WEB_CONTEXT_CACHE: Dict[str, str] = {}
_WEB_CONTEXT_CACHE_MAX_SIZE = 512


def _make_cache_key(
    user_id: Optional[int],
    tool: str,
    args: Optional[Dict[str, Any]],
    original_query: str,
) -> str:
    """
    Build a stable cache key: per user (if provided) + tool + sorted args + query.
    """
    uid = str(user_id) if user_id is not None else "anon"
    safe_args = args or {}
    # Sort keys for determinism; fallback to str() if json fails
    try:
        import json

        args_str = json.dumps(safe_args, sort_keys=True, default=str)
    except Exception:
        args_str = str(sorted(safe_args.items()))
    return f"{uid}|{tool}|{original_query.strip()}|{args_str}"


def _get_cached(key: str) -> Optional[str]:
    return _WEB_CONTEXT_CACHE.get(key)


def _set_cached(key: str, value: str) -> None:
    if len(_WEB_CONTEXT_CACHE) >= _WEB_CONTEXT_CACHE_MAX_SIZE:
        # Simple FIFO eviction: pop an arbitrary item
        try:
            _WEB_CONTEXT_CACHE.pop(next(iter(_WEB_CONTEXT_CACHE)))
        except StopIteration:
            pass
    _WEB_CONTEXT_CACHE[key] = value


def _get_tavily_client() -> Optional[TavilyClient]:
    """
    Initialize a Tavily client using the TAVILY_API_KEY environment variable.
    """
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        logger.warning("TAVILY_API_KEY is not set. Web search is disabled.")
        return None
    try:
        return TavilyClient(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to initialize TavilyClient: {e}")
        return None


def _extract_url_from_query(query: str) -> Optional[str]:
    """
    Extract the first URL or bare domain from the query, if present.
    Supports patterns like:
      - https://example.com
      - http://example.com
      - www.example.com
      - example.com
    """
    url_pattern = re.compile(
        r"(https?://[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"
    )
    match = url_pattern.search(query)
    if not match:
        return None

    url = match.group(0)
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    return url


def _format_search_results(query: str, results: List[Dict[str, Any]]) -> str:
    """
    Turn Tavily search/research results into a compact context string.
    """
    if not results:
        return ""

    parts: List[str] = [f"[Web Search Results for: {query}]\n"]

    for i, r in enumerate(results, 1):
        title = r.get("title") or r.get("url") or f"Result {i}"
        # Prefer raw_content when available (include_raw_content)
        content = r.get("raw_content") or r.get("content") or r.get("snippet") or ""
        url = r.get("url") or ""

        parts.append(f"\n{i}. {title}")
        if content:
            parts.append(f"   Content: {content[:4000]}...")
        if url:
            parts.append(f"   Source: {url}\n")

    return "\n".join(parts)


def _format_crawl_results(url: str, crawl_result: Dict[str, Any]) -> str:
    """
    Turn Tavily crawl/map results into a context string.
    The exact response schema can vary, so we handle common patterns defensively.
    """
    parts: List[str] = [f"[Crawled Web Content from: {url}]\n"]

    pages = crawl_result.get("pages") or crawl_result.get("results") or []
    if isinstance(pages, dict):
        pages = [pages]

    for i, page in enumerate(pages, 1):
        title = page.get("title") or page.get("url") or f"Page {i}"
        # Tavily crawl returns raw_content; support other variants defensively.
        content = page.get("raw_content") or page.get("content") or page.get("text") or ""
        page_url = page.get("url") or url

        parts.append(f"\n{i}. {title}")
        if content:
            parts.append(f"   Content: {content[:3500]}...")
        if page_url:
            parts.append(f"   URL: {page_url}\n")

    if len(parts) == 1:
        # Fallback: just dump a compact string of the raw result
        parts.append(str(crawl_result)[:8000])

    return "\n".join(parts)


def _format_extract_result(url: str, extract_result: Dict[str, Any]) -> str:
    """
    Format Tavily extract() response into a context string.
    """
    # Tavily extract typically returns results[] with raw_content. Handle multiple schemas defensively.
    results = extract_result.get("results")
    if isinstance(results, list) and results and isinstance(results[0], dict):
        first = results[0]
        content = (
            first.get("raw_content")
            or first.get("content")
            or first.get("text")
            or ""
        )
    else:
        content = (
            extract_result.get("raw_content")
            or extract_result.get("content")
            or extract_result.get("text")
            or ""
        )

    if not content:
        content = str(extract_result)

    return f"[Extracted Web Page: {url}]\n\n{content[:12000]}"


def _is_news_intent(query_lower: str) -> bool:
    return any(
        kw in query_lower
        for kw in [
            "latest",
            "recent",
            "current",
            "today",
            "yesterday",
            "this week",
            "this month",
            "this year",
            "news",
            "headlines",
            "breaking",
            "update",
        ]
    )


def _is_site_navigation_intent(query_lower: str) -> bool:
    return any(
        kw in query_lower
        for kw in ["go to", "visit", "open", "check", "browse"]
    )


def get_web_context(query: str, user_id: Optional[int] = None) -> Optional[str]:
    """
    Use Tavily at full capacity (search, research, extract, crawl) to build
    a rich context string for a user query.

    - If the query contains a URL / domain (e.g. "go to igihe.com..."):
        - For instructions that mention “crawl”, “map” or “all pages”, we use
          tavily.crawl() with a focused instruction.
        - Otherwise we use tavily.extract() to pull main page content.

    - If the query has no URL:
        - For time-sensitive / open-ended questions, we use tavily.research().
        - Otherwise we use tavily.search() with advanced depth.
    """
    client = _get_tavily_client()
    if not client:
        return None

    query_lower = query.lower()
    url = _extract_url_from_query(query)

    try:
        # Cache key for heuristic context
        cache_key = _make_cache_key(user_id, "heuristic", None, query)
        cached = _get_cached(cache_key)
        if cached is not None:
            return cached
        # 1. URL-specific queries: use map/crawl/extract
        if url:
            # Explicit map/sitemap request: map -> extract top pages
            if any(kw in query_lower for kw in ["map", "site map", "sitemap"]):
                if hasattr(client, "map"):
                    mapped = client.map(
                        url,
                        max_depth=2,
                        max_breadth=20,
                        limit=50,
                        timeout=90,
                    )
                    urls = mapped.get("results") if isinstance(mapped, dict) else None
                    if isinstance(urls, list) and urls:
                        extract_urls = urls[: min(10, len(urls))]
                        extract_result = client.extract(
                            extract_urls,
                            extract_depth="advanced",
                            format="markdown",
                            query=query,
                            chunks_per_source=3,
                            timeout=30,
                        )
                        return (
                            f"[Mapped URLs from: {url}]\n"
                            + "\n".join(f"- {u}" for u in extract_urls)
                            + "\n\n"
                            + _format_extract_result(url, extract_result)
                        )

            # Crawling/site navigation/news intents
            if _is_news_intent(query_lower) or _is_site_navigation_intent(query_lower) or any(
                kw in query_lower for kw in ["crawl", "all pages", "site-wide"]
            ):
                if hasattr(client, "crawl"):
                    crawl_instructions = (
                        "Find the most relevant pages for the user's request. "
                        "If the user asked for latest news/headlines, prioritize the newest headlines and summarize them."
                    )
                    crawl_result = client.crawl(
                        url,
                        instructions=crawl_instructions,
                        max_depth=2,
                        max_breadth=25,
                        limit=30,
                        allow_external=False,
                        extract_depth="advanced",
                        format="markdown",
                        chunks_per_source=3,
                        timeout=120,
                    )
                    return _format_crawl_results(url, crawl_result)

            # Default: extract a single page with advanced extraction
            extract_result = client.extract(
                url,
                extract_depth="advanced",
                format="markdown",
                query=query,
                chunks_per_source=3,
                timeout=30,
            )
            context = _format_extract_result(url, extract_result)
            _set_cached(cache_key, context)
            return context

        # 2. No URL: use research() for broad/time-sensitive queries, fallback to search()
        if _is_news_intent(query_lower) or any(kw in query_lower for kw in ["developments", "trends"]):
            if hasattr(client, "research"):
                research_result = client.research(query)
                answer = (
                    research_result.get("answer")
                    or research_result.get("summary")
                    or str(research_result)
                )
                sources = research_result.get("sources") or []

                parts: List[str] = [f"[Web Research for: {query}]\n", str(answer)[:10000]]

                if sources:
                    parts.append("\n\nSources:")
                    for i, src in enumerate(sources, 1):
                        s_url = src.get("url") or ""
                        title = src.get("title") or s_url or f"Source {i}"
                        parts.append(f"- {title} ({s_url})")
                context = "\n".join(parts)
                _set_cached(cache_key, context)
                return context

            search_result = client.search(
                query,
                topic="news" if "news" in query_lower else "general",
                time_range="day" if any(k in query_lower for k in ["today", "latest", "breaking"]) else "week",
                search_depth="advanced",
                auto_parameters=True,
                include_answer="advanced",
                include_raw_content="markdown",
                max_results=8,
            )
            answer = search_result.get("answer")
            results = search_result.get("results", [])
            context = _format_search_results(query, results)
            if answer:
                context = f"[Tavily Answer]\n{answer}\n\n" + context
            _set_cached(cache_key, context)
            return context

        # 3. Fallback: use search() for more targeted factual queries
        search_result = client.search(
            query,
            search_depth="advanced",
            auto_parameters=True,
            include_raw_content="markdown",
            include_answer="basic",
            max_results=6,
        )
        results = search_result.get("results", [])
        answer = search_result.get("answer")
        context = _format_search_results(query, results)
        if answer:
            context = f"[Tavily Answer]\n{answer}\n\n" + context
        _set_cached(cache_key, context)
        return context

    except Exception as e:
        logger.error(f"Tavily web context error for query '{query}': {e}")
        return None


def execute_web_tool_call(
    tool_call: Dict[str, Any],
    original_query: str,
    user_id: Optional[int] = None,
) -> Optional[str]:
    """
    Execute a model-produced Tavily tool call and return formatted context text.

    Expected tool_call:
      {"tool":"none"} OR {"tool":"tavily.search|tavily.extract|tavily.crawl|tavily.map|tavily.research", "args": {...}}
    """
    if not isinstance(tool_call, dict):
        return None

    tool = tool_call.get("tool")
    args = tool_call.get("args") or {}
    if tool in (None, "", "none"):
        return None

    client = _get_tavily_client()
    if not client:
        return None

    try:
        cache_key = _make_cache_key(user_id, tool, args, original_query)
        cached = _get_cached(cache_key)
        if cached is not None:
            return cached

        if tool == "tavily.search":
            query = args.get("query") or original_query
            max_results = int(args.get("max_results") or 6)
            max_results = max(1, min(max_results, 8))
            search_result = client.search(
                query,
                search_depth=args.get("search_depth") or "advanced",
                topic=args.get("topic") or ("news" if "news" in query.lower() else "general"),
                time_range=args.get("time_range"),
                auto_parameters=bool(args.get("auto_parameters", True)),
                include_answer=args.get("include_answer") or "basic",
                include_raw_content=args.get("include_raw_content") or "markdown",
                max_results=max_results,
            )
            answer = search_result.get("answer")
            results = search_result.get("results", [])
            context = _format_search_results(query, results)
            if answer:
                context = f"[Tavily Answer]\n{answer}\n\n" + context
            _set_cached(cache_key, context)
            return context

        if tool == "tavily.research":
            query = args.get("query") or original_query
            research_result = client.research(query)
            answer = (
                research_result.get("answer")
                or research_result.get("summary")
                or str(research_result)
            )
            sources = research_result.get("sources") or []
            parts: List[str] = [f"[Web Research for: {query}]\n", str(answer)[:10000]]
            if sources:
                parts.append("\n\nSources:")
                for i, src in enumerate(sources, 1):
                    s_url = src.get("url") or ""
                    title = src.get("title") or s_url or f"Source {i}"
                    parts.append(f"- {title} ({s_url})")
            context = "\n".join(parts)
            _set_cached(cache_key, context)
            return context

        if tool == "tavily.extract":
            urls = args.get("urls")
            if not urls:
                # try to extract a URL from the original query
                urls = _extract_url_from_query(original_query)
            extract_result = client.extract(
                urls,
                extract_depth=args.get("extract_depth") or "advanced",
                format=args.get("format") or "markdown",
                query=args.get("query") or original_query,
                chunks_per_source=int(args.get("chunks_per_source") or 3),
                timeout=30,
            )
            context = _format_extract_result(str(urls), extract_result)
            _set_cached(cache_key, context)
            return context

        if tool == "tavily.map":
            url = args.get("url") or _extract_url_from_query(original_query)
            if not url:
                return None
            mapped = client.map(
                url,
                max_depth=int(args.get("max_depth") or 2),
                max_breadth=int(args.get("max_breadth") or 20),
                limit=int(args.get("limit") or 50),
                timeout=90,
            )
            urls = mapped.get("results") if isinstance(mapped, dict) else None
            if isinstance(urls, list) and urls:
                context = "[Mapped URLs]\n" + "\n".join(f"- {u}" for u in urls[:50])
            else:
                context = str(mapped)[:12000]
            _set_cached(cache_key, context)
            return context

        if tool == "tavily.crawl":
            url = args.get("url") or _extract_url_from_query(original_query)
            if not url:
                return None
            crawl_result = client.crawl(
                url,
                instructions=args.get("instructions") or original_query,
                max_depth=min(int(args.get("max_depth") or 2), 2),
                max_breadth=min(int(args.get("max_breadth") or 25), 25),
                limit=min(int(args.get("limit") or 30), 30),
                allow_external=False,
                extract_depth=args.get("extract_depth") or "advanced",
                format=args.get("format") or "markdown",
                chunks_per_source=min(int(args.get("chunks_per_source") or 3), 5),
                timeout=120,
            )
            context = _format_crawl_results(url, crawl_result)
            _set_cached(cache_key, context)
            return context

        return None
    except Exception as e:
        logger.error(f"Failed to execute web tool call {tool_call}: {e}")
        return None
