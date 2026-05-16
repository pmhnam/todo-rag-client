import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ragApi } from '../../api/ragApi';
import { projectApi } from '../../api/projectApi';
import { useToast } from '../../components/Toast';
import { Spinner } from '../../components/Spinner';
import type { AgentPendingConfirmation, AgentToolCall, Conversation, ChatMessage, ContextChunk, Project } from '../../api/types';
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
  const [toolCalls, setToolCalls] = useState<AgentToolCall[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<AgentPendingConfirmation | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

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

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await projectApi.getAll({ page: 1, limit: 100 });
        const fetchedProjects = res.data || [];
        setProjects(fetchedProjects);
        if (fetchedProjects.length > 0) {
          setSelectedProjectId((current) => current || fetchedProjects[0].id);
        }
      } catch {
        showToast('Failed to load projects', 'error');
      }
    };
    loadProjects();
  }, [showToast]);

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
        setToolCalls([]);
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
      setToolCalls([]);
      setPendingConfirmation(null);
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
    setPendingConfirmation(null);

    // Optimistic: add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await ragApi.sendMessage(
        convId,
        userMessage,
        undefined,
        selectedProjectId || undefined,
      );

      const assistantMsg: ChatMessage = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: res.response,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setContextChunks(res.contextChunks || []);
      setToolCalls(res.toolCalls || []);
      setPendingConfirmation(res.pendingConfirmation || null);
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
        setToolCalls([]);
        setPendingConfirmation(null);
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

  const handleConfirmAction = async () => {
    if (!activeConvId || !pendingConfirmation || isSending) return;

    const confirmation = pendingConfirmation;
    setIsSending(true);
    setPendingConfirmation(null);

    const userMessage = `Xác nhận thao tác ${confirmation.toolName}`;
    setMessages((prev) => [
      ...prev,
      {
        id: `confirm-${Date.now()}`,
        role: 'user',
        content: userMessage,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await ragApi.sendMessage(
        activeConvId,
        userMessage,
        undefined,
        selectedProjectId || undefined,
        {
          approvedToolName: confirmation.toolName,
          approvedInput: confirmation.input as Record<string, unknown>,
        },
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-resp-${Date.now()}`,
          role: 'assistant',
          content: res.response,
          createdAt: new Date().toISOString(),
        },
      ]);
      setToolCalls(res.toolCalls || []);
      setContextChunks(res.contextChunks || []);
      showToast('Confirmed action completed', 'success');
    } catch {
      showToast('Failed to confirm action', 'error');
      setPendingConfirmation(confirmation);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelAction = () => {
    if (!pendingConfirmation) return;
    setPendingConfirmation(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `cancel-${Date.now()}`,
        role: 'assistant',
        content: 'Đã huỷ thao tác cần xác nhận.',
        createdAt: new Date().toISOString(),
      },
    ]);
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
            <p>Ask me to find, create, update, or move tasks. Powered by AI agent tools.</p>
            {projects.length > 0 && (
              <select
                className="ai-chat-project-select"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            )}
            <button className="btn-primary" onClick={handleNewConversation}>
              <MessageSquarePlus size={16} /> Start New Chat
            </button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="ai-chat-messages">
              {projects.length > 0 && (
                <div className="ai-chat-project-bar">
                  <span>Project</span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    disabled={isSending}
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              )}
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
                      <div className="ai-chat-message-text">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
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

            {toolCalls.length > 0 && (
              <div className="ai-chat-tools">
                <div className="ai-chat-tools-title">Agent actions</div>
                {toolCalls.map((call, index) => (
                  <div key={`${call.toolName}-${index}`} className="ai-chat-tool-item">
                    <span>{call.toolName}</span>
                    <small>{call.output ? 'completed' : 'started'}</small>
                  </div>
                ))}
              </div>
            )}

            {pendingConfirmation && (
              <div className="ai-chat-tools">
                <div className="ai-chat-tools-title">Confirmation required</div>
                <div className="ai-chat-tool-item">
                  <span>{pendingConfirmation.message}</span>
                  <small>{pendingConfirmation.toolName}</small>
                </div>
                <div style={{ display: 'flex', gap: 8, padding: '8px 12px' }}>
                  <button className="btn-danger" onClick={handleConfirmAction} disabled={isSending}>Confirm</button>
                  <button className="btn-ghost" onClick={handleCancelAction} disabled={isSending}>Cancel</button>
                </div>
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
                  placeholder="Ask me to create, update, move, or explain tasks..."
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
