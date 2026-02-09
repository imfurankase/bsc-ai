from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Conversation, ChatMessage, Document, DocumentChunk, ChatAttachment 
from .ollama_client import get_ai_response_stream
from .document_service import process_document, search_documents
import json
import time
import re
from .tools import get_weather, get_stock_price
from .web_search import get_web_context

@login_required
def chat_view(request, conversation_id=None):
    conversations = Conversation.objects.filter(user=request.user)[:20]
    documents = Document.objects.filter(user=request.user)[:20]
    
    current_conversation = None
    messages = []
    conversation_documents = []
    
    if conversation_id:
        try:
            current_conversation = Conversation.objects.get(id=conversation_id, user=request.user)
            messages = ChatMessage.objects.filter(conversation=current_conversation)
            
            # Get documents attached to this conversation
            try:
                attachments = ChatAttachment.objects.filter(conversation=current_conversation).select_related('document')
                # Clean document titles to avoid encoding issues
                for att in attachments:
                    doc = att.document
                    try:
                        doc.title = doc.title.encode('utf-8', errors='ignore').decode('utf-8')
                    except:
                        doc.title = "Document"
                    conversation_documents.append(doc)
            except Exception as e:
                print(f"Error loading conversation documents: {e}")
                conversation_documents = []
            
        except Conversation.DoesNotExist:
            pass
        except Exception as e:
            print(f"Error loading conversation: {e}")
    
    return render(request, 'chat/ch3.html', {
        'conversations': conversations,
        'documents': documents,
        'current_conversation': current_conversation,
        'messages': messages,
        'conversation_documents': conversation_documents,
    })


@login_required
@require_http_methods(["POST"])
def send_message(request, conversation_id=None):
    message_text = request.POST.get('message', '').strip()
    chat_type = request.POST.get('chat_type', 'general')

    if not message_text:
        return JsonResponse({'error': 'Message cannot be empty'}, status=400)

    # Get or create conversation
    if conversation_id:
        try:
            conversation = Conversation.objects.get(id=conversation_id, user=request.user)
        except Conversation.DoesNotExist:
            return JsonResponse({'error': 'Conversation not found'}, status=404)
    else:
        title = generate_chat_title(message_text)
        conversation = Conversation.objects.create(
            user=request.user,
            title=title,
            chat_type=chat_type
        )

    # Save user message
    user_message = ChatMessage.objects.create(
        conversation=conversation,
        user=request.user,
        is_user_message=True,
        content=message_text
    )

    # === STEP 1: Check for tool use (weather/stock) ===
    tool_context = ""
    lower_msg = message_text.lower()

    # Weather detection
    if "weather" in lower_msg:
        city_match = re.search(r"(?:in\s+)([a-zA-Z\s\-']+)", message_text, re.IGNORECASE)
        city = city_match.group(1).strip() if city_match else "Kigali"
        tool_context = get_weather(city)

    # Stock detection
    elif "stock" in lower_msg or "$" in message_text or re.search(r'\b[A-Z]{1,5}\b', message_text):
        tickers = re.findall(r'\b([A-Z]{1,5})\b', message_text)
        if tickers:
            tool_context = get_stock_price(tickers[0])


    # Web search detection - trigger on specific keywords
    elif any(keyword in lower_msg for keyword in ['search', 'latest', 'recent', 'news', 'current', 'today', 'what is happening', 'browse']):
        web_context = get_web_context(message_text)
        if web_context:
            tool_context = f"[Web Search]: {web_context}"


    # === STEP 2: Get document context (RAG) ===
    context = None
    if chat_type == 'document' or conversation.chat_type == 'document':
        attachments = ChatAttachment.objects.filter(
            conversation=conversation,
            document__processed=True  # ← Only processed docs
        ).select_related('document')
        document_ids = [att.document.id for att in attachments]

        if document_ids:
            results = search_documents(request.user.id, message_text, top_k=5)
            results = [r for r in results if r['document_id'] in document_ids]

            if results:
                context_parts = []
                for result in results:
                    context_parts.append(f"[From: {result['document_title']}]\n{result['content']}\n---")
                context = "\n\n".join(context_parts)
                if len(context) > 12000:
                    context = context[:12000] + "..."

    # === STEP 3: Combine contexts ===
    final_context = ""
    if tool_context and "unavailable" not in tool_context:
        final_context = f"[Real-time Data]: {tool_context}"
    if context:
        if final_context:
            final_context += f"\n\n[Document Context]: {context}"
        else:
            final_context = f"[Document Context]: {context}"

    # === STEP 4: Build chat history ===
    previous_messages = ChatMessage.objects.filter(conversation=conversation).order_by('-timestamp')[:4]
    previous_messages = list(reversed(previous_messages))

    messages = []
    for msg in previous_messages[:-1]:  # Exclude current message
        role = "user" if msg.is_user_message else "assistant"
        messages.append({"role": role, "content": msg.content})
    messages.append({"role": "user", "content": message_text})


    # === STEP 5: Stream response ===
    def event_stream():
        full_response = ""
        try:
            for chunk in get_ai_response_stream(messages, context=final_context):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"  # ✅ CORRECT - added "data:"

            ChatMessage.objects.create(
                conversation=conversation,
                user=request.user,
                is_user_message=False,
                content=full_response
            )
            yield f"data: {json.dumps({'done': True, 'conversation_id': conversation.id})}\n\n"  # ✅ CORRECT

        except Exception as e:
            print(f"ERROR in event_stream: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"  # ✅ CORRECT


    return StreamingHttpResponse(event_stream(), content_type='text/event-stream')



def generate_chat_title(message):
    """Generate a smart title from the first message (fallback method)"""
    message = message.strip()
    
    question_words = ['how', 'what', 'why', 'when', 'where', 'who', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does']
    words = message.lower().split()
    
    if words and words[0] in question_words:
        title_words = message.split()[:8]
        title = ' '.join(title_words)
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


@login_required
@require_http_methods(["POST"])
def new_conversation(request):
    """Create a new conversation"""
    chat_type = request.POST.get("chat_type", "general")
    
    conversation = Conversation.objects.create(
        user=request.user,
        title="New Chat",
        chat_type=chat_type
    )
    
    return JsonResponse({
        'success': True,
        'conversation_id': None
    })


@login_required
@require_http_methods(["POST"])
def upload_document(request):
    """Handle document upload"""
    if 'document' not in request.FILES:
        return JsonResponse({'error': 'No file uploaded'}, status=400)
    
    file = request.FILES['document']
    file_name = file.name
    file_type = file_name.split('.')[-1].lower()
    
    if file_type not in ['pdf', 'docx', 'txt']:
        return JsonResponse({'error': 'Unsupported file type'}, status=400)
    
    # Save document
    document = Document.objects.create(
        user=request.user,
        title=file_name,
        file=file,
        file_type=file_type
    )
    
    # Process document in background
    process_document(document.id)
    
    return JsonResponse({
        'success': True,
        'document_id': document.id,
        'title': document.title
    })


@login_required
@require_http_methods(["POST"])
def upload_inline_document(request):
    """Handle document upload inline in chat creates conversation if needed"""
    if 'document' not in request.FILES:
        return JsonResponse({'error': 'No file uploaded'}, status=400)
    
    conversation_id = request.POST.get('conversation_id')
    file = request.FILES['document']
    file_name = file.name
    file_type = file_name.split('.')[-1].lower()
    
    if file_type not in ['pdf', 'docx', 'txt']:
        return JsonResponse({'error': 'Unsupported file type. Please upload PDF, DOCX, or TXT'}, status=400)
    
    # Save document
    document = Document.objects.create(
        user=request.user,
        title=file_name,
        file=file,
        file_type=file_type
    )
    
    # Process document
    success = process_document(document.id)
    
    if not success:
        document.delete()
        return JsonResponse({'error': 'Failed to process document'}, status=400)
    
    # Ensure we have a conversation
    if conversation_id:
        try:
            conversation = Conversation.objects.get(id=conversation_id, user=request.user)
        except Conversation.DoesNotExist:
            # Fallback: create new conversation if invalid ID provided
            conversation = None
    else:
        conversation = None

    # If no valid conversation, create a new document chat
    if not conversation:
        conversation = Conversation.objects.create(
            user=request.user,
            title="Document Chat",
            chat_type='document'
        )
        print(f"DEBUG: Created new conversation {conversation.id} for inline document upload")

    # Link document to conversation (avoid duplicates)
    attachment, created = ChatAttachment.objects.get_or_create(
        conversation=conversation,
        document=document
    )
    
    # Ensure conversation is marked as 'document' type
    if conversation.chat_type != 'document':
        conversation.chat_type = 'document'
        conversation.save()

    print(f"DEBUG: {'Created' if created else 'Found existing'} link: document {document.id} ? conversation {conversation.id}")
    
    return JsonResponse({
        'success': True,
        'document_id': document.id,
        'title': document.title,
        'file_type': document.file_type,
        'processed': document.processed,
        'conversation_id': conversation.id  # ? Critical: send back to frontend!
    })



@login_required
def document_status(request, document_id):
    """Check if a document has finished processing"""
    doc = get_object_or_404(Document, id=document_id, user=request.user)
    return JsonResponse({
        'processed': doc.processed,
        'title': doc.title
    })


@login_required
@require_http_methods(["POST"])
def delete_conversation(request, conversation_id):
    """Delete a conversation"""
    conversation = get_object_or_404(Conversation, id=conversation_id, user=request.user)
    conversation.delete()
    
    return JsonResponse({'success': True})


@login_required
@require_http_methods(["POST"])
def delete_document(request, document_id):
    """Delete a document"""
    document = get_object_or_404(Document, id=document_id, user=request.user)
    document.delete()
    
    return JsonResponse({'success': True})


@login_required
def test_stream(request):
    """Test if streaming works at all"""
    def generate():
        words = ["Hello", "this", "is", "a", "streaming", "test"]
        for word in words:
            yield f"data: {word}\n\n"
            time.sleep(0.5)
    
    return StreamingHttpResponse(generate(), content_type='text/event-stream')

@login_required
@require_http_methods(["POST"])
def link_document_to_conversation(request):
    """Link an existing document to a conversation"""
    conversation_id = request.POST.get('conversation_id')
    document_id = request.POST.get('document_id')
    
    if not conversation_id or not document_id:
        return JsonResponse({'error': 'Missing parameters'}, status=400)
    
    try:
        conversation = Conversation.objects.get(id=conversation_id, user=request.user)
        document = Document.objects.get(id=document_id, user=request.user)
        
        # Create the attachment if it doesn't exist
        attachment, created = ChatAttachment.objects.get_or_create(
            conversation=conversation,
            document=document
        )
        
        # Update conversation type to document
        if conversation.chat_type != 'document':
            conversation.chat_type = 'document'
            conversation.save()
        
        print(f"DEBUG: {'Created' if created else 'Found existing'} link between document {document_id} and conversation {conversation_id}")
        
        return JsonResponse({
            'success': True,
            'created': created
        })
        
    except (Conversation.DoesNotExist, Document.DoesNotExist) as e:
        return JsonResponse({'error': str(e)}, status=404)
