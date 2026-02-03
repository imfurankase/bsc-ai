from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
import json
import re

from .models import Conversation, ChatMessage, Document, ChatAttachment
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    ConversationCreateSerializer,
    ChatMessageSerializer,
    DocumentSerializer,
    DocumentUploadSerializer,
    SendMessageSerializer,
    LinkDocumentSerializer,
    UserSerializer,
    UserRegistrationSerializer,
)
from .ollama_client import get_ai_response_stream
from .document_service import process_document, search_documents
from .web_search import get_web_context

# Import tools if you have them
try:
    from .tools import get_weather, get_stock_price
except ImportError:
    # Fallback if tools module doesn't exist
    def get_weather(city):
        return None
    def get_stock_price(ticker):
        return None


# =============================================================================
# AUTH VIEWS
# =============================================================================

class RegisterView(APIView):
    """
    POST /api/auth/register/
    Register a new user account
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'success': True,
                'message': 'Registration successful',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    """
    GET /api/auth/profile/
    Get current user's profile information
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# =============================================================================
# CONVERSATION VIEWS
# =============================================================================

class ConversationListCreateView(APIView):
    """
    GET  /api/conversations/     - List user's conversations
    POST /api/conversations/     - Create new conversation
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        conversations = Conversation.objects.filter(user=request.user)[:50]
        serializer = ConversationListSerializer(conversations, many=True)
        return Response({
            'success': True,
            'conversations': serializer.data
        })
    
    def post(self, request):
        serializer = ConversationCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            conversation = serializer.save()
            return Response({
                'success': True,
                'conversation': ConversationDetailSerializer(conversation).data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ConversationDetailView(APIView):
    """
    GET    /api/conversations/<id>/  - Get conversation with messages
    DELETE /api/conversations/<id>/  - Delete conversation
    PATCH  /api/conversations/<id>/  - Update conversation (title, etc.)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, conversation_id):
        conversation = get_object_or_404(
            Conversation, id=conversation_id, user=request.user
        )
        serializer = ConversationDetailSerializer(conversation)
        return Response({
            'success': True,
            'conversation': serializer.data
        })
    
    def delete(self, request, conversation_id):
        conversation = get_object_or_404(
            Conversation, id=conversation_id, user=request.user
        )
        conversation.delete()
        return Response({
            'success': True,
            'message': 'Conversation deleted'
        })
    
    def patch(self, request, conversation_id):
        conversation = get_object_or_404(
            Conversation, id=conversation_id, user=request.user
        )
        serializer = ConversationCreateSerializer(
            conversation,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'conversation': ConversationDetailSerializer(conversation).data
            })
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# CHAT / MESSAGING VIEWS
# =============================================================================

class SendMessageView(APIView):
    """
    POST /api/chat/send/              - Send message (creates new conversation)
    POST /api/chat/send/<id>/         - Send message to existing conversation
    
    Returns: Server-Sent Events (SSE) stream
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, conversation_id=None):
        serializer = SendMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        message_text = serializer.validated_data['message']
        chat_type = serializer.validated_data.get('chat_type', 'general')
        
        # Get or create conversation
        if conversation_id:
            conversation = get_object_or_404(
                Conversation, id=conversation_id, user=request.user
            )
        else:
            title = self._generate_chat_title(message_text)
            conversation = Conversation.objects.create(
                user=request.user,
                title=title,
                chat_type=chat_type
            )
        
        # Save user message
        ChatMessage.objects.create(
            conversation=conversation,
            user=request.user,
            is_user_message=True,
            content=message_text
        )
        
        # === STEP 1: Check for tool use ===
        print(f"[DEBUG] Checking tool context for message: '{message_text}'")
        tool_context = self._get_tool_context(message_text)
        print(f"[DEBUG] Tool context result: {tool_context[:100] if tool_context else 'None'}...")
        
        # === STEP 2: Get document context (RAG) ===
        doc_context = self._get_document_context(
            request.user, conversation, message_text, chat_type
        )
        
        # === STEP 3: Combine contexts ===
        final_context = self._combine_contexts(tool_context, doc_context)
        
        # === STEP 4: Build chat history ===
        messages = self._build_chat_history(conversation, message_text, tool_context=tool_context, doc_context=doc_context)
        
        # === STEP 5: Stream response ===
        def event_stream():
            full_response = ""
            try:
                for chunk in get_ai_response_stream(messages, context=final_context):
                    full_response += chunk
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                
                # Save AI response
                ChatMessage.objects.create(
                    conversation=conversation,
                    user=request.user,
                    is_user_message=False,
                    content=full_response
                )
                
                yield f"data: {json.dumps({'done': True, 'conversation_id': conversation.id})}\n\n"
            
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'  # Disable nginx buffering
        return response
    
    def _generate_chat_title(self, message):
        """Generate a smart title from the first message"""
        message = message.strip()
        question_words = ['how', 'what', 'why', 'when', 'where', 'who', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does']
        words = message.lower().split()
        
        if words and words[0] in question_words:
            title_words = message.split()[:8]
        else:
            title_words = message.split()[:7]
        
        title = ' '.join(title_words)
        
        if len(message.split()) > len(title.split()):
            title += '...'
        
        if title:
            title = title[0].upper() + title[1:]
        
        if len(title) > 60:
            title = title[:57] + '...'
        
        return title if title else 'New Chat'
    
    def _get_tool_context(self, message_text):
        """Check for tool use (weather/stock/web search)"""
        tool_context = ""
        lower_msg = message_text.lower()
        
        # Weather detection
        if "weather" in lower_msg:
            city_match = re.search(r"(?:in\s+)([a-zA-Z\s\-']+)", message_text, re.IGNORECASE)
            city = city_match.group(1).strip() if city_match else "Kigali"
            tool_context = get_weather(city) or ""
        
        # Stock detection
        elif "stock" in lower_msg or "$" in message_text or re.search(r'\b[A-Z]{1,5}\b', message_text):
            tickers = re.findall(r'\b([A-Z]{1,5})\b', message_text)
            if tickers:
                tool_context = get_stock_price(tickers[0]) or ""
        
        # Web search detection - expanded keywords for time-sensitive and factual queries
        else:
            search_triggers = [
                # Direct search requests
                'search', 'look up', 'find out', 'google', 'browse',
                # Time-sensitive keywords
                'latest', 'recent', 'current', 'today', 'yesterday', 'this week', 'this month', 'this year',
                '2024', '2025', '2026', '2027',
                # News and events
                'news', 'what is happening', 'what happened', 'update',
                # Sports and competitions
                'winner', 'won', 'champion', 'championship', 'cup', 'tournament', 'match', 'score',
                'afcon', 'world cup', 'premier league', 'champions league',
                # Current facts queries
                'who is the', 'what is the current', 'how much is', 'price of',
                # People in current roles
                'president of', 'ceo of', 'prime minister',
            ]
            
            matched_triggers = [t for t in search_triggers if t in lower_msg]
            print(f"[DEBUG] Web search check - Message: '{lower_msg}', Matched triggers: {matched_triggers}")
            
            if matched_triggers:
                print(f"[DEBUG] Triggering web search for: {message_text}")
                web_context = get_web_context(message_text)
                print(f"[DEBUG] Web context returned: {web_context[:200] if web_context else 'None'}...")
                if web_context:
                    tool_context = f"[Web Search Results - Use this data to answer]:\n{web_context}"
        
        return tool_context
    
    def _get_document_context(self, user, conversation, message_text, chat_type):
        """Get document context via RAG"""
        context = None
        
        if chat_type == 'document' or conversation.chat_type == 'document':
            attachments = ChatAttachment.objects.filter(
                conversation=conversation,
                document__processed=True
            ).select_related('document')
            
            document_ids = [att.document.id for att in attachments]
            
            if document_ids:
                results = search_documents(user.id, message_text, top_k=5)
                results = [r for r in results if r['document_id'] in document_ids]
                
                if results:
                    context_parts = []
                    for result in results:
                        context_parts.append(
                            f"[From: {result['document_title']}]\n{result['content']}\n---"
                        )
                    context = "\n\n".join(context_parts)
                    if len(context) > 1500:
                        context = context[:1500] + "..."
        
        return context
    
    def _combine_contexts(self, tool_context, doc_context):
        """Combine tool and document contexts"""
        final_context = ""
        
        if tool_context and "unavailable" not in tool_context:
            final_context = f"[Real-time Data]: {tool_context}"
        
        if doc_context:
            if final_context:
                final_context += f"\n\n[Document Context]: {doc_context}"
            else:
                final_context = f"[Document Context]: {doc_context}"
        
        return final_context
    
    def _build_chat_history(self, conversation, current_message, tool_context=None, doc_context=None):
        """Build chat history for context"""
        previous_messages = ChatMessage.objects.filter(
            conversation=conversation
        ).order_by('-timestamp')[:4]
        previous_messages = list(reversed(previous_messages))
        
        messages = []
        for msg in previous_messages[:-1]:  # Exclude current message
            role = "user" if msg.is_user_message else "assistant"
            messages.append({"role": role, "content": msg.content})
        
        # Build enhanced message with context
        enhanced_message = current_message
        
        # If we have tool context (like web search results), inject it into the user message
        if tool_context and "[Web Search Results" in tool_context:
            enhanced_message = (
                f"{current_message}\n\n"
                f"[Here are current search results to help answer this question:]\n"
                f"{tool_context}\n\n"
                f"[Use the search results above to answer my question about: {current_message}]"
            )
        # If we have document context (RAG), inject it into the user message
        elif doc_context:
            enhanced_message = (
                f"{current_message}\n\n"
                f"[Here is content from my uploaded documents that is relevant to my question:]\n"
                f"{doc_context[:4000]}\n\n"
                f"[Use the document content above to answer my question: {current_message}]"
            )
        
        messages.append({"role": "user", "content": enhanced_message})
        
        return messages


# =============================================================================
# DOCUMENT VIEWS
# =============================================================================

class DocumentListCreateView(APIView):
    """
    GET  /api/documents/     - List user's documents
    POST /api/documents/     - Upload new document
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        documents = Document.objects.filter(user=request.user)[:50]
        serializer = DocumentSerializer(
            documents, many=True, context={'request': request}
        )
        return Response({
            'success': True,
            'documents': serializer.data
        })
    
    def post(self, request):
        serializer = DocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = serializer.validated_data['document']
        conversation_id = serializer.validated_data.get('conversation_id')
        
        file_name = file.name
        file_type = file_name.split('.')[-1].lower()
        
        # Create document
        document = Document.objects.create(
            user=request.user,
            title=file_name,
            file=file,
            file_type=file_type
        )
        
        # Process document (embeddings)
        success = process_document(document.id)
        
        if not success:
            document.delete()
            return Response({
                'success': False,
                'error': 'Failed to process document'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle conversation linking
        conversation = None
        if conversation_id:
            try:
                conversation = Conversation.objects.get(
                    id=conversation_id, user=request.user
                )
            except Conversation.DoesNotExist:
                conversation = None
        
        # Create new conversation if needed
        if not conversation:
            conversation = Conversation.objects.create(
                user=request.user,
                title=f"Document: {file_name[:30]}",
                chat_type='document'
            )
        
        # Link document to conversation
        ChatAttachment.objects.get_or_create(
            conversation=conversation,
            document=document
        )
        
        # Ensure conversation type is 'document'
        if conversation.chat_type != 'document':
            conversation.chat_type = 'document'
            conversation.save()
        
        return Response({
            'success': True,
            'document': DocumentSerializer(document, context={'request': request}).data,
            'conversation_id': conversation.id
        }, status=status.HTTP_201_CREATED)


class DocumentDetailView(APIView):
    """
    GET    /api/documents/<id>/  - Get document details
    DELETE /api/documents/<id>/  - Delete document
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, document_id):
        document = get_object_or_404(
            Document, id=document_id, user=request.user
        )
        serializer = DocumentSerializer(document, context={'request': request})
        return Response({
            'success': True,
            'document': serializer.data
        })
    
    def delete(self, request, document_id):
        document = get_object_or_404(
            Document, id=document_id, user=request.user
        )
        document.delete()
        return Response({
            'success': True,
            'message': 'Document deleted'
        })


class DocumentStatusView(APIView):
    """
    GET /api/documents/<id>/status/  - Check document processing status
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, document_id):
        document = get_object_or_404(
            Document, id=document_id, user=request.user
        )
        return Response({
            'success': True,
            'document_id': document.id,
            'title': document.title,
            'processed': document.processed
        })


class LinkDocumentView(APIView):
    """
    POST /api/documents/link/  - Link existing document to conversation
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = LinkDocumentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        conversation_id = serializer.validated_data['conversation_id']
        document_id = serializer.validated_data['document_id']
        
        conversation = get_object_or_404(
            Conversation, id=conversation_id, user=request.user
        )
        document = get_object_or_404(
            Document, id=document_id, user=request.user
        )
        
        attachment, created = ChatAttachment.objects.get_or_create(
            conversation=conversation,
            document=document
        )
        
        if conversation.chat_type != 'document':
            conversation.chat_type = 'document'
            conversation.save()
        
        return Response({
            'success': True,
            'created': created,
            'message': 'Document linked' if created else 'Document already linked'
        })


# =============================================================================
# UTILITY VIEWS
# =============================================================================

class HealthCheckView(APIView):
    """
    GET /api/health/  - API health check (no auth required)
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            'status': 'healthy',
            'service': 'BSC AI API',
            'version': '1.0.0'
        })