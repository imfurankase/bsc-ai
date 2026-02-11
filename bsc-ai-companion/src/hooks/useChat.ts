import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { api, streamRequest } from "@/lib/api";
import type {
  ConversationsListResponse,
  ConversationResponse,
  ConversationDetail,
  ConversationSummary,
  Message,
  ChartData,
} from "@/types/api-types";

export const useChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Stream chat messages from Django API
   */
  const streamChat = useCallback(
    async (params: {
      message: string;
      conversationId?: number;
      chatType?: "general" | "document";
      onDelta: (deltaText: string) => void;
      onDone: (conversationId?: number) => void;
      onChartData?: (data: ChartData) => void;
    }) => {
      const {
        message,
        conversationId,
        chatType = "general",
        onDelta,
        onDone,
        onChartData,
      } = params;
      setIsLoading(true);

      // Cancel any previous stream before starting a new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const endpoint = conversationId
        ? `/api/chat/send/${conversationId}/`
        : "/api/chat/send/";

      const body = { message, chat_type: chatType };

      await streamRequest(
        endpoint,
        body,
        onDelta,
        (convId) => {
          setIsLoading(false);
          onDone(convId);
        },
        (error) => {
          setIsLoading(false);
          if (error.includes("429") || error.includes("rate")) {
            toast.error("Rate limit exceeded. Please try again later.");
          } else {
            toast.error(error || "Failed to get AI response");
          }
          onDone();
        },
        (data) => {
          if (onChartData && data) {
            onChartData(data as ChartData);
          }
        },
        controller.signal
      );
    },
    []
  );
  /**
   * Cancel an in-flight streaming request (if any).
   * This stops frontend updates and attempts to abort the underlying fetch.
   */
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  /**
   * Load all conversations for the current user
   */
  const loadConversations = useCallback(async (): Promise<
    ConversationSummary[]
  > => {
    const { data, error } = await api.get<ConversationsListResponse>(
      "/api/conversations/"
    );

    if (error) {
      console.error("Error loading conversations:", error);
      return [];
    }

    return data?.conversations || [];
  }, []);

  /**
   * Load a single conversation with messages
   */
  const loadConversation = useCallback(
    async (conversationId: number): Promise<ConversationDetail | null> => {
      const { data, error } = await api.get<ConversationResponse>(
        `/api/conversations/${conversationId}/`
      );

      if (error) {
        console.error("Error loading conversation:", error);
        return null;
      }

      return data?.conversation || null;
    },
    []
  );

  /**
   * Load messages for a conversation (convenience wrapper)
   */
  const loadMessages = useCallback(
    async (conversationId: number): Promise<Message[]> => {
      const conversation = await loadConversation(conversationId);
      return conversation?.messages || [];
    },
    [loadConversation]
  );

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(
    async (
      title: string = "New Chat",
      chatType: "general" | "document" = "general"
    ): Promise<ConversationDetail | null> => {
      const { data, error } = await api.post<ConversationResponse>(
        "/api/conversations/",
        {
          title,
          chat_type: chatType,
        }
      );

      if (error) {
        console.error("Error creating conversation:", error);
        toast.error("Failed to create conversation");
        return null;
      }

      return data?.conversation || null;
    },
    []
  );

  /**
   * Update conversation title
   */
  const updateConversationTitle = useCallback(
    async (conversationId: number, title: string): Promise<boolean> => {
      const { error } = await api.patch<ConversationResponse>(
        `/api/conversations/${conversationId}/`,
        {
          title,
        }
      );

      if (error) {
        console.error("Error updating conversation title:", error);
        return false;
      }

      return true;
    },
    []
  );

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(
    async (conversationId: number): Promise<boolean> => {
      const { error } = await api.delete(
        `/api/conversations/${conversationId}/`
      );

      if (error) {
        console.error("Error deleting conversation:", error);
        toast.error("Failed to delete conversation");
        return false;
      }

      return true;
    },
    []
  );

  return {
    isLoading,
    streamChat,
    cancelStream,
    loadConversations,
    loadConversation,
    loadMessages,
    createConversation,
    updateConversationTitle,
    deleteConversation,
  };
};
