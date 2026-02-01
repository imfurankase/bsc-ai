// Django API Type Definitions
// Based on API_DOCUMENTATION.md

// ============ Auth Types ============

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
}

export interface TokenResponse {
    access: string;
    refresh: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
}

export interface RegisterResponse {
    success: boolean;
    message: string;
    user: User;
}

// ============ Conversation Types ============

export interface Message {
    id: number;
    is_user_message: boolean;
    content: string;
    timestamp: string;
}

export interface Document {
    id: number;
    title: string;
    file_type: 'pdf' | 'docx' | 'txt';
    uploaded_at: string;
    processed: boolean;
    file_url: string | null;
}

export interface Attachment {
    id: number;
    document: Document;
    uploaded_at: string;
}

export interface ConversationSummary {
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

export interface ConversationDetail {
    id: number;
    title: string;
    chat_type: 'general' | 'document';
    created_at: string;
    updated_at: string;
    messages: Message[];
    attachments: Attachment[];
}

// ============ Chat Types ============

export interface SendMessageRequest {
    message: string;
    chat_type?: 'general' | 'document';
}

export interface StreamChunk {
    chunk?: string;
    done?: boolean;
    conversation_id?: number;
    error?: string;
}

// ============ Document Types ============

export interface DocumentUploadResponse {
    success: boolean;
    document: Document;
    conversation_id?: number;
}

export interface DocumentStatusResponse {
    success: boolean;
    document_id: number;
    title: string;
    processed: boolean;
}

export interface LinkDocumentRequest {
    conversation_id: number;
    document_id: number;
}

// ============ API Response Wrappers ============

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    errors?: Record<string, string[]>;
    message?: string;
}

export interface ConversationsListResponse {
    success: boolean;
    conversations: ConversationSummary[];
}

export interface ConversationResponse {
    success: boolean;
    conversation: ConversationDetail;
}

export interface DocumentsListResponse {
    success: boolean;
    documents: Document[];
}

// ============ Health Check ============

export interface HealthResponse {
    status: string;
    service: string;
    version: string;
}
