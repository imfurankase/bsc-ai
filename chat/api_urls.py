from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from .serializers import EmailOrUsernameTokenSerializer

from .api_views import (
    # Auth
    RegisterView,
    UserProfileView,
    # Conversations
    ConversationListCreateView,
    ConversationDetailView,
    # Chat
    SendMessageView,
    # Documents
    DocumentListCreateView,
    DocumentDetailView,
    DocumentStatusView,
    LinkDocumentView,
    # Utility
    HealthCheckView,
)

app_name = 'api'

urlpatterns = [
    # ==========================================================================
    # Health Check
    # ==========================================================================
    path('health/', HealthCheckView.as_view(), name='health'),
    
    # ==========================================================================
    # Authentication (JWT)
    # ==========================================================================
    # POST /api/auth/login/ - Get access & refresh tokens (supports username OR email)
    path('auth/login/', TokenObtainPairView.as_view(serializer_class=EmailOrUsernameTokenSerializer), name='token_obtain_pair'),
    
    # POST /api/auth/refresh/ - Refresh access token
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # POST /api/auth/verify/ - Verify token validity
    path('auth/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # POST /api/auth/register/ - Register new user
    path('auth/register/', RegisterView.as_view(), name='register'),
    
    # GET /api/auth/profile/ - Get current user profile
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    
    # ==========================================================================
    # Conversations
    # ==========================================================================
    # GET  /api/conversations/     - List conversations
    # POST /api/conversations/     - Create new conversation
    path('conversations/', ConversationListCreateView.as_view(), name='conversation_list'),
    
    # GET    /api/conversations/<id>/  - Get conversation with messages
    # DELETE /api/conversations/<id>/  - Delete conversation
    # PATCH  /api/conversations/<id>/  - Update conversation
    path('conversations/<int:conversation_id>/', ConversationDetailView.as_view(), name='conversation_detail'),
    
    # ==========================================================================
    # Chat / Messaging
    # ==========================================================================
    # POST /api/chat/send/      - Send message (creates new conversation)
    path('chat/send/', SendMessageView.as_view(), name='send_message_new'),
    
    # POST /api/chat/send/<id>/ - Send message to existing conversation
    path('chat/send/<int:conversation_id>/', SendMessageView.as_view(), name='send_message'),
    
    # ==========================================================================
    # Documents
    # ==========================================================================
    # GET  /api/documents/     - List documents
    # POST /api/documents/     - Upload document
    path('documents/', DocumentListCreateView.as_view(), name='document_list'),
    
    # GET    /api/documents/<id>/  - Get document details
    # DELETE /api/documents/<id>/  - Delete document
    path('documents/<int:document_id>/', DocumentDetailView.as_view(), name='document_detail'),
    
    # GET /api/documents/<id>/status/ - Check processing status
    path('documents/<int:document_id>/status/', DocumentStatusView.as_view(), name='document_status'),
    
    # POST /api/documents/link/ - Link document to conversation
    path('documents/link/', LinkDocumentView.as_view(), name='document_link'),
]