import { useState, useCallback } from "react";
import { toast } from "sonner";
import { api, getAccessToken } from "@/lib/api";
import type {
  Document,
  DocumentsListResponse,
  DocumentUploadResponse,
  DocumentStatusResponse,
} from "@/types/api-types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const useDocuments = () => {
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Upload a document to Django backend
   */
  const uploadDocument = useCallback(
    async (file: File, conversationId?: number): Promise<Document | null> => {
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("document", file);
        if (conversationId) {
          formData.append("conversation_id", conversationId.toString());
        }

        // Use fetch directly for FormData (api helper handles Content-Type wrong for FormData)
        const accessToken = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/api/documents/`, {
          method: "POST",
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          toast.error(errorData.error || "Failed to upload document");
          return null;
        }

        const data: DocumentUploadResponse = await response.json();

        if (data.success && data.document) {
          toast.success(`Uploaded ${file.name}`);
          return data.document;
        }

        return null;
      } catch (error) {
        console.error("Document upload error:", error);
        toast.error("Failed to upload document");
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  /**
   * Load all documents (optionally filtered by conversation)
   */
  const loadDocuments = useCallback(
    async (conversationId?: number): Promise<Document[]> => {
      const endpoint = conversationId
        ? `/api/documents/?conversation_id=${conversationId}`
        : "/api/documents/";

      const { data, error } = await api.get<DocumentsListResponse>(endpoint);

      if (error) {
        console.error("Error loading documents:", error);
        return [];
      }

      return data?.documents || [];
    },
    []
  );

  /**
   * Check document processing status
   */
  const getDocumentStatus = useCallback(
    async (documentId: number): Promise<DocumentStatusResponse | null> => {
      const { data, error } = await api.get<DocumentStatusResponse>(
        `/api/documents/${documentId}/status/`
      );

      if (error) {
        console.error("Error getting document status:", error);
        return null;
      }

      return data || null;
    },
    []
  );

  /**
   * Fetch a lightweight tabular preview for CSV/Excel documents.
   */
  const getDocumentTablePreview = useCallback(
    async (documentId: number): Promise<any | null> => {
      const { data, error } = await api.get<{
        success: boolean;
        document_id: number;
        title: string;
        table: {
          columns: string[];
          rows: Record<string, unknown>[];
          row_count: number;
          column_count: number;
          dtypes: Record<string, string>;
        };
      }>(`/api/documents/${documentId}/table/`);

      if (error) {
        console.error("Error getting document table preview:", error);
        return null;
      }

      if (!data?.success) {
        console.warn("Failed to load table preview:", data);
        return null;
      }

      return data.table;
    },
    []
  );

  /**
   * Poll document status until processed
   */
  const waitForProcessing = useCallback(
    async (
      documentId: number,
      onProcessed?: () => void,
      maxAttempts: number = 30
    ): Promise<boolean> => {
      for (let i = 0; i < maxAttempts; i++) {
        const status = await getDocumentStatus(documentId);

        if (status?.processed) {
          onProcessed?.();
          return true;
        }

        // Wait 2 seconds before next check
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      console.warn("Document processing timed out");
      return false;
    },
    [getDocumentStatus]
  );

  /**
   * Delete a document
   */
  const deleteDocument = useCallback(
    async (documentId: number): Promise<boolean> => {
      const { error } = await api.delete(`/api/documents/${documentId}/`);

      if (error) {
        console.error("Error deleting document:", error);
        toast.error("Failed to delete document");
        return false;
      }

      toast.success("Document deleted");
      return true;
    },
    []
  );

  /**
   * Link an existing document to a conversation
   */
  const linkDocumentToConversation = useCallback(
    async (documentId: number, conversationId: number): Promise<boolean> => {
      const { error } = await api.post("/api/documents/link/", {
        document_id: documentId,
        conversation_id: conversationId,
      });

      if (error) {
        console.error("Error linking document:", error);
        return false;
      }

      return true;
    },
    []
  );

  /**
   * Get document context for a conversation (returns extracted text)
   * Note: Django handles this server-side via RAG, but this can be used
   * if you need client-side access to document content
   */
  const getDocumentContext = useCallback(
    async (conversationId: number): Promise<string> => {
      // The Django backend handles document context via RAG when sending messages
      // This function is kept for API compatibility but returns empty
      // Document context is automatically included when using document chat type
      console.log(
        "Document context requested for conversation:",
        conversationId
      );
      return "";
    },
    []
  );

  return {
    isUploading,
    uploadDocument,
    loadDocuments,
    getDocumentStatus,
    waitForProcessing,
    deleteDocument,
    linkDocumentToConversation,
    getDocumentContext,
    getDocumentTablePreview,
  };
};

// Re-export Document type for convenience
export type { Document };
