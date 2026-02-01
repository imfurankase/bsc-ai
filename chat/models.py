from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Conversation(models.Model):
    """Represents a chat session"""
    CHAT_TYPE_CHOICES = [
        ('general', 'General Chat'),
        ('document', 'Document Chat'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)  # Auto-generated from first message
    chat_type = models.CharField(max_length=20, choices=CHAT_TYPE_CHOICES, default='general')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"


class ChatMessage(models.Model):
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    is_user_message = models.BooleanField()
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{'User' if self.is_user_message else 'AI'}: {self.content[:50]}"


class Document(models.Model):
    """Uploaded documents for RAG"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/%Y/%m/%d/')
    file_type = models.CharField(max_length=10)  # pdf, docx, txt
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)  # Whether embeddings are created
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"


class DocumentChunk(models.Model):
    """Text chunks from documents with embeddings for RAG"""
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    content = models.TextField()  # Chunk of text
    chunk_index = models.IntegerField()  # Position in document
    embedding = models.JSONField(null=True, blank=True)  # Store embedding vector
    
    class Meta:
        ordering = ['document', 'chunk_index']
    
    def __str__(self):
        return f"{self.document.title} - Chunk {self.chunk_index}"


class ChatAttachment(models.Model):
    """Files attached to chat messages - links documents to conversations"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='attachments')
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['uploaded_at']
    
    def __str__(self):
        return f"{self.document.title} in {self.conversation.title}"