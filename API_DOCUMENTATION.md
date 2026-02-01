# BSC AI - API Documentation for React Frontend

## Overview

This API provides RESTful endpoints for the BSC AI chat application. Authentication is handled via JWT (JSON Web Tokens).

**Base URL:** `/api/`

---

## Authentication

### Login (Get JWT Tokens)

```
POST /api/auth/login/
```

**Request Body:**
```json
{
    "username": "johndoe",
    "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Usage:**
- Store `access` token (valid 1 hour)
- Store `refresh` token (valid 7 days)
- Include in requests: `Authorization: Bearer <access_token>`

---

### Refresh Access Token

```
POST /api/auth/refresh/
```

**Request Body:**
```json
{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200 OK):**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

### Register New User

```
POST /api/auth/register/
```

**Request Body:**
```json
{
    "username": "newuser",
    "email": "user@example.com",
    "password": "securepassword123",
    "password_confirm": "securepassword123",
    "first_name": "John",
    "last_name": "Doe"
}
```

**Response (201 Created):**
```json
{
    "success": true,
    "message": "Registration successful",
    "user": {
        "id": 5,
        "username": "newuser",
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe"
    }
}
```

---

### Get User Profile

```
GET /api/auth/profile/
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
}
```

---

## Conversations

### List Conversations

```
GET /api/conversations/
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "success": true,
    "conversations": [
        {
            "id": 1,
            "title": "How to implement RAG...",
            "chat_type": "general",
            "created_at": "2025-01-30T10:30:00Z",
            "updated_at": "2025-01-30T11:45:00Z",
            "message_count": 8,
            "last_message": {
                "content": "That's a great approach for...",
                "is_user_message": false,
                "timestamp": "2025-01-30T11:45:00Z"
            }
        },
        {
            "id": 2,
            "title": "Document: report.pdf",
            "chat_type": "document",
            "created_at": "2025-01-29T09:00:00Z",
            "updated_at": "2025-01-29T09:30:00Z",
            "message_count": 4,
            "last_message": null
        }
    ]
}
```

---

### Create Conversation

```
POST /api/conversations/
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "title": "New Chat",
    "chat_type": "general"
}
```

**Response (201 Created):**
```json
{
    "success": true,
    "conversation": {
        "id": 3,
        "title": "New Chat",
        "chat_type": "general",
        "created_at": "2025-01-31T08:00:00Z",
        "updated_at": "2025-01-31T08:00:00Z",
        "messages": [],
        "attachments": []
    }
}
```

---

### Get Conversation Detail

```
GET /api/conversations/{id}/
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "success": true,
    "conversation": {
        "id": 1,
        "title": "How to implement RAG...",
        "chat_type": "document",
        "created_at": "2025-01-30T10:30:00Z",
        "updated_at": "2025-01-30T11:45:00Z",
        "messages": [
            {
                "id": 1,
                "is_user_message": true,
                "content": "Can you explain RAG?",
                "timestamp": "2025-01-30T10:30:00Z"
            },
            {
                "id": 2,
                "is_user_message": false,
                "content": "RAG (Retrieval-Augmented Generation) is...",
                "timestamp": "2025-01-30T10:30:15Z"
            }
        ],
        "attachments": [
            {
                "id": 1,
                "document": {
                    "id": 5,
                    "title": "ml_guide.pdf",
                    "file_type": "pdf",
                    "uploaded_at": "2025-01-30T10:29:00Z",
                    "processed": true,
                    "file_url": "http://example.com/media/documents/ml_guide.pdf"
                },
                "uploaded_at": "2025-01-30T10:29:30Z"
            }
        ]
    }
}
```

---

### Delete Conversation

```
DELETE /api/conversations/{id}/
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "success": true,
    "message": "Conversation deleted"
}
```

---

### Update Conversation

```
PATCH /api/conversations/{id}/
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "title": "Updated Title"
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "conversation": {
        "id": 1,
        "title": "Updated Title",
        ...
    }
}
```

---

## Chat / Messaging

### Send Message (New Conversation)

Creates a new conversation and sends the first message.

```
POST /api/chat/send/
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "message": "Hello, how can you help me?",
    "chat_type": "general"
}
```

**Response:** Server-Sent Events (SSE) stream

---

### Send Message (Existing Conversation)

```
POST /api/chat/send/{conversation_id}/
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "message": "Can you explain that in more detail?"
}
```

**Response:** Server-Sent Events (SSE) stream

---

### Handling SSE Stream (React Example)

```javascript
const sendMessage = async (message, conversationId = null) => {
    const url = conversationId 
        ? `/api/chat/send/${conversationId}/`
        : '/api/chat/send/';
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ message, chat_type: 'general' })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiResponse = '';
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.slice(6));
                    
                    if (data.chunk) {
                        aiResponse += data.chunk;
                        // Update UI with streaming text
                        setStreamingText(aiResponse);
                    }
                    
                    if (data.done) {
                        // Stream complete
                        setConversationId(data.conversation_id);
                        setStreamingText('');
                        setMessages(prev => [...prev, {
                            is_user_message: false,
                            content: aiResponse
                        }]);
                    }
                    
                    if (data.error) {
                        console.error('Stream error:', data.error);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }
    }
};
```

---

## Documents

### List Documents

```
GET /api/documents/
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "success": true,
    "documents": [
        {
            "id": 1,
            "title": "report.pdf",
            "file_type": "pdf",
            "uploaded_at": "2025-01-30T09:00:00Z",
            "processed": true,
            "file_url": "http://example.com/media/documents/report.pdf"
        },
        {
            "id": 2,
            "title": "notes.docx",
            "file_type": "docx",
            "uploaded_at": "2025-01-29T14:00:00Z",
            "processed": true,
            "file_url": "http://example.com/media/documents/notes.docx"
        }
    ]
}
```

---

### Upload Document

```
POST /api/documents/
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `document`: File (PDF, DOCX, or TXT)
- `conversation_id` (optional): Link to existing conversation

**Response (201 Created):**
```json
{
    "success": true,
    "document": {
        "id": 3,
        "title": "newfile.pdf",
        "file_type": "pdf",
        "uploaded_at": "2025-01-31T08:30:00Z",
        "processed": true,
        "file_url": "http://example.com/media/documents/newfile.pdf"
    },
    "conversation_id": 5
}
```

**React Example:**
```javascript
const uploadDocument = async (file, conversationId = null) => {
    const formData = new FormData();
    formData.append('document', file);
    if (conversationId) {
        formData.append('conversation_id', conversationId);
    }
    
    const response = await fetch('/api/documents/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
            // Note: Don't set Content-Type for FormData
        },
        body: formData
    });
    
    return response.json();
};
```

---

### Get Document Status

```
GET /api/documents/{id}/status/
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "success": true,
    "document_id": 3,
    "title": "newfile.pdf",
    "processed": true
}
```

---

### Delete Document

```
DELETE /api/documents/{id}/
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "success": true,
    "message": "Document deleted"
}
```

---

### Link Document to Conversation

```
POST /api/documents/link/
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "conversation_id": 5,
    "document_id": 3
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "created": true,
    "message": "Document linked"
}
```

---

## Health Check

```
GET /api/health/
```

No authentication required.

**Response (200 OK):**
```json
{
    "status": "healthy",
    "service": "BSC AI API",
    "version": "1.0.0"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
    "success": false,
    "errors": {
        "message": ["This field is required."]
    }
}
```

### 401 Unauthorized
```json
{
    "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
    "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
    "detail": "Not found."
}
```

### 429 Too Many Requests
```json
{
    "detail": "Request was throttled. Expected available in 30 seconds."
}
```

---

## TypeScript Interfaces

```typescript
// Auth
interface LoginRequest {
    username: string;
    password: string;
}

interface TokenResponse {
    access: string;
    refresh: string;
}

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
}

// Conversations
interface Message {
    id: number;
    is_user_message: boolean;
    content: string;
    timestamp: string;
}

interface Document {
    id: number;
    title: string;
    file_type: 'pdf' | 'docx' | 'txt';
    uploaded_at: string;
    processed: boolean;
    file_url: string | null;
}

interface Attachment {
    id: number;
    document: Document;
    uploaded_at: string;
}

interface ConversationSummary {
    id: number;
    title: string;
    chat_type: 'general' | 'document';
    created_at: string;
    updated_at: string;
    message_count: number;
    last_message: {
        content: string;
        is_user_message: boolean;
        timestamp: string;
    } | null;
}

interface ConversationDetail {
    id: number;
    title: string;
    chat_type: 'general' | 'document';
    created_at: string;
    updated_at: string;
    messages: Message[];
    attachments: Attachment[];
}

// Chat streaming
interface StreamChunk {
    chunk?: string;
    done?: boolean;
    conversation_id?: number;
    error?: string;
}

// API Responses
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    errors?: Record<string, string[]>;
    message?: string;
}
```

---

## Rate Limits

| User Type | Limit |
|-----------|-------|
| Anonymous | 20 requests/minute |
| Authenticated | 100 requests/minute |

---

## Notes for React Team

1. **Token Storage:** Store JWT in memory or secure storage (avoid localStorage for access token in production)

2. **Token Refresh:** Implement automatic token refresh when access token expires (401 response)

3. **Streaming:** The chat endpoint returns SSE - use `fetch` with `ReadableStream` or a library like `eventsource`

4. **File Upload:** Use `FormData` for document uploads, don't set `Content-Type` header manually

5. **CORS:** The API allows requests from `localhost:3000` and `localhost:5173` during development

6. **Error Handling:** Always check for `success: false` in responses and handle errors gracefully
