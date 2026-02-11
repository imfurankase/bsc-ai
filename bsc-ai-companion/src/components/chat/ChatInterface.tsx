import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Menu } from "lucide-react";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { WelcomeScreen } from "./WelcomeScreen";
import { KnowledgeBasePickerDialog } from "./KnowledgeBasePickerDialog";
import { FilePreviewDialog } from "./FilePreviewDialog";
import { useChat } from "@/hooks/useChat";
import { useDocuments } from "@/hooks/useDocuments";
import { useAppStore } from "@/store/appStore";
import { useBufferedStreaming } from "@/hooks/useBufferedStreaming";
import type { MessageAttachment } from "@/types";
import type {
  ConversationSummary,
  Message as ApiMessage,
} from "@/types/api-types";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: MessageAttachment[];
  chartData?: {
    type: "line" | "bar";
    x_key: string;
    y_keys: string[];
    rows: Record<string, unknown>[];
    title?: string;
    document_id?: number;
  };
};

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [kbPickerOpen, setKbPickerOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    type: string;
    name: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { toggleSidebar, activeConversationId, setActiveConversation } =
    useAppStore();

  const {
    streamChat,
    cancelStream,
    loadConversation,
    loadConversations,
    isLoading: chatLoading,
  } = useChat();

  const { uploadDocument } = useDocuments();

  // Buffered streaming for smooth text display
  const {
    addChunk,
    complete,
    reset: resetBuffer,
    getFullContent,
  } = useBufferedStreaming({
    minBufferSize: 10,
    charsPerFrame: 2,
    frameInterval: 20,
  });

  // Load conversations on mount
  useEffect(() => {
    loadConversations().then(setConversations);
  }, [loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadConversation(activeConversationId).then((conversation) => {
        if (conversation?.messages) {
          setMessages(
            conversation.messages.map((m: ApiMessage) => ({
              id: m.id.toString(),
              role: m.is_user_message ? "user" : "assistant",
              content: m.content,
            }))
          );
        }
      });
    } else {
      setMessages([]);
    }
  }, [activeConversationId, loadConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (input: string, attachments?: MessageAttachment[]) => {
      if (!input.trim() && (!attachments || attachments.length === 0)) return;

      const conversationId = activeConversationId;

      // Determine chat type based on attachments
      const chatType =
        attachments && attachments.length > 0 ? "document" : "general";

      // Handle file uploads first (if any) and enrich attachments with server info
      let enrichedAttachments = attachments;
      if (attachments && attachments.length > 0) {
        const updated: MessageAttachment[] = [];
        for (const attachment of attachments) {
          if (attachment.file) {
            const uploaded = await uploadDocument(
              attachment.file,
              conversationId || undefined
            );
            if (uploaded) {
              updated.push({
                ...attachment,
                // Use server-side document metadata where available
                name: uploaded.title || attachment.name,
                // Map backend file_type to our local attachment type
                type:
                  uploaded.file_type === "pdf"
                    ? "pdf"
                    : uploaded.file_type in
                      {
                        jpg: true,
                        jpeg: true,
                        png: true,
                        gif: true,
                        webp: true,
                      }
                    ? "image"
                    : "doc",
                url: uploaded.file_url || attachment.url,
                documentId: uploaded.id,
              });
            } else {
              // Fallback to original attachment if upload failed
              updated.push(attachment);
            }
          } else {
            updated.push(attachment);
          }
        }
        enrichedAttachments = updated;
      }

      // Add user message to UI immediately
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
        attachments: enrichedAttachments,
      };
      setMessages((prev) => [...prev, userMessage]);

      setIsTyping(true);
      resetBuffer();

      // Create placeholder for assistant message
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);

      // Update function for buffered streaming
      const updateMessage = (content: string) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessageId ? { ...m, content } : m))
        );
      };

      // Stream the chat - backend handles creating conversation if needed
      await streamChat({
        message: input,
        conversationId: conversationId || undefined,
        chatType,
        onDelta: (chunk) => {
          addChunk(chunk, updateMessage);
        },
        onDone: async (newConversationId) => {
          // Complete the buffered display
          complete(updateMessage);

          setIsTyping(false);

          // If this was a new conversation, update the active conversation
          if (newConversationId && !conversationId) {
            setActiveConversation(newConversationId);
            // Reload conversations list to show the new one
            const updatedConversations = await loadConversations();
            setConversations(updatedConversations);
          }
        },
        onChartData: (chartData) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, chartData } : m
            )
          );
        },
      });
    },
    [
      activeConversationId,
      streamChat,
      uploadDocument,
      resetBuffer,
      addChunk,
      complete,
      cancelStream,
      setActiveConversation,
      loadConversations,
    ]
  );

  const handleKBSelect = (attachments: MessageAttachment[]) => {
    // Handle KB selection - can be expanded later
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
              {conversations.find((c) => c.id === activeConversationId)
                ?.title || "New Conversation"}
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
                chatId: activeConversationId?.toString() || "",
                role: message.role,
                content: message.content,
                attachments: message.attachments,
                createdAt: new Date(),
                chartData: message.chartData,
              }}
              isStreaming={
                isTyping &&
                index === messages.length - 1 &&
                message.role === "assistant"
              }
              animationDelay={index * 30}
              onPreview={(file) => setPreviewFile(file)}
            />
          ))}

          {/* Typing Indicator - show when waiting for AI response */}
          {isTyping &&
            messages[messages.length - 1]?.role === "assistant" &&
            messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-3 animate-fade-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-2xl blur-md opacity-40" />
                  <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary-foreground animate-pulse" />
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-lg px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="relative">
        {isTyping && (
          <div className="absolute -top-9 right-4 z-10">
            <button
              onClick={() => {
                cancelStream();
                setIsTyping(false);
              }}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/90 text-white shadow hover:bg-red-500 transition-colors"
            >
              Stop generating
            </button>
          </div>
        )}
        <ChatInput
          onSend={handleSend}
          onOpenKnowledgeBase={() => setKbPickerOpen(true)}
          disabled={isTyping}
          darkMode
        />
      </div>

      {/* Knowledge Base Picker */}
      <KnowledgeBasePickerDialog
        open={kbPickerOpen}
        onOpenChange={setKbPickerOpen}
        onSelect={handleKBSelect}
      />

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
};
