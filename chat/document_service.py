import os
from PyPDF2 import PdfReader
from docx import Document as DocxDocument
from sentence_transformers import SentenceTransformer
from .models import Document, DocumentChunk
import logging

logger = logging.getLogger(__name__)

# Initialize Jina Embeddings v2 Base (loaded from local path)
# Jina v2 requires normalize_embeddings=True for cosine similarity
# Construct path to jina_emb relative to this file
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(PROJECT_ROOT, 'jina_emb')

embedding_model = SentenceTransformer(
    MODEL_PATH,
    device='cpu'  # Explicitly use CPU to reserve VRAM for Llama 3.3
)


def extract_text_from_file(file_path, file_type):
    """Extract text from uploaded file with error handling"""
    text = ""
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
    except Exception as e:
        logger.error(f"Text extraction failed for {file_path}: {e}")
        text = ""
    return text


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
            # Jina v2: MUST use normalize_embeddings=True
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
