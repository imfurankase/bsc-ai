import os
from PyPDF2 import PdfReader
from docx import Document as DocxDocument
from sentence_transformers import SentenceTransformer
from .models import Document, DocumentChunk
import logging
from typing import Dict, Any, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)

# Initialize Sentence Transformer (Standard MiniLM)
# Robust, fast, and compatible with all versions
MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2'

embedding_model = SentenceTransformer(
    MODEL_NAME,
    device='cpu',  # Explicitly use CPU to reserve VRAM for Llama 3.3
)


def extract_text_from_file(file_path, file_type):
    """
    Extract text from uploaded file with error handling.

    For tabular files (CSV/Excel), we generate a concise textual summary that
    describes the table structure and includes a small sample of rows. This
    summary is what gets chunked and embedded for RAG, while more detailed
    tabular access is handled via helper functions below.
    """
    text = ""
    
    # Image file types - store as-is with descriptive text
    image_types = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    tabular_types = ['csv', 'xlsx', 'xls']
    
    try:
        if file_type == 'pdf':
            reader = PdfReader(file_path)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        elif file_type == 'docx':
            doc = DocxDocument(file_path)
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text += paragraph.text + "\n"
        elif file_type == 'txt':
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        elif file_type in image_types:
            # For images, create a descriptive placeholder
            # In the future, this could be enhanced with OCR or vision models
            import os
            filename = os.path.basename(file_path)
            text = (
                f"[Image: {filename}] - This is an uploaded image file. "
                f"The image content can be viewed in the chat interface."
            )
        elif file_type in tabular_types:
            # For CSV/Excel, create a structured summary for RAG
            df = _load_tabular_file(file_path, file_type)
            if df is not None and not df.empty:
                # Basic metadata
                text_lines = []
                text_lines.append(
                    f"[Tabular Data Summary] Rows: {len(df)}, Columns: {len(df.columns)}"
                )
                text_lines.append(f"Columns: {', '.join(map(str, df.columns))}")
                
                # Include a small sample of rows as CSV-like text
                preview_rows = min(10, len(df))
                preview_df = df.head(preview_rows)
                text_lines.append(
                    "Sample rows (first "
                    f"{preview_rows}):\n" + preview_df.to_csv(index=False)
                )
                text = "\n".join(text_lines)
            else:
                text = "[Tabular Data] Empty or unreadable table."
    except Exception as e:
        logger.error(f"Text extraction failed for {file_path}: {e}")
        text = ""
    return text


def _load_tabular_file(file_path: str, file_type: str, max_rows: int = 500) -> "pd.DataFrame | None":
    """
    Load a CSV or Excel file into a pandas DataFrame with basic safeguards.
    """
    try:
        if file_type == 'csv':
            df = pd.read_csv(file_path, nrows=max_rows)
        else:
            # xlsx or xls
            df = pd.read_excel(file_path, nrows=max_rows)
        return df
    except Exception as e:
        logger.error(f"Failed to load tabular file {file_path}: {e}")
        return None


def get_tabular_preview(document: Document, max_rows: int = 50) -> Dict[str, Any]:
    """
    Return a lightweight preview of a tabular document (CSV/Excel).

    The preview is safe to send to the frontend for rendering a small table
    or driving simple in-chat charting.
    """
    if document.file_type not in ('csv', 'xlsx', 'xls'):
        raise ValueError("Document is not a supported tabular type.")
    
    df = _load_tabular_file(document.file.path, document.file_type, max_rows=max_rows)
    if df is None:
        return {
            "columns": [],
            "rows": [],
            "row_count": 0,
            "column_count": 0,
            "dtypes": {},
        }
    
    # Convert to serializable structures
    preview_rows = min(max_rows, len(df))
    preview_df = df.head(preview_rows)
    
    rows: List[Dict[str, Any]] = []
    for _, row in preview_df.iterrows():
        # Cast to basic Python types
        row_dict: Dict[str, Any] = {}
        for col in df.columns:
            value = row[col]
            # Convert numpy / pandas dtypes to Python primitives
            if pd.isna(value):
                row_dict[str(col)] = None
            else:
                row_dict[str(col)] = value.item() if hasattr(value, "item") else value
        rows.append(row_dict)
    
    dtypes = {str(col): str(dtype) for col, dtype in df.dtypes.items()}
    
    return {
        "columns": [str(c) for c in df.columns],
        "rows": rows,
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "dtypes": dtypes,
    }


def build_default_chart_from_preview(preview: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Build a simple, multi-series chart configuration from a tabular preview.

    This is intentionally generic so it can be reused by any part of the
    backend that needs to send chart-ready data (e.g. chat responses).
    """
    columns: List[str] = preview.get("columns") or []
    rows: List[Dict[str, Any]] = preview.get("rows") or []
    dtypes: Dict[str, str] = preview.get("dtypes") or {}

    if not columns or not rows:
        return None

    # Choose X axis as the first column by default
    x_key = columns[0]

    # Choose up to 3 numeric columns as Y series (excluding X)
    numeric_keys: List[str] = []
    for col in columns:
        if col == x_key:
            continue
        dtype = dtypes.get(col, "").lower()
        if any(t in dtype for t in ("int", "float", "double", "number")):
            numeric_keys.append(col)
        else:
            # Fallback: inspect a few sample values
            for row in rows[:20]:
                val = row.get(col)
                if isinstance(val, (int, float)):
                    numeric_keys.append(col)
                    break
                if isinstance(val, str):
                    try:
                        float(val)
                        numeric_keys.append(col)
                        break
                    except (TypeError, ValueError):
                        continue

    if not numeric_keys:
        return None

    y_keys = numeric_keys[:3]

    return {
        "type": "line",
        "x_key": x_key,
        "y_keys": y_keys,
        "rows": rows,
    }


def chunk_text(text, chunk_size=500, overlap=50):
    """Split text into overlapping chunks, skipping empty ones"""
    words = text.split()
    chunks = []
    step = chunk_size - overlap
    for i in range(0, len(words), step):
        chunk = ' '.join(words[i:i + chunk_size])
        if chunk.strip():  # Skip empty chunks
            chunks.append(chunk)
    return chunks


def process_document(document_id):
    """Process uploaded document: extract, chunk, embed"""
    try:
        doc = Document.objects.get(id=document_id)
        text = extract_text_from_file(doc.file.path, doc.file_type)
        chunks = chunk_text(text)

        for i, chunk in enumerate(chunks):
            # MiniLM: Normalize for cosine similarity
            embedding = embedding_model.encode(
                chunk,
                normalize_embeddings=True
            ).tolist()

            DocumentChunk.objects.create(
                document=doc,
                content=chunk,
                chunk_index=i,
                embedding=embedding
            )

        doc.processed = True
        doc.save()
        return True

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {e}")
        return False


def search_documents(user_id, query, top_k=3):
    """Search using Jina v2 embeddings (normalized)"""
    try:
        # Jina v2: normalize query embedding too
        query_embedding = embedding_model.encode(
            query,
            normalize_embeddings=True
        ).tolist()

        chunks = DocumentChunk.objects.filter(
            document__user_id=user_id,
            document__processed=True
        ).select_related('document')

        if not chunks.exists():
            return []

        from numpy import dot  # Cosine similarity = dot product (since normalized)

        results = []
        for chunk in chunks:
            if chunk.embedding:
                # Safety check: Skip chunks with wrong dimension (from previous model)
                if len(chunk.embedding) != len(query_embedding):
                    continue
                    
                similarity = dot(query_embedding, chunk.embedding)  # Already normalized
                results.append({
                    'document_id': chunk.document.id,
                    'document_title': chunk.document.title,
                    'content': chunk.content,
                    'score': float(similarity)
                })

        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:top_k]

    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        return []
