import { create } from 'zustand';
import type { Workspace, Chatbot, KnowledgeBase, ChatGroup, Chat, Message, MessageAttachment } from '@/types';

// Mock data
const mockWorkspaces: Workspace[] = [
  { id: '1', name: 'General', description: 'Default workspace', createdAt: new Date() },
  { id: '2', name: 'Support', description: 'Customer support bots', createdAt: new Date() },
];

const mockChatbots: Chatbot[] = [
  {
    id: '1',
    name: 'BSC Support Assistant',
    description: 'Handles customer inquiries',
    systemPrompt: 'You are a helpful customer support assistant for BSC. Be professional and friendly.',
    model: 'gpt-4',
    temperature: 0.7,
    workspaceId: '1',
    knowledgeBaseIds: ['1'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  },
  {
    id: '2',
    name: 'Technical Helper',
    description: 'Technical documentation assistant',
    systemPrompt: 'You are a technical assistant. Provide clear, accurate technical information.',
    model: 'gpt-4',
    temperature: 0.5,
    workspaceId: '1',
    knowledgeBaseIds: ['2'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  },
];

const mockKnowledgeBases: KnowledgeBase[] = [
  { id: '1', name: 'Product Documentation', description: 'All product docs', documentCount: 45, workspaceId: '1', createdAt: new Date() },
  { id: '2', name: 'Technical Guides', description: 'Technical documentation', documentCount: 23, workspaceId: '1', createdAt: new Date() },
];

const mockGroups: ChatGroup[] = [
  { id: '1', name: 'Customer Queries', chatbotId: '1', workspaceId: '1', createdAt: new Date() },
  { id: '2', name: 'Internal Questions', chatbotId: '1', workspaceId: '1', createdAt: new Date() },
];

const mockChats: Chat[] = [
  { id: '1', title: 'Product pricing inquiry', chatbotId: '1', groupId: '1', workspaceId: '1', createdAt: new Date(), updatedAt: new Date() },
  { id: '2', title: 'Technical setup help', chatbotId: '2', workspaceId: '1', createdAt: new Date(), updatedAt: new Date() },
];

const mockMessages: Message[] = [
  { id: '1', chatId: '1', role: 'user', content: 'What are your pricing plans?', createdAt: new Date(Date.now() - 60000) },
  { id: '2', chatId: '1', role: 'assistant', content: 'Hello! I\'d be happy to help you with pricing information. We offer three main plans:\n\n1. **Starter** - $29/month\n2. **Professional** - $79/month\n3. **Enterprise** - Custom pricing\n\nWould you like more details about any specific plan?', createdAt: new Date(Date.now() - 30000) },
];

interface AppState {
  // Auth state
  isAuthenticated: boolean;
  authLoading: boolean;
  user: { id: number; username: string; email: string; first_name: string; last_name: string } | null;
  setAuth: (isAuthenticated: boolean, user?: { id: number; username: string; email: string; first_name: string; last_name: string } | null) => void;
  setAuthLoading: (loading: boolean) => void;

  // Data
  workspaces: Workspace[];
  chatbots: Chatbot[];
  knowledgeBases: KnowledgeBase[];
  groups: ChatGroup[];
  chats: Chat[];
  messages: Message[];

  // Selection state
  activeWorkspaceId: string | null;
  activeChatbotId: string | null;
  activeChatId: string | null;
  activeConversationId: number | null;

  // UI state
  sidebarCollapsed: boolean;

  // Actions
  setActiveWorkspace: (id: string) => void;
  setActiveChatbot: (id: string | null) => void;
  setActiveChat: (id: string | null) => void;
  setActiveConversation: (id: number | null) => void;
  toggleSidebar: () => void;

  addMessage: (chatId: string, role: 'user' | 'assistant', content: string, attachments?: MessageAttachment[]) => string;
  updateMessage: (messageId: string, content: string) => void;
  createChat: (chatbotId: string, title: string, groupId?: string) => Chat;
  createChatbot: (chatbot: Omit<Chatbot, 'id' | 'createdAt' | 'updatedAt'>) => Chatbot;
  updateChatbot: (id: string, updates: Partial<Chatbot>) => void;
  deleteChatbot: (id: string) => void;
  createKnowledgeBase: (kb: Omit<KnowledgeBase, 'id' | 'createdAt' | 'documentCount'>) => KnowledgeBase;
  createGroup: (group: Omit<ChatGroup, 'id' | 'createdAt'>) => ChatGroup;
  createWorkspace: (name: string, description?: string) => Workspace;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth state
  isAuthenticated: false,
  authLoading: true,
  user: null,
  setAuth: (isAuthenticated, user = null) => set({ isAuthenticated, user }),
  setAuthLoading: (authLoading) => set({ authLoading }),

  workspaces: mockWorkspaces,
  chatbots: mockChatbots,
  knowledgeBases: mockKnowledgeBases,
  groups: mockGroups,
  chats: mockChats,
  messages: mockMessages,

  activeWorkspaceId: '1',
  activeChatbotId: null,
  activeChatId: null,
  activeConversationId: null,
  sidebarCollapsed: true,

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id, activeChatbotId: null, activeChatId: null }),
  setActiveChatbot: (id) => set({ activeChatbotId: id, activeChatId: null }),
  setActiveChat: (id) => set({ activeChatId: id }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  addMessage: (chatId, role, content, attachments) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      chatId,
      role,
      content,
      attachments,
      createdAt: new Date(),
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));

    // Update chat's updatedAt
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, updatedAt: new Date() } : chat
      ),
    }));

    return newMessage.id;
  },

  updateMessage: (messageId, content) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg
      ),
    }));
  },

  createChat: (chatbotId, title, groupId) => {
    const { activeWorkspaceId } = get();
    const newChat: Chat = {
      id: Date.now().toString(),
      title,
      chatbotId,
      groupId,
      workspaceId: activeWorkspaceId || '1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ chats: [...state.chats, newChat], activeChatId: newChat.id }));
    return newChat;
  },

  createChatbot: (chatbot) => {
    const newChatbot: Chatbot = {
      ...chatbot,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ chatbots: [...state.chatbots, newChatbot] }));
    return newChatbot;
  },

  updateChatbot: (id, updates) => {
    set((state) => ({
      chatbots: state.chatbots.map((bot) =>
        bot.id === id ? { ...bot, ...updates, updatedAt: new Date() } : bot
      ),
    }));
  },

  deleteChatbot: (id) => {
    set((state) => ({
      chatbots: state.chatbots.filter((bot) => bot.id !== id),
    }));
  },

  createKnowledgeBase: (kb) => {
    const newKB: KnowledgeBase = {
      ...kb,
      id: Date.now().toString(),
      documentCount: 0,
      createdAt: new Date(),
    };
    set((state) => ({ knowledgeBases: [...state.knowledgeBases, newKB] }));
    return newKB;
  },

  createGroup: (group) => {
    const newGroup: ChatGroup = {
      ...group,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    set((state) => ({ groups: [...state.groups, newGroup] }));
    return newGroup;
  },

  createWorkspace: (name, description) => {
    const newWorkspace: Workspace = {
      id: Date.now().toString(),
      name,
      description: description || '',
      createdAt: new Date(),
    };
    set((state) => ({
      workspaces: [...state.workspaces, newWorkspace],
      activeWorkspaceId: newWorkspace.id
    }));
    return newWorkspace;
  },
}));
