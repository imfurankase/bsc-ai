from django.contrib import admin
from .models import Conversation, ChatMessage, Document, DocumentChunk, ChatAttachment

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'chat_type', 'created_at', 'updated_at']
    list_filter = ['chat_type', 'created_at']
    search_fields = ['title', 'user__username']

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['conversation', 'user', 'is_user_message', 'timestamp']
    list_filter = ['is_user_message', 'timestamp']
    search_fields = ['content', 'user__username']

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'file_type', 'processed', 'uploaded_at']
    list_filter = ['file_type', 'processed', 'uploaded_at']
    search_fields = ['title', 'user__username']

@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ['document', 'chunk_index']
    list_filter = ['document']
    

admin.site.register(ChatAttachment)