from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Conversation, ChatMessage, Document, DocumentChunk, ChatAttachment


class EmailOrUsernameTokenSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that allows login with either username or email.
    The 'username' field can contain either the username or email address.
    """
    def validate(self, attrs):
        username_or_email = attrs.get('username', '')
        password = attrs.get('password', '')

        # Check if input is an email
        if '@' in username_or_email:
            try:
                user = User.objects.get(email__iexact=username_or_email)
                username = user.username
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    'detail': 'No account found with this email address.'
                })
        else:
            username = username_or_email

        # Authenticate user
        user = authenticate(username=username, password=password)
        
        if user is None:
            raise serializers.ValidationError({
                'detail': 'Invalid credentials. Please check your username/email and password.'
            })
        
        if not user.is_active:
            raise serializers.ValidationError({
                'detail': 'This account has been disabled.'
            })

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user info (limited fields for security)"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = fields


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for individual chat messages"""
    class Meta:
        model = ChatMessage
        fields = ['id', 'is_user_message', 'content', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for documents"""
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = ['id', 'title', 'file_type', 'uploaded_at', 'processed', 'file_url']
        read_only_fields = ['id', 'uploaded_at', 'processed', 'file_type', 'file_url']
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class DocumentUploadSerializer(serializers.Serializer):
    """Serializer for document upload validation"""
    document = serializers.FileField()
    conversation_id = serializers.IntegerField(required=False, allow_null=True)
    
    # Supported file types
    # Note: also supports tabular formats (csv, xlsx, xls) for spreadsheet handling
    ALLOWED_DOCUMENTS = ['pdf', 'docx', 'txt', 'csv', 'xlsx', 'xls']
    ALLOWED_IMAGES = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    
    def validate_document(self, value):
        # Get file extension
        file_name = value.name
        file_type = file_name.split('.')[-1].lower()
        
        all_allowed = self.ALLOWED_DOCUMENTS + self.ALLOWED_IMAGES
        
        if file_type not in all_allowed:
            raise serializers.ValidationError(
                "Unsupported file type. Please upload PDF, DOCX, TXT, CSV, Excel files (XLSX/XLS), "
                "or image files (JPG, PNG, GIF, WebP)."
            )
        
        # Check file size (10MB for docs, 20MB for images)
        max_size = 20 * 1024 * 1024 if file_type in self.ALLOWED_IMAGES else 10 * 1024 * 1024
        if value.size > max_size:
            max_mb = max_size // (1024 * 1024)
            raise serializers.ValidationError(
                f"File too large. Maximum size is {max_mb}MB."
            )
        
        return value


class ChatAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for document attachments in conversations"""
    document = DocumentSerializer(read_only=True)
    
    class Meta:
        model = ChatAttachment
        fields = ['id', 'document', 'uploaded_at']
        read_only_fields = fields


class ConversationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for conversation list (without messages)"""
    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'title', 'chat_type', 'created_at', 'updated_at', 'message_count', 'last_message']
        read_only_fields = fields
    
    def get_message_count(self, obj):
        return obj.messages.count()
    
    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-timestamp').first()
        if last_msg:
            return {
                'content': last_msg.content[:100] + '...' if len(last_msg.content) > 100 else last_msg.content,
                'is_user_message': last_msg.is_user_message,
                'timestamp': last_msg.timestamp
            }
        return None


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Full serializer for conversation detail (with messages and attachments)"""
    messages = ChatMessageSerializer(many=True, read_only=True)
    attachments = ChatAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = ['id', 'title', 'chat_type', 'created_at', 'updated_at', 'messages', 'attachments']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ConversationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new conversations"""
    class Meta:
        model = Conversation
        fields = ['id', 'title', 'chat_type']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        if not validated_data.get('title'):
            validated_data['title'] = 'New Chat'
        return super().create(validated_data)


class SendMessageSerializer(serializers.Serializer):
    """Serializer for sending chat messages"""
    message = serializers.CharField(max_length=10000, required=True)
    chat_type = serializers.ChoiceField(
        choices=['general', 'document'],
        default='general',
        required=False
    )
    
    def validate_message(self, value):
        if not value.strip():
            raise serializers.ValidationError("Message cannot be empty.")
        return value.strip()


class LinkDocumentSerializer(serializers.Serializer):
    """Serializer for linking documents to conversations"""
    conversation_id = serializers.IntegerField()
    document_id = serializers.IntegerField()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user