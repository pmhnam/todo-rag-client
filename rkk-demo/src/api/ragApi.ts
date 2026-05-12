import apiClient from './apiClient';
import type { Conversation, ChatMessage, ChatRes, SearchResult } from './types';

export const ragApi = {
  // Conversations
  createConversation: () =>
    apiClient.post<Conversation>('/rag/conversations').then((r) => r.data),

  listConversations: () =>
    apiClient.get<Conversation[]>('/rag/conversations').then((r) => r.data),

  getMessages: (conversationId: string) =>
    apiClient
      .get<ChatMessage[]>(`/rag/conversations/${conversationId}/messages`)
      .then((r) => r.data),

  sendMessage: (conversationId: string, message: string, topK?: number) =>
    apiClient
      .post<ChatRes>(`/rag/conversations/${conversationId}/chat`, {
        message,
        topK,
      })
      .then((r) => r.data),

  deleteConversation: (conversationId: string) =>
    apiClient.delete(`/rag/conversations/${conversationId}`),

  // Search
  search: (query: string, topK?: number) =>
    apiClient
      .post<SearchResult[]>('/rag/search', { query, topK })
      .then((r) => r.data),
};
