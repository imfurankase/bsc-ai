from celery import shared_task
from .ollama_client import get_ai_response
from .models import ChatMessage

@shared_task
def process_ai_response(user_id, message_id, messages):
    """Process AI response in background"""
    ai_response = get_ai_response(messages)
    
    # Save AI response
    ChatMessage.objects.create(
        user_id=user_id,
        is_user_message=False,
        content=ai_response
    )
    
    return ai_response
