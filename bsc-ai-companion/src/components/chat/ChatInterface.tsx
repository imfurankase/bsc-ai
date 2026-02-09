import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { WelcomeScreen } from './WelcomeScreen';
import { KnowledgeBasePickerDialog } from './KnowledgeBasePickerDialog';
import { useChat } from '@/hooks/useChat';
import { useDocuments } from '@/hooks/useDocuments';
import { useAppStore } from '@/store/appStore';
import { useBufferedStreaming } from '@/hooks/useBufferedStreaming';
import type { MessageAttachment } from '@/types';
import type { ConversationSummary, ConversationDetail } from '@/types/api-types';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: MessageAttachment[];
};

type Conversation = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<(ConversationSummary | ConversationDetail)[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [kbPickerOpen, setKbPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { toggleSidebar, sidebarCollapsed, activeConversationId, setActiveConversation } = useAppStore();

  const {
    streamChat,
    loadMessages,
    createConversation,
    loadConversations,
    updateConversationTitle,
  } = useChat();

  const { uploadDocument, getDocumentContext } = useDocuments();

  // Buffered streaming for smooth text display
  const { addChunk, complete, reset: resetBuffer, getFullContent } = useBufferedStreaming({
    minBufferSize: 10,    // Start displaying after just 10 chars
    charsPerFrame: 2,     // Display 2 chars per frame for smooth effect
    frameInterval: 20,    // ~50fps
  });

  // Load conversations on mount
  useEffect(() => {
    loadConversations().then(setConversations);
  }, [loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId).then(dbMessages => {
        setMessages(dbMessages.map(m => ({
          id: String(m.id),
          role: m.is_user_message ? 'user' : 'assistant',
          content: m.content,
        })));
      });
    } else {
      setMessages([]);
    }
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (input: string, attachments?: MessageAttachment[]) => {
    if (!input.trim() && (!attachments || attachments.length === 0)) return;

    let conversationId = activeConversationId;

    // Create new conversation if needed
    if (!conversationId) {
      const title = input.trim().slice(0, 50) || 'New Chat';
      const conversation = await createConversation(title);
      if (!conversation) return;
      conversationId = conversation.id;
      setActiveConversation(conversationId);
      setConversations(prev => [conversation, ...prev]);
    }

    // Handle file uploads
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.file) {
          await uploadDocument(attachment.file, conversationId);
        }
      }
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      attachments,
    };
    setMessages(prev => [...prev, userMessage]);

    setIsTyping(true);

    // Get document context for this conversation
    const documentContext = await getDocumentContext(conversationId);

    // Build message history for AI
    const messageHistory = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Reset buffer for new message
    resetBuffer();

    // Create placeholder for assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

    // Update function for buffered streaming
    const updateMessage = (content: string) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content }
            : m
        )
      );
    };

    await streamChat({
      message: input,
      conversationId,
      onDelta: (chunk) => {
        addChunk(chunk, updateMessage);
      },
      onDone: async () => {
        // Complete the buffered display
        complete(updateMessage);

        // Small delay to let buffer finish, then save
        setTimeout(async () => {
          setIsTyping(false);

          // Update conversation title if it's the first message
          if (messages.length === 0 && input.trim()) {
            const newTitle = input.slice(0, 50);
            await updateConversationTitle(conversationId!, newTitle);
            setConversations(prev =>
              prev.map(c => c.id === conversationId ? { ...c, title: newTitle } : c)
            );
          }
        }, 200);
      },
    });
  }, [activeConversationId, messages, createConversation, streamChat, getDocumentContext, uploadDocument, updateConversationTitle, resetBuffer, addChunk, complete, setActiveConversation]);

  const handleKBSelect = (attachments: MessageAttachment[]) => {
    // Handle KB selection
  };

  const handleNewChat = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
  }, [setActiveConversation]);

  // Show welcome screen when no messages
  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <WelcomeScreen
          onSend={handleSend}
          onOpenKnowledgeBase={() => setKbPickerOpen(true)}
          disabled={isTyping}
        />
        <KnowledgeBasePickerDialog
          open={kbPickerOpen}
          onOpenChange={setKbPickerOpen}
          onSelect={handleKBSelect}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[hsl(220,25%,10%)]">
      {/* Chat Header */}
      <div className="relative flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-[hsl(220,20%,12%)]">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile menu button */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-xl sm:rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-green-500 rounded-full border-2 border-[hsl(220,20%,12%)] ring-2 ring-green-500/20" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-base sm:text-lg text-white truncate max-w-[180px] sm:max-w-none">
              {conversations.find(c => c.id === activeConversationId)?.title || 'New Conversation'}
            </h2>
            <p className="text-xs sm:text-sm text-white/50 flex items-center gap-1.5 sm:gap-2">
              <span className="relative flex items-center gap-1 sm:gap-1.5">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500" />
                <span className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-ping" />
              </span>
              <span className="hidden sm:inline">AI Assistant • </span>Online
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-3">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={{
                id: message.id,
                chatId: String(activeConversationId || ''),
                role: message.role,
                content: message.content,
                attachments: message.attachments,
                createdAt: new Date(),
              }}
              isStreaming={isTyping && index === messages.length - 1 && message.role === 'assistant'}
              animationDelay={index * 30}
            />
          ))}

          {/* Typing Indicator */}
          {isTyping && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-2xl blur-md opacity-40" />
                <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground animate-pulse" />
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-lg px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={handleSend}
        onOpenKnowledgeBase={() => setKbPickerOpen(true)}
        disabled={isTyping}
        darkMode
      />

      {/* Knowledge Base Picker */}
      <KnowledgeBasePickerDialog
        open={kbPickerOpen}
        onOpenChange={setKbPickerOpen}
        onSelect={handleKBSelect}
      />
    </div>
  );
};