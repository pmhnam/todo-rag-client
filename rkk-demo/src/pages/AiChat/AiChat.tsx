import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ragApi } from '../../api/ragApi';
import { useToast } from '../../components/Toast';
import { Spinner } from '../../components/Spinner';
import type { Conversation, ChatMessage, ContextChunk } from '../../api/types';
import {
  MessageSquarePlus,
  Send,
  Trash2,
  Bot,
  User,
  ChevronDown,
  ChevronRight,
  Sparkles,
  MessagesSquare,
} from 'lucide-react';

export const AiChat: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [contextChunks, setContextChunks] = useState<ContextChunk[]>([]);
  const [showContext, setShowContext] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  // ─── Load conversations ──────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const convs = await ragApi.listConversations();
      setConversations(convs);
    } catch {
      showToast('Failed to load conversations', 'error');
    } finally {
      setIsLoadingConvs(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ─── Load messages for active conversation ───────

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const msgs = await ragApi.getMessages(activeConvId);
        setMessages(msgs);
      } catch {
        showToast('Failed to load messages', 'error');
      } finally {
        setIsLoadingMessages(false);
      }
    };
    loadMessages();
  }, [activeConvId, showToast]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Create new conversation ─────────────────────

  const handleNewConversation = async () => {
    try {
      const conv = await ragApi.createConversation();
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
      setContextChunks([]);
      showToast('New conversation created', 'success');
    } catch {
      showToast('Failed to create conversation', 'error');
    }
  };

  // ─── Send message ────────────────────────────────

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    let convId = activeConvId;

    // Auto-create conversation if none active
    if (!convId) {
      try {
        const conv = await ragApi.createConversation();
        setConversations((prev) => [conv, ...prev]);
        convId = conv.id;
        setActiveConvId(conv.id);
      } catch {
        showToast('Failed to create conversation', 'error');
        return;
      }
    }

    const userMessage = input.trim();
    setInput('');
    setIsSending(true);

    // Optimistic: add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await ragApi.sendMessage(convId, userMessage);

      const assistantMsg: ChatMessage = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: res.response,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setContextChunks(res.contextChunks || []);
    } catch {
      showToast('Failed to get AI response. Is the LLM service running?', 'error');
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // ─── Delete conversation ─────────────────────────

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await ragApi.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
      showToast('Conversation deleted', 'success');
    } catch {
      showToast('Failed to delete conversation', 'error');
    }
  };

  // ─── Handle textarea auto-resize + Enter ─────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-chat">
      {/* Sidebar */}
      <aside className="ai-chat-sidebar">
        <div className="ai-chat-sidebar-header">
          <h3><MessagesSquare size={18} /> Conversations</h3>
          <button className="btn-icon" onClick={handleNewConversation} title="New Chat">
            <MessageSquarePlus size={18} />
          </button>
        </div>

        <div className="ai-chat-sidebar-list">
          {isLoadingConvs ? (
            <div className="ai-chat-sidebar-loading">
              <Spinner size="sm" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="ai-chat-sidebar-empty">
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`ai-chat-conv-item ${activeConvId === conv.id ? 'active' : ''}`}
                onClick={() => setActiveConvId(conv.id)}
              >
                <div className="ai-chat-conv-info">
                  <span className="ai-chat-conv-title">
                    {conv.title || 'New Conversation'}
                  </span>
                  <span className="ai-chat-conv-date">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="ai-chat-conv-delete"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="ai-chat-main">
        {!activeConvId && messages.length === 0 ? (
          <div className="ai-chat-welcome">
            <Sparkles size={48} className="ai-chat-welcome-icon" />
            <h2>AI Assistant</h2>
            <p>Ask questions about your tasks, posts, and data. Powered by RAG.</p>
            <button className="btn-primary" onClick={handleNewConversation}>
              <MessageSquarePlus size={16} /> Start New Chat
            </button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="ai-chat-messages">
              {isLoadingMessages ? (
                <div className="ai-chat-messages-loading">
                  <Spinner size="md" />
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`ai-chat-message ai-chat-message--${msg.role}`}
                  >
                    <div className="ai-chat-message-avatar">
                      {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                    </div>
                    <div className="ai-chat-message-content">
                      <div className="ai-chat-message-role">
                        {msg.role === 'user' ? 'You' : 'AI Assistant'}
                      </div>
                      <div className="ai-chat-message-text">{msg.content}</div>
                    </div>
                  </div>
                ))
              )}

              {isSending && (
                <div className="ai-chat-message ai-chat-message--assistant">
                  <div className="ai-chat-message-avatar">
                    <Bot size={18} />
                  </div>
                  <div className="ai-chat-message-content">
                    <div className="ai-chat-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Context Chunks (collapsible) */}
            {contextChunks.length > 0 && (
              <div className="ai-chat-context">
                <button
                  className="ai-chat-context-toggle"
                  onClick={() => setShowContext(!showContext)}
                >
                  {showContext ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {contextChunks.length} source{contextChunks.length > 1 ? 's' : ''} used
                </button>
                {showContext && (
                  <div className="ai-chat-context-list">
                    {contextChunks.map((chunk, i) => (
                      <div key={i} className="ai-chat-context-item">
                        <span className="ai-chat-context-distance">
                          {(1 - chunk.distance).toFixed(2)} match
                        </span>
                        <p>{chunk.contentPreview}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div className="ai-chat-input-area">
              <div className="ai-chat-input-wrapper">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your data..."
                  rows={1}
                  disabled={isSending}
                />
                <button
                  className="ai-chat-send"
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AiChat;
