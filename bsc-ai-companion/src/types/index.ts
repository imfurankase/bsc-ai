export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface Chatbot {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  workspaceId: string;
  knowledgeBaseIds: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  workspaceId: string;
  createdAt: Date;
}

export interface ChatGroup {
  id: string;
  name: string;
  chatbotId: string;
  workspaceId: string;
  createdAt: Date;
}

export interface Chat {
  id: string;
  title: string;
  chatbotId: string;
  groupId?: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'image' | 'text' | 'url';
  size?: number;
  source?: 'upload' | 'knowledge-base' | 'url';
  knowledgeBaseId?: string;
  url?: string;
  preview?: string;
  file?: File;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: MessageAttachment[];
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}
