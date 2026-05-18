import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Kanban, type BoardData, type BoardItem, dropHandler, dropColumnHandler } from 'react-kanban-kit';
import { todoActivityApi, todoApi, todoAttachmentApi, todoCommentApi, todoStatusApi } from '../../api/todoApi';
import { jiraIntegrationApi } from '../../api/jiraIntegrationApi';
import { projectApi } from '../../api/projectApi';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { JiraAuthType } from '../../api/types';
import type { Todo, TodoStatus, CreateTodoReq, TodoPriority, JiraSyncStatus, TodoComment, TodoActivity, ProjectMember, ProjectMemberPermission, TodoAttachment } from '../../api/types';
import { useProjects } from '../../contexts/useProjects';
import {
  Plus, Trash2, Calendar, Flag, GripVertical, X, Edit3, AlertCircle, Sparkles, Link2, Settings, Search, SlidersHorizontal, MessageSquare, Send, Check, History, Users, Paperclip, Upload
} from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e',
};
const PRIORITY_LABELS: Record<string, string> = {
  HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low',
};
const DEFAULT_COLUMN_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f59e0b', '#ef4444', '#3b82f6', '#10b981',
];
type DueDateFilter = 'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'NO_DUE';
type DueDateState = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'no_due';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function statusesToBoardData(
  statuses: TodoStatus[],
  todosByStatus: Map<string, Todo[]>,
): BoardData {
  const sorted = [...statuses].sort((a, b) => a.order - b.order);
  const columnIds = sorted.map((s) => s.id);

  const boardData: BoardData = {
    root: {
      id: 'root',
      title: 'Board',
      parentId: null,
      children: columnIds,
      totalChildrenCount: columnIds.length,
      totalItemsCount: columnIds.length,
    },
  };

  for (const status of sorted) {
    const todos = todosByStatus.get(status.id) || [];
    const childIds = todos.map((t) => t.id);

    boardData[status.id] = {
      id: status.id,
      title: status.name,
      parentId: 'root',
      children: childIds,
      content: { color: status.color || '#6366f1' },
      totalChildrenCount: childIds.length,
      totalItemsCount: childIds.length,
    };

    for (const todo of todos) {
      boardData[todo.id] = {
        id: todo.id,
        title: todo.title,
        parentId: status.id,
        children: [],
        type: 'card',
        content: todo,
        totalChildrenCount: 0,
      };
    }
  }

  return boardData;
}

function boardDataToReorderColumns(data: BoardData) {
  return data.root.children.map((statusId) => ({
    statusId,
    orderedTodoIds: data[statusId]?.children || [],
  }));
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRelativeDateInputValue(daysFromToday: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  return formatDateInputValue(date);
}

function parseDueDate(value?: string) {
  if (!value) return null;
  const dateOnly = value.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getDueDateInfo(value?: string): { state: DueDateState; label: string; helper: string } {
  const dueDate = parseDueDate(value);
  if (!dueDate) return { state: 'no_due', label: 'No due date', helper: 'No due date set' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  const days = Math.round((dueDate.getTime() - today.getTime()) / DAY_IN_MS);

  if (days < 0) {
    const count = Math.abs(days);
    const label = count === 1 ? 'Overdue by 1 day' : `Overdue by ${count} days`;
    return { state: 'overdue', label, helper: label };
  }
  if (days === 0) return { state: 'today', label: 'Today', helper: 'Due today' };
  if (days === 1) return { state: 'tomorrow', label: 'Tomorrow', helper: 'Due tomorrow' };

  const dateLabel = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { state: 'upcoming', label: dateLabel, helper: `Due in ${days} days` };
}

function matchesDueDateFilter(todo: Todo, filter: DueDateFilter) {
  if (filter === 'ALL') return true;
  if (!todo.dueDate) return filter === 'NO_DUE';

  const dueDate = parseDueDate(todo.dueDate);
  if (!dueDate) return filter === 'NO_DUE';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(dueDate);
  dueDay.setHours(0, 0, 0, 0);

  if (filter === 'TODAY') return isSameDay(dueDay, today);
  if (filter === 'OVERDUE') return dueDay < today;
  if (filter === 'UPCOMING') return dueDay > today;
  return true;
}

function formatActivityValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'empty';
  if (Array.isArray(value)) return value.join(', ') || 'empty';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isImageAttachment(attachment: TodoAttachment) {
  return attachment.kind === 'IMAGE' || attachment.mimeType.startsWith('image/');
}

function isVideoAttachment(attachment: TodoAttachment) {
  return attachment.kind === 'VIDEO' || attachment.mimeType.startsWith('video/');
}

// ─── TodoCard ──────────────────────────────────────────

const TodoCard: React.FC<{
  data: BoardItem;
  onOpen: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}> = ({ data, onOpen, onDelete }) => {
  const todo = data.content as Todo;
  const dueDateInfo = getDueDateInfo(todo?.dueDate);
  if (!todo?.priority) return <div className="todo-card"><div className="todo-card-title">{data.title}</div></div>;
  return (
    <div className={`todo-card ${dueDateInfo.state === 'overdue' ? 'todo-card--overdue' : ''}`} onClick={() => onOpen(todo)}>
      <div className="todo-card-header">
        <div className="todo-card-priority">
          <Flag size={14} style={{ color: PRIORITY_COLORS[todo.priority] }} fill={PRIORITY_COLORS[todo.priority]} />
          <span style={{ color: PRIORITY_COLORS[todo.priority] }}>{PRIORITY_LABELS[todo.priority]}</span>
          {todo.generatedByAi && <span title="AI Generated" style={{ display: 'inline-flex' }}><Sparkles size={14} style={{ color: '#8b5cf6', marginLeft: 4 }} /></span>}
        </div>
        <div className="todo-card-actions">
          <button onClick={(e) => { e.stopPropagation(); onOpen(todo); }} title="Open details"><Edit3 size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(todo); }} title="Delete"><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="todo-card-title">{todo.title}</div>
      {todo.description && <div className="todo-card-description">{todo.description}</div>}
      {todo.aiSummary && <div className="todo-card-ai-summary">✨ {todo.aiSummary}</div>}
      {todo.tags && todo.tags.length > 0 && (
        <div className="todo-card-tags">
          {todo.tags.map(tag => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      )}
      {todo.externalLinks && todo.externalLinks.length > 0 && (
        <div className="todo-card-links" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {todo.externalLinks.map((link, idx) => (
            <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }} onClick={(e) => e.stopPropagation()}>
              <Link2 size={12} /> {link.name}
            </a>
          ))}
        </div>
      )}
      <div className="todo-card-footer" style={{ marginTop: 8 }}>
        {todo.dueDate && (
          <div className={`todo-card-due todo-card-due--${dueDateInfo.state}`} title={parseDueDate(todo.dueDate)?.toLocaleDateString()}><Calendar size={12} /><span>{dueDateInfo.label}</span></div>
        )}
        {todo.jiraIssueKey && (
          <span className={`todo-card-jira-wrap todo-card-jira-${todo.jiraSyncStatus?.toLowerCase()}`}>
            <a href={todo.jiraIssueUrl} target="_blank" rel="noopener noreferrer" className="todo-card-jira" onClick={(e) => e.stopPropagation()}>
              🎫 {todo.jiraIssueKey}
            </a>
            <span className="todo-card-jira-status">{todo.jiraSyncStatus}</span>
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Add Card Form ─────────────────────────────────────

const AddCardForm: React.FC<{
  statusId: string;
  onAdd: (data: Omit<CreateTodoReq, 'projectId'>) => void;
  onCancel: () => void;
}> = ({ statusId, onAdd, onCancel }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('MEDIUM');
  const [tagsStr, setTagsStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const dueDateInfo = getDueDateInfo(dueDate);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ 
      title: title.trim(), 
      statusId, 
      priority,
      dueDate: dueDate || undefined,
      tags: tagsStr ? tagsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined
    });
    setTitle('');
    setTagsStr('');
    setDueDate('');
  };

  return (
    <div className="todo-add-card">
      <input type="text" placeholder="Enter card title..." value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel(); }}
        autoFocus
      />
      <input type="text" placeholder="Tags (comma separated)..." value={tagsStr}
        onChange={(e) => setTagsStr(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel(); }}
        style={{ marginTop: 4, fontSize: '12px', padding: '4px 8px' }}
      />
      <div className="todo-due-picker todo-due-picker--compact">
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <div className="todo-due-quick-actions">
          <button type="button" onClick={() => setDueDate(getRelativeDateInputValue(0))}>Today</button>
          <button type="button" onClick={() => setDueDate(getRelativeDateInputValue(1))}>Tomorrow</button>
          <button type="button" onClick={() => setDueDate(getRelativeDateInputValue(7))}>Next week</button>
          {dueDate && <button type="button" onClick={() => setDueDate('')}>Clear</button>}
        </div>
        {dueDate && <small className={`todo-due-helper todo-due-helper--${dueDateInfo.state}`}>{dueDateInfo.helper}</small>}
      </div>
      <div className="todo-add-card-row" style={{ marginTop: 8 }}>
        <select value={priority} onChange={(e) => setPriority(e.target.value as TodoPriority)} className="todo-add-card-priority">
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        <div className="todo-add-card-buttons">
          <button className="btn-primary" onClick={handleSubmit}>Add</button>
          <button className="btn-ghost" onClick={onCancel}><X size={16} /></button>
        </div>
      </div>
    </div>
  );
};

// ─── Main TodoBoard Page ───────────────────────────────

export const TodoBoard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, selectedProjectId, selectedProject, isLoading: isProjectLoading, selectProject, getBoardCache, setBoardCache } = useProjects();
  const initialBoardCache = selectedProjectId ? getBoardCache(selectedProjectId) : undefined;
  const [statuses, setStatuses] = useState<TodoStatus[]>(() => initialBoardCache?.statuses || []);
  const [todosByStatus, setTodosByStatus] = useState<Map<string, Todo[]>>(() => initialBoardCache?.todosByStatus || new Map());
  const [dataSource, setDataSource] = useState<BoardData | null>(() => initialBoardCache ? statusesToBoardData(initialBoardCache.statuses, initialBoardCache.todosByStatus) : null);
  const [isLoading, setIsLoading] = useState(() => !initialBoardCache);
  const [addingCardForColumn, setAddingCardForColumn] = useState<string | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState(DEFAULT_COLUMN_COLORS[0]);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TodoPriority>('MEDIUM');
  const [editStatusId, setEditStatusId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editTagsStr, setEditTagsStr] = useState('');
  const [editAiSummary, setEditAiSummary] = useState('');
  const [editGeneratedByAi, setEditGeneratedByAi] = useState(false);
  const [editExternalLinks, setEditExternalLinks] = useState<{name: string, url: string}[]>([]);
  const [editJiraIssueKey, setEditJiraIssueKey] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [comments, setComments] = useState<TodoComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [activities, setActivities] = useState<TodoActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newCommentImages, setNewCommentImages] = useState<File[]>([]);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);
  const [showJiraSettings, setShowJiraSettings] = useState(false);
  const [jiraHasConfig, setJiraHasConfig] = useState(false);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraAuthType, setJiraAuthType] = useState<JiraAuthType>(JiraAuthType.BASIC);
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [jiraMappings, setJiraMappings] = useState<Record<string, { jiraTransitionId: string; jiraTransitionName: string }>>({});
  const [showShare, setShowShare] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<ProjectMemberPermission>('READ');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<TodoPriority | 'ALL'>('ALL');
  const [filterJiraStatus, setFilterJiraStatus] = useState<JiraSyncStatus | 'ALL'>('ALL');
  const [filterDueDate, setFilterDueDate] = useState<DueDateFilter>('ALL');

  const { showToast } = useToast();
  const hasActiveFilters = Boolean(searchQuery.trim()) || filterPriority !== 'ALL' || filterJiraStatus !== 'ALL' || filterDueDate !== 'ALL';
  const editDueDateInfo = getDueDateInfo(editDueDate);

  const loadData = useCallback(async (projectId: string, options: { showLoading?: boolean } = {}) => {
    const { showLoading = true } = options;
    if (showLoading) setIsLoading(true);
    try {
      const statusRes = await todoStatusApi.getAll({ projectId, page: 1, limit: 50 });
      const fetchedStatuses: TodoStatus[] = statusRes.data || [];
      setStatuses(fetchedStatuses);

      const todosMap = new Map<string, Todo[]>();
      for (const status of fetchedStatuses) {
        todosMap.set(status.id, []);
      }

      const todos = await todoApi.getBoard({
        projectId,
        page: 1,
        limit: 500,
        q: searchQuery.trim() || undefined,
        priority: filterPriority === 'ALL' ? undefined : filterPriority,
        jiraSyncStatus: filterJiraStatus === 'ALL' ? undefined : filterJiraStatus,
      });
      for (const todo of todos) {
        if (!matchesDueDateFilter(todo, filterDueDate)) continue;
        const statusTodos = todosMap.get(todo.statusId);
        if (statusTodos) {
          statusTodos.push(todo);
        }
      }
      setTodosByStatus(todosMap);
      setDataSource(statusesToBoardData(fetchedStatuses, todosMap));
      if (!hasActiveFilters) {
        setBoardCache(projectId, { statuses: fetchedStatuses, todosByStatus: todosMap });
      }
    } catch (err) {
      console.error('Failed to load board data:', err);
      showToast('Failed to load board. Please check API connection.', 'error');
      const emptyBoard: BoardData = { root: { id: 'root', title: 'Board', parentId: null, children: [], totalChildrenCount: 0, totalItemsCount: 0 } };
      setDataSource(emptyBoard);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [filterDueDate, filterJiraStatus, filterPriority, hasActiveFilters, searchQuery, setBoardCache, showToast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearchQuery(searchInput), 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (isProjectLoading || projects.length === 0) return;

    const projectIdFromUrl = searchParams.get('projectId');
    const urlProjectExists = projectIdFromUrl && projects.some((project) => project.id === projectIdFromUrl);
    if (urlProjectExists) {
      if (selectedProjectId !== projectIdFromUrl) {
        selectProject(projectIdFromUrl);
      }
      return;
    }

    const nextProjectId = selectedProjectId && projects.some((project) => project.id === selectedProjectId)
      ? selectedProjectId
      : projects[0].id;
    selectProject(nextProjectId);
    setSearchParams({ projectId: nextProjectId }, { replace: true });
  }, [isProjectLoading, projects, searchParams, selectedProjectId, selectProject, setSearchParams]);

  useEffect(() => { 
    if (selectedProjectId) {
      if (hasActiveFilters) {
        loadData(selectedProjectId, { showLoading: false });
        return;
      }

      const cachedBoard = getBoardCache(selectedProjectId);
      if (cachedBoard) {
        setStatuses(cachedBoard.statuses);
        setTodosByStatus(cachedBoard.todosByStatus);
        setDataSource(statusesToBoardData(cachedBoard.statuses, cachedBoard.todosByStatus));
        setIsLoading(false);
        loadData(selectedProjectId, { showLoading: false });
      } else {
        loadData(selectedProjectId);
      }
    } else if (!isProjectLoading) {
      setIsLoading(false);
    }
  }, [getBoardCache, hasActiveFilters, isProjectLoading, selectedProjectId, loadData]);

  const resetJiraForm = () => {
    setJiraHasConfig(false);
    setJiraDomain('');
    setJiraAuthType(JiraAuthType.BASIC);
    setJiraEmail('');
    setJiraApiToken('');
    setJiraProjectKey('');
    setJiraMappings({});
  };

  const handleOpenJiraSettings = async () => {
    if (!selectedProjectId) return;
    setShowJiraSettings(true);
    setJiraLoading(true);
    resetJiraForm();

    try {
      const integration = await jiraIntegrationApi.get(selectedProjectId);
      setJiraHasConfig(true);
      setJiraDomain(integration.jiraDomain);
      setJiraAuthType(integration.authType);
      setJiraEmail(integration.jiraEmail || '');
      setJiraProjectKey(integration.jiraProjectKey || '');

      const mappings = await jiraIntegrationApi.getTransitionMappings(selectedProjectId);
      setJiraMappings(Object.fromEntries(mappings.map((mapping) => [
        mapping.todoStatusId,
        {
          jiraTransitionId: mapping.jiraTransitionId,
          jiraTransitionName: mapping.jiraTransitionName || '',
        },
      ])));
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status !== 404) {
        showToast('Failed to load Jira settings', 'error');
      }
    } finally {
      setJiraLoading(false);
    }
  };

  const handleSaveJiraSettings = async () => {
    if (!selectedProjectId) return;
    if (!canWrite) return;
    if (!jiraDomain.trim()) {
      showToast('Jira domain is required', 'error');
      return;
    }
    if (jiraAuthType === JiraAuthType.BASIC && !jiraEmail.trim()) {
      showToast('Jira email is required for basic auth', 'error');
      return;
    }
    if (!jiraHasConfig && !jiraApiToken.trim()) {
      showToast('API token is required for first-time setup', 'error');
      return;
    }

    setJiraLoading(true);
    try {
      await jiraIntegrationApi.upsert(selectedProjectId, {
        jiraDomain: jiraDomain.trim(),
        authType: jiraAuthType,
        jiraEmail: jiraAuthType === JiraAuthType.BASIC ? jiraEmail.trim() : undefined,
        jiraApiToken: jiraApiToken.trim() || undefined,
        jiraProjectKey: jiraProjectKey.trim() || undefined,
      });

      const mappings = statuses
        .map((status) => ({
          todoStatusId: status.id,
          jiraTransitionId: jiraMappings[status.id]?.jiraTransitionId?.trim() || '',
          jiraTransitionName: jiraMappings[status.id]?.jiraTransitionName?.trim() || undefined,
        }))
        .filter((mapping) => mapping.jiraTransitionId);

      await jiraIntegrationApi.upsertTransitionMappings(selectedProjectId, { mappings });
      setJiraApiToken('');
      setJiraHasConfig(true);
      showToast('Jira settings saved', 'success');
    } catch (err) {
      console.error('Failed to save Jira settings:', err);
      showToast('Failed to save Jira settings', 'error');
    } finally {
      setJiraLoading(false);
    }
  };

  const handleTestJiraConnection = async () => {
    if (!selectedProjectId) return;
    setJiraLoading(true);
    try {
      const result = await jiraIntegrationApi.test(selectedProjectId);
      showToast(`Connected to Jira${result.displayName ? ` as ${result.displayName}` : ''}`, 'success');
    } catch {
      showToast('Jira connection failed', 'error');
    } finally {
      setJiraLoading(false);
    }
  };

  const handleDisconnectJira = async () => {
    if (!selectedProjectId) return;
    if (!canWrite) return;
    setJiraLoading(true);
    try {
      await jiraIntegrationApi.delete(selectedProjectId);
      resetJiraForm();
      showToast('Jira disconnected for this project', 'success');
    } catch {
      showToast('Failed to disconnect Jira', 'error');
    } finally {
      setJiraLoading(false);
    }
  };

  const loadMembers = async (projectId: string) => {
    setMembersLoading(true);
    try {
      setMembers(await projectApi.getMembers(projectId));
    } catch {
      showToast('Failed to load collaborators', 'error');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleOpenShare = async () => {
    if (!selectedProjectId) return;
    setShowShare(true);
    await loadMembers(selectedProjectId);
  };

  const handleInviteMember = async () => {
    if (!selectedProjectId || !inviteEmail.trim()) return;
    setMembersLoading(true);
    try {
      await projectApi.inviteMember(selectedProjectId, {
        email: inviteEmail.trim(),
        permission: invitePermission,
      });
      setInviteEmail('');
      await loadMembers(selectedProjectId);
      showToast('Collaborator invited', 'success');
    } catch {
      showToast('Failed to invite collaborator', 'error');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleUpdateMemberPermission = async (memberId: string, permission: ProjectMemberPermission) => {
    if (!selectedProjectId) return;
    try {
      const updated = await projectApi.updateMember(selectedProjectId, memberId, { permission });
      setMembers((current) => current.map((member) => member.id === memberId ? updated : member));
    } catch {
      showToast('Failed to update collaborator', 'error');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedProjectId) return;
    try {
      await projectApi.removeMember(selectedProjectId, memberId);
      setMembers((current) => current.filter((member) => member.id !== memberId));
    } catch {
      showToast('Failed to remove collaborator', 'error');
    }
  };

  const handleAddCard = async (data: Omit<CreateTodoReq, 'projectId'>) => {
    if (!selectedProjectId) return;
    if (!canWrite) return;

    const previousTodosByStatus = todosByStatus;
    const previousDataSource = dataSource;
    const now = new Date().toISOString();
    const existingTodos = todosByStatus.get(data.statusId) || [];
    const optimisticTodo: Todo = {
      id: `temp-${Date.now()}`,
      projectId: selectedProjectId,
      title: data.title,
      description: data.description,
      statusId: data.statusId,
      priority: data.priority || 'MEDIUM',
      position: existingTodos.length,
      dueDate: data.dueDate,
      jiraSyncStatus: 'NOT_LINKED',
      createdBy: 'optimistic',
      createdAt: now,
      updatedAt: now,
      tags: data.tags,
      externalLinks: data.externalLinks,
      aiSummary: data.aiSummary,
      generatedByAi: data.generatedByAi,
    };
    const optimisticTodosByStatus = new Map(todosByStatus);
    optimisticTodosByStatus.set(data.statusId, [...existingTodos, optimisticTodo]);

    setAddingCardForColumn(null);
    setTodosByStatus(optimisticTodosByStatus);
    setDataSource(statusesToBoardData(statuses, optimisticTodosByStatus));
    if (!hasActiveFilters) {
      setBoardCache(selectedProjectId, { statuses, todosByStatus: optimisticTodosByStatus });
    }

    try {
      await todoApi.create({ ...data, projectId: selectedProjectId });
      showToast('Card created!', 'success');
      await loadData(selectedProjectId, { showLoading: false });
    }
    catch {
      setTodosByStatus(previousTodosByStatus);
      setDataSource(previousDataSource);
      if (!hasActiveFilters) {
        setBoardCache(selectedProjectId, { statuses, todosByStatus: previousTodosByStatus });
      }
      showToast('Failed to create card', 'error');
    }
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo); setEditTitle(todo.title); setEditDescription(todo.description || '');
    setEditPriority(todo.priority); setEditDueDate(todo.dueDate ? todo.dueDate.split('T')[0] : '');
    setEditStatusId(todo.statusId);
    setEditTagsStr(todo.tags?.join(', ') || '');
    setEditAiSummary(todo.aiSummary || '');
    setEditGeneratedByAi(todo.generatedByAi || false);
    setEditExternalLinks(todo.externalLinks || []);
    setEditJiraIssueKey(todo.jiraIssueKey || '');
    setIsSavingEdit(false);
    setNewComment('');
    setNewCommentImages([]);
    setEditingCommentId(null);
    setEditingCommentContent('');
    setCommentsLoading(true);
    todoCommentApi.getAll(todo.id)
      .then(setComments)
      .catch(() => showToast('Failed to load comments', 'error'))
      .finally(() => setCommentsLoading(false));
    setActivitiesLoading(true);
    todoActivityApi.getAll(todo.id)
      .then(setActivities)
      .catch(() => showToast('Failed to load activities', 'error'))
      .finally(() => setActivitiesLoading(false));
  };

  const reloadActivities = async (todoId: string) => {
    try {
      setActivities(await todoActivityApi.getAll(todoId));
    } catch {
      showToast('Failed to refresh activities', 'error');
    }
  };

  const uploadAttachment = async (todoId: string, file: File) => {
    const presigned = await todoAttachmentApi.presign(todoId, {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    });
    await todoAttachmentApi.uploadToStorage(presigned.uploadUrl, file, presigned.headers);
    return todoAttachmentApi.complete(todoId, {
      key: presigned.key,
      url: presigned.publicUrl,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    });
  };

  const handleUploadTaskAttachments = async (files: FileList | null) => {
    if (!editingTodo || !files?.length || !canWrite) return;
    setAttachmentsUploading(true);
    try {
      const saved = await Promise.all(Array.from(files).map((file) => uploadAttachment(editingTodo.id, file)));
      setEditingTodo((current) => current ? { ...current, attachments: [...(current.attachments || []), ...saved] } : current);
      showToast('Attachment uploaded', 'success');
    } catch {
      showToast('Failed to upload attachment', 'error');
    } finally {
      setAttachmentsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!editingTodo || !canWrite) return;
    const previous = editingTodo.attachments || [];
    setEditingTodo({ ...editingTodo, attachments: previous.filter((attachment) => attachment.id !== attachmentId) });
    try {
      await todoAttachmentApi.delete(editingTodo.id, attachmentId);
    } catch {
      setEditingTodo({ ...editingTodo, attachments: previous });
      showToast('Failed to delete attachment', 'error');
    }
  };

  const handleAddComment = async () => {
    if (!editingTodo || (!newComment.trim() && newCommentImages.length === 0)) return;
    if (!canWrite) return;

    const content = newComment.trim();
    const imageFiles = newCommentImages;

    if (imageFiles.length > 0) {
      setAttachmentsUploading(true);
      try {
        const uploaded = await Promise.all(imageFiles.map((file) => uploadAttachment(editingTodo.id, file)));
        const saved = await todoCommentApi.create(editingTodo.id, {
          content: content || undefined,
          attachmentKeys: uploaded.map((attachment) => attachment.storageKey),
        });
        setComments((current) => [...current, saved]);
        setNewComment('');
        setNewCommentImages([]);
        await reloadActivities(editingTodo.id);
      } catch {
        showToast('Failed to add comment', 'error');
      } finally {
        setAttachmentsUploading(false);
      }
      return;
    }

    const now = new Date().toISOString();
    const tempComment: TodoComment = {
      id: `temp-${Date.now()}`,
      todoId: editingTodo.id,
      userId: 'optimistic',
      content,
      createdBy: 'optimistic',
      createdAt: now,
      updatedAt: now,
    };
    const previousComments = comments;
    setComments((current) => [...current, tempComment]);
    setNewComment('');

    try {
      const saved = await todoCommentApi.create(editingTodo.id, { content });
      setComments((current) => current.map((comment) => comment.id === tempComment.id ? saved : comment));
      await reloadActivities(editingTodo.id);
    } catch {
      setComments(previousComments);
      setNewComment(content);
      showToast('Failed to add comment', 'error');
    }
  };

  const handleStartEditComment = (comment: TodoComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const handleSaveComment = async (commentId: string) => {
    if (!editingTodo || !editingCommentContent.trim()) return;
    try {
      const updated = await todoCommentApi.update(editingTodo.id, commentId, { content: editingCommentContent.trim() });
      setComments((current) => current.map((comment) => comment.id === commentId ? updated : comment));
      setEditingCommentId(null);
      setEditingCommentContent('');
      await reloadActivities(editingTodo.id);
    } catch {
      showToast('Failed to update comment', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!editingTodo) return;
    const previousComments = comments;
    setComments((current) => current.filter((comment) => comment.id !== commentId));
    try {
      await todoCommentApi.delete(editingTodo.id, commentId);
      await reloadActivities(editingTodo.id);
    } catch {
      setComments(previousComments);
      showToast('Failed to delete comment', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTodo || isSavingEdit) return;
    if (!canWrite) return;
    setIsSavingEdit(true);
    try {
      await todoApi.update(editingTodo.id, { 
        title: editTitle, 
        description: editDescription || undefined, 
        statusId: editStatusId || undefined,
        priority: editPriority, 
        dueDate: editDueDate || undefined,
        tags: editTagsStr ? editTagsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
        aiSummary: editAiSummary || undefined,
        generatedByAi: editGeneratedByAi,
        externalLinks: editExternalLinks
      });
      const nextJiraIssueKey = editJiraIssueKey.trim().toUpperCase();
      const currentJiraIssueKey = editingTodo.jiraIssueKey || '';
      if (nextJiraIssueKey !== currentJiraIssueKey) {
        await todoApi.linkJiraIssue(editingTodo.id, { jiraIssueKey: nextJiraIssueKey });
      }
      setEditingTodo(null);
      if (selectedProjectId) {
        await loadData(selectedProjectId, { showLoading: false });
      }
      await reloadActivities(editingTodo.id);
      showToast('Card updated!', 'success');
    } catch { showToast('Failed to update card', 'error'); }
    finally { setIsSavingEdit(false); }
  };

  const handleDeleteTodo = async () => {
    if (!deletingTodo || !selectedProjectId) return;
    if (!canWrite) return;
    try { await todoApi.delete(deletingTodo.id); setDeletingTodo(null); setEditingTodo(null); showToast('Card deleted', 'success'); loadData(selectedProjectId); }
    catch { showToast('Failed to delete card', 'error'); }
  };

  const handleCardMove = async (move: { cardId: string; fromColumnId: string; toColumnId: string; taskAbove: string | null; taskBelow: string | null; position: number }) => {
    if (!dataSource) return;
    if (!canWrite) return;
    const newData = dropHandler(move, dataSource, () => {},
      (newCol) => ({ ...newCol, totalItemsCount: (newCol.totalItemsCount || 0) + 1, totalChildrenCount: (newCol.totalChildrenCount || 0) + 1 }),
      (srcCol) => ({ ...srcCol, totalItemsCount: (srcCol.totalItemsCount || 0) - 1, totalChildrenCount: (srcCol.totalChildrenCount || 0) - 1 }),
    );
    setDataSource(newData);

    const { cardId, toColumnId, fromColumnId } = move;
    try {
      if (toColumnId !== fromColumnId) {
        const updatedTodo = await todoApi.update(cardId, { statusId: toColumnId });
        if (updatedTodo.jiraIssueKey && updatedTodo.jiraSyncStatus === 'FAILED') {
          showToast('Card moved, but Jira sync failed. Check the transition id and Jira workflow.', 'error');
        } else if (updatedTodo.jiraIssueKey && updatedTodo.jiraSyncStatus === 'PENDING') {
          showToast('Card moved, but Jira sync is pending. Check Jira integration and status mapping.', 'warning');
        }
      }
      await todoApi.reorder({
        projectId: selectedProjectId!,
        columns: boardDataToReorderColumns(newData),
      });
    }
    catch { showToast('Failed to persist card order', 'error'); loadData(selectedProjectId!); }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim() || !selectedProjectId) return;
    if (!canWrite) return;
    try {
      const createdStatus = await todoStatusApi.create({ projectId: selectedProjectId, name: newColumnName.trim(), color: newColumnColor, order: statuses.length });
      const nextStatuses = [...statuses, createdStatus];
      const nextTodosByStatus = new Map(todosByStatus);
      nextTodosByStatus.set(createdStatus.id, []);

      setStatuses(nextStatuses);
      setTodosByStatus(nextTodosByStatus);
      setDataSource(statusesToBoardData(nextStatuses, nextTodosByStatus));
      if (!hasActiveFilters) {
        setBoardCache(selectedProjectId, { statuses: nextStatuses, todosByStatus: nextTodosByStatus });
      }
      setNewColumnName(''); setShowAddColumn(false); showToast('Column created!', 'success');
    } catch { showToast('Failed to create column', 'error'); }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!selectedProjectId) return;
    if (!canWrite) return;
    try { await todoStatusApi.delete(columnId); showToast('Column deleted', 'success'); loadData(selectedProjectId); }
    catch { showToast('Cannot delete column (has cards?)', 'error'); }
  };

  const handleColumnMove = async (move: { columnId: string; fromIndex: number; toIndex: number }) => {
    if (!dataSource) return;
    if (!canWrite) return;
    const newData = dropColumnHandler(move, dataSource);
    setDataSource(newData);

    // Update order for all columns based on new root.children order
    const newOrder = newData.root.children;
    try {
      await Promise.all(newOrder.map((colId, idx) => todoStatusApi.update(colId, { order: idx })));
    } catch { showToast('Failed to reorder columns', 'error'); loadData(selectedProjectId!); }
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setFilterPriority('ALL');
    setFilterJiraStatus('ALL');
    setFilterDueDate('ALL');
  };

  if (isProjectLoading || isLoading) {
    return <div className="todo-board-loading"><Spinner size="lg" /><p>Loading your board...</p></div>;
  }

  const totalTasks = Array.from(todosByStatus.values()).reduce((a, b) => a + b.length, 0);
  const hasColumns = dataSource && dataSource.root.children.length > 0;
  const canWrite = selectedProject?.permission === 'WRITE' || selectedProject?.permission === 'WRITE_INVITE';
  const canInvite = selectedProject?.permission === 'WRITE_INVITE';
  const renderAttachments = (attachments: TodoAttachment[] = [], compact = false) => {
    if (attachments.length === 0) return null;

    return (
      <div className={compact ? 'todo-attachment-grid todo-attachment-grid--compact' : 'todo-attachment-grid'}>
        {attachments.map((attachment) => (
          <div className="todo-attachment" key={attachment.id}>
            {isImageAttachment(attachment) ? (
              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                <img src={attachment.url} alt={attachment.originalName} />
              </a>
            ) : isVideoAttachment(attachment) ? (
              <video src={attachment.url} controls />
            ) : (
              <a href={attachment.url} target="_blank" rel="noopener noreferrer">{attachment.originalName}</a>
            )}
            {!compact && (
              <div className="todo-attachment-meta">
                <span title={attachment.originalName}>{attachment.originalName}</span>
                {canWrite && <button type="button" onClick={() => handleDeleteAttachment(attachment.id)}><X size={13} /></button>}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="todo-board">
      <div className="todo-board-header">
        <div className="todo-board-header-left">
          <h1>{selectedProject?.name || 'Board'}</h1>
          <span className="todo-board-count">{totalTasks} tasks</span>
        </div>
        <div className="todo-board-header-right">
          {canInvite && <button className="btn-ghost" onClick={handleOpenShare} disabled={!selectedProjectId}><Users size={16} /> Share</button>}
          <button className="btn-ghost" onClick={handleOpenJiraSettings} disabled={!selectedProjectId || !canWrite}><Settings size={16} /> Jira Settings</button>
          <button className="btn-primary" onClick={() => setShowAddColumn(true)} disabled={!canWrite}><Plus size={16} /> Add Column</button>
        </div>
      </div>

      <div className="todo-board-filters">
        <div className="todo-board-search">
          <Search size={16} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tasks by title..."
          />
        </div>
        <div className="todo-board-filter-group">
          <SlidersHorizontal size={16} />
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as TodoPriority | 'ALL')}>
            <option value="ALL">All priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select value={filterJiraStatus} onChange={(e) => setFilterJiraStatus(e.target.value as JiraSyncStatus | 'ALL')}>
            <option value="ALL">All Jira statuses</option>
            <option value="NOT_LINKED">Not linked</option>
            <option value="SYNCED">Synced</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <select value={filterDueDate} onChange={(e) => setFilterDueDate(e.target.value as DueDateFilter)}>
            <option value="ALL">All due dates</option>
            <option value="OVERDUE">Overdue</option>
            <option value="TODAY">Due today</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="NO_DUE">No due date</option>
          </select>
          {hasActiveFilters && <button className="btn-ghost" onClick={resetFilters}>Clear filters</button>}
        </div>
      </div>

      {showAddColumn && canWrite && (
        <div className="todo-add-column-bar">
          <input type="text" placeholder="Column name..." value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') setShowAddColumn(false); }}
            autoFocus
          />
          <div className="todo-add-column-colors">
            {DEFAULT_COLUMN_COLORS.map((c) => (
              <button key={c} className={`todo-color-btn ${newColumnColor === c ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => setNewColumnColor(c)} />
            ))}
          </div>
          <div className="todo-add-column-actions">
            <button className="btn-primary" onClick={handleAddColumn}>Create</button>
            <button className="btn-ghost" onClick={() => setShowAddColumn(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="todo-board-content">
        {hasColumns ? (
          <Kanban
            dataSource={dataSource}
            configMap={{
              card: {
                render: ({ data }) => <TodoCard data={data} onOpen={handleEditTodo} onDelete={(todo) => canWrite && setDeletingTodo(todo)} />,
                isDraggable: canWrite,
              },
            }}
            allowColumnDrag={canWrite}
            onColumnMove={handleColumnMove}
            columnClassName={() => 'todo-board-column'}
            renderColumnHeader={(column) => {
              const color = (column.content as { color?: string })?.color || '#6366f1';
              return (
                <div className="todo-column-header">
                  <div className="todo-column-header-left">
                      {canWrite && <GripVertical size={14} className="todo-column-grip" />}
                    <div className="todo-column-dot" style={{ backgroundColor: color }} />
                    <span className="todo-column-name">{column.title}</span>
                    <span className="todo-column-count">{column.totalItemsCount || 0}</span>
                  </div>
                  {canWrite && <button className="todo-column-delete" onClick={() => handleDeleteColumn(column.id)} title="Delete column"><Trash2 size={14} /></button>}
                </div>
              );
            }}
            cardsGap={8}
            virtualization={false}
            onCardMove={handleCardMove}
            renderListFooter={(column) =>
              addingCardForColumn === column.id ? (
                <AddCardForm statusId={column.id} onAdd={handleAddCard} onCancel={() => setAddingCardForColumn(null)} />
              ) : (
                canWrite ? <button className="todo-add-card-btn" onClick={() => setAddingCardForColumn(column.id)}><Plus size={16} /> Add card</button> : null
              )
            }
            allowListFooter={() => canWrite}
          />
        ) : (
          <div className="todo-board-empty">
            <AlertCircle size={48} /><h3>No columns yet</h3><p>Create your first column to start organizing tasks</p>
            {canWrite && <button className="btn-primary" onClick={() => setShowAddColumn(true)}><Plus size={16} /> Create Column</button>}
          </div>
        )}
      </div>

      {editingTodo && (
        <div className="todo-detail-overlay" onClick={() => setEditingTodo(null)}>
          <aside className="todo-detail-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="todo-detail-header">
              <div className="todo-detail-title-wrap">
                <span className="todo-detail-eyebrow">Task details</span>
                <h2>{editingTodo.title}</h2>
              </div>
              <button className="todo-detail-close" onClick={() => setEditingTodo(null)} disabled={isSavingEdit}><X size={18} /></button>
            </div>

            <div className="todo-detail-body">
              <section className="todo-detail-section">
                <h3>Overview</h3>
                <div className="todo-edit-form">
                  <div className="auth-field"><label>Title</label><input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} disabled={!canWrite} /></div>
                  <div className="auth-field"><label>Description</label><textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={5} placeholder="Describe the task..." disabled={!canWrite} /></div>
                </div>
              </section>

              <section className="todo-detail-section">
                <h3>Planning</h3>
                <div className="todo-edit-row">
                  <div className="auth-field"><label>Status</label><select value={editStatusId} onChange={(e) => setEditStatusId(e.target.value)} disabled={!canWrite}>{statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</select></div>
                  <div className="auth-field"><label>Priority</label><select value={editPriority} onChange={(e) => setEditPriority(e.target.value as TodoPriority)} disabled={!canWrite}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></div>
                </div>
                <div className="todo-edit-row">
                  <div className="auth-field todo-due-field">
                    <label>Due Date</label>
                    <div className="todo-due-picker">
                      <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} disabled={!canWrite} />
                      <div className="todo-due-quick-actions">
                        <button type="button" onClick={() => setEditDueDate(getRelativeDateInputValue(0))}>Today</button>
                        <button type="button" onClick={() => setEditDueDate(getRelativeDateInputValue(1))}>Tomorrow</button>
                        <button type="button" onClick={() => setEditDueDate(getRelativeDateInputValue(7))}>Next week</button>
                        {editDueDate && <button type="button" onClick={() => setEditDueDate('')}>Clear</button>}
                      </div>
                      <small className={`todo-due-helper todo-due-helper--${editDueDateInfo.state}`}>{editDueDateInfo.helper}</small>
                    </div>
                  </div>
                  <div className="auth-field"><label>Position</label><input type="text" value={editingTodo.position + 1} readOnly /></div>
                </div>
              </section>

              <section className="todo-detail-section">
                <h3>Metadata</h3>
                  <div className="auth-field"><label>Tags (comma separated)</label><input type="text" value={editTagsStr} onChange={(e) => setEditTagsStr(e.target.value)} placeholder="bug, frontend, urgent" disabled={!canWrite} /></div>
                  <div className="auth-field"><label>AI Summary</label><textarea value={editAiSummary} onChange={(e) => setEditAiSummary(e.target.value)} rows={3} placeholder="Brief AI summary..." disabled={!canWrite} /></div>
                <div className="auth-field todo-checkbox-field">
                  <input type="checkbox" checked={editGeneratedByAi} onChange={(e) => setEditGeneratedByAi(e.target.checked)} id="gen-ai" disabled={!canWrite} />
                  <label htmlFor="gen-ai">Generated by AI</label>
                </div>
                <div className="auth-field">
                  <label>External Links</label>
                  {editExternalLinks.map((link, idx) => (
                    <div className="todo-detail-link-row" key={idx}>
                      <input type="text" placeholder="Name" value={link.name} onChange={(e) => {
                        const newLinks = [...editExternalLinks]; newLinks[idx].name = e.target.value; setEditExternalLinks(newLinks);
                      }} />
                      <input type="text" placeholder="URL" value={link.url} onChange={(e) => {
                        const newLinks = [...editExternalLinks]; newLinks[idx].url = e.target.value; setEditExternalLinks(newLinks);
                      }} />
                      <button type="button" className="btn-ghost" onClick={() => {
                        const newLinks = editExternalLinks.filter((_, i) => i !== idx); setEditExternalLinks(newLinks);
                      }}><X size={16} /></button>
                    </div>
                  ))}
                  <button type="button" className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '4px 8px' }} onClick={() => setEditExternalLinks([...editExternalLinks, { name: '', url: '' }])}>
                    <Plus size={14} /> Add Link
                  </button>
                </div>
              </section>

              <section className="todo-detail-section">
                <h3>Jira</h3>
                <div className="auth-field">
                  <label>Jira Issue Key</label>
                  <input type="text" value={editJiraIssueKey} onChange={(e) => setEditJiraIssueKey(e.target.value.toUpperCase())} placeholder="PROJ-123" disabled={!canWrite} />
                  <small>Used to sync status changes with Jira. Leave blank to unlink.</small>
                </div>
                <div className="todo-detail-meta-grid">
                  <div className={`todo-detail-meta-card todo-card-jira-${editingTodo.jiraSyncStatus?.toLowerCase()}`}><span>Sync status</span><strong>{editingTodo.jiraSyncStatus}</strong></div>
                  {editingTodo.jiraIssueUrl && <a className="todo-detail-jira-link" href={editingTodo.jiraIssueUrl} target="_blank" rel="noopener noreferrer"><Link2 size={14} /> Open Jira issue</a>}
                </div>
              </section>

              <section className="todo-detail-section">
                <h3><Paperclip size={15} /> Attachments</h3>
                {renderAttachments((editingTodo.attachments || []).filter((attachment) => !attachment.commentId)) || <div className="todo-comments-empty">No attachments yet.</div>}
                {canWrite && (
                  <label className="todo-upload-dropzone">
                    <Upload size={16} />
                    <span>{attachmentsUploading ? 'Uploading...' : 'Upload images or videos'}</span>
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/quicktime"
                      multiple
                      disabled={attachmentsUploading}
                      onChange={(e) => {
                        void handleUploadTaskAttachments(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </section>

              <section className="todo-detail-section">
                <h3><MessageSquare size={15} /> Comments</h3>
                <div className="todo-comments">
                  <div className="todo-comment-composer">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      placeholder={canWrite ? 'Add a comment...' : 'Read-only access'}
                      disabled={!canWrite}
                    />
                    {newCommentImages.length > 0 && (
                      <div className="todo-pending-images">
                        {newCommentImages.map((file, index) => (
                          <span key={`${file.name}-${index}`}>{file.name}<button type="button" onClick={() => setNewCommentImages((current) => current.filter((_, i) => i !== index))}><X size={12} /></button></span>
                        ))}
                      </div>
                    )}
                    <div className="todo-comment-composer-actions">
                      <label className="btn-ghost todo-comment-image-picker">
                        <Paperclip size={14} /> Images
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={!canWrite || attachmentsUploading}
                          onChange={(e) => setNewCommentImages(Array.from(e.target.files || []))}
                        />
                      </label>
                      <button className="btn-primary" onClick={handleAddComment} disabled={!canWrite || attachmentsUploading || (!newComment.trim() && newCommentImages.length === 0)}><Send size={14} /> Add Comment</button>
                    </div>
                  </div>

                  {commentsLoading ? (
                    <div className="todo-comments-empty"><Spinner size="sm" /> Loading comments...</div>
                  ) : comments.length === 0 ? (
                    <div className="todo-comments-empty">No comments yet.</div>
                  ) : (
                    <div className="todo-comment-list">
                      {comments.map((comment) => (
                        <div className="todo-comment" key={comment.id}>
                          <div className="todo-comment-meta">
                            <span>{comment.createdBy === 'optimistic' ? 'You' : `User ${comment.userId.slice(0, 8)}`}</span>
                            <time>{new Date(comment.createdAt).toLocaleString()}</time>
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="todo-comment-edit">
                              <textarea value={editingCommentContent} onChange={(e) => setEditingCommentContent(e.target.value)} rows={3} />
                              <div className="todo-comment-actions">
                                <button className="btn-ghost" onClick={() => { setEditingCommentId(null); setEditingCommentContent(''); }}>Cancel</button>
                                <button className="btn-primary" onClick={() => handleSaveComment(comment.id)} disabled={!editingCommentContent.trim()}><Check size={14} /> Save</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {comment.content && <p>{comment.content}</p>}
                              {renderAttachments(comment.attachments || [], true)}
                              {canWrite && !comment.id.startsWith('temp-') && (
                                <div className="todo-comment-actions">
                                  <button className="btn-ghost" onClick={() => handleStartEditComment(comment)}>Edit</button>
                                  <button className="btn-ghost" onClick={() => handleDeleteComment(comment.id)}>Delete</button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="todo-detail-section">
                <h3><History size={15} /> Activity</h3>
                {activitiesLoading ? (
                  <div className="todo-comments-empty"><Spinner size="sm" /> Loading activities...</div>
                ) : activities.length === 0 ? (
                  <div className="todo-comments-empty">No activity yet.</div>
                ) : (
                  <div className="todo-activity-list">
                    {activities.map((activity) => (
                      <div className="todo-activity" key={activity.id}>
                        <div className="todo-activity-dot" />
                        <div className="todo-activity-content">
                          <div className="todo-activity-main">
                            <strong>{activity.message}</strong>
                            <time>{new Date(activity.createdAt).toLocaleString()}</time>
                          </div>
                          {activity.metadata?.changes && activity.metadata.changes.length > 0 && (
                            <div className="todo-activity-changes">
                              {activity.metadata.changes.map((change, index) => (
                                <span key={`${change.field}-${index}`}>
                                  {change.field}: {formatActivityValue(change.from)} → {formatActivityValue(change.to)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="todo-detail-section">
                <h3>Audit</h3>
                <div className="todo-detail-meta-grid">
                  <div className="todo-detail-meta-card"><span>Created</span><strong>{new Date(editingTodo.createdAt).toLocaleString()}</strong></div>
                  <div className="todo-detail-meta-card"><span>Updated</span><strong>{new Date(editingTodo.updatedAt).toLocaleString()}</strong></div>
                </div>
              </section>
            </div>

            <div className="todo-detail-footer">
              {canWrite && <button className="btn-danger" onClick={() => setDeletingTodo(editingTodo)} disabled={isSavingEdit}><Trash2 size={16} /> Delete</button>}
              <div className="todo-detail-footer-actions">
                <button className="btn-ghost" onClick={() => setEditingTodo(null)} disabled={isSavingEdit}>Cancel</button>
                <button className="btn-primary" onClick={handleSaveEdit} disabled={isSavingEdit || !canWrite}>
                  {isSavingEdit ? <><Spinner size="sm" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <Modal isOpen={showJiraSettings} onClose={() => setShowJiraSettings(false)} title="Jira Settings" size="lg"
        footer={<div className="todo-modal-footer"><button className="btn-ghost" onClick={() => setShowJiraSettings(false)}>Close</button>{jiraHasConfig && <button className="btn-danger" onClick={handleDisconnectJira} disabled={jiraLoading}>Disconnect</button>}<button className="btn-ghost" onClick={handleTestJiraConnection} disabled={jiraLoading || !jiraHasConfig}>Test Connection</button><button className="btn-primary" onClick={handleSaveJiraSettings} disabled={jiraLoading}>{jiraLoading ? 'Saving...' : 'Save Jira Settings'}</button></div>}
      >
        <div className="todo-jira-settings">
          <div className="todo-jira-section">
            <h4>Project Connection</h4>
            <p>Configure Jira for the selected project only. Leave API token blank to keep the existing token.</p>
            <div className="todo-edit-row">
              <div className="auth-field"><label>Jira Domain</label><input type="url" value={jiraDomain} onChange={(e) => setJiraDomain(e.target.value)} placeholder="https://company.atlassian.net" /></div>
              <div className="auth-field"><label>Jira Project Key</label><input type="text" value={jiraProjectKey} onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())} placeholder="PROJ" /></div>
            </div>
            <div className="todo-edit-row">
              <div className="auth-field"><label>Auth Type</label><select value={jiraAuthType} onChange={(e) => setJiraAuthType(e.target.value as JiraAuthType)}><option value={JiraAuthType.BASIC}>Basic</option><option value={JiraAuthType.BEARER}>Bearer</option></select></div>
              {jiraAuthType === JiraAuthType.BASIC && <div className="auth-field"><label>Jira Email</label><input type="email" value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} placeholder="you@company.com" /></div>}
            </div>
            <div className="auth-field"><label>API Token</label><input type="password" value={jiraApiToken} onChange={(e) => setJiraApiToken(e.target.value)} placeholder={jiraHasConfig ? 'Leave blank to keep existing token' : 'Required for first-time setup'} /></div>
          </div>

          <div className="todo-jira-section">
            <h4>Status Transition Mappings</h4>
            <p>Map each local board column to a Jira transition id. Empty rows are ignored.</p>
            <div className="todo-jira-mappings">
              {statuses.map((status) => (
                <div className="todo-jira-mapping-row" key={status.id}>
                  <div className="todo-jira-status"><span className="todo-column-dot" style={{ backgroundColor: status.color || '#6366f1' }} />{status.name}</div>
                  <input type="text" value={jiraMappings[status.id]?.jiraTransitionId || ''} onChange={(e) => setJiraMappings((prev) => ({ ...prev, [status.id]: { jiraTransitionId: e.target.value, jiraTransitionName: prev[status.id]?.jiraTransitionName || '' } }))} placeholder="Transition ID" />
                  <input type="text" value={jiraMappings[status.id]?.jiraTransitionName || ''} onChange={(e) => setJiraMappings((prev) => ({ ...prev, [status.id]: { jiraTransitionId: prev[status.id]?.jiraTransitionId || '', jiraTransitionName: e.target.value } }))} placeholder="Transition name" />
                </div>
              ))}
              {statuses.length === 0 && <p>No columns yet. Create columns before adding transition mappings.</p>}
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showShare} onClose={() => setShowShare(false)} title="Share Board" size="lg">
        <div className="todo-jira-settings">
          <div className="todo-jira-section">
            <h4>Invite collaborator</h4>
            <div className="todo-edit-row">
              <div className="auth-field"><label>Email</label><input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@example.com" /></div>
              <div className="auth-field"><label>Permission</label><select value={invitePermission} onChange={(e) => setInvitePermission(e.target.value as ProjectMemberPermission)}><option value="READ">Read only</option><option value="WRITE">Write</option><option value="WRITE_INVITE">Write and invite</option></select></div>
            </div>
            <button className="btn-primary" onClick={handleInviteMember} disabled={membersLoading || !inviteEmail.trim()}><Users size={16} /> Invite</button>
          </div>
          <div className="todo-jira-section">
            <h4>Collaborators</h4>
            {membersLoading ? <div className="todo-comments-empty"><Spinner size="sm" /> Loading collaborators...</div> : members.length === 0 ? <p>No collaborators yet.</p> : (
              <div className="todo-comment-list">
                {members.map((member) => (
                  <div className="todo-comment" key={member.id}>
                    <div className="todo-comment-meta"><span>{member.userName || member.userEmail || member.userId}</span><time>{member.userEmail}</time></div>
                    <div className="todo-comment-actions">
                      <select value={member.permission} onChange={(e) => handleUpdateMemberPermission(member.id, e.target.value as ProjectMemberPermission)} disabled={membersLoading}>
                        <option value="READ">Read only</option>
                        <option value="WRITE">Write</option>
                        <option value="WRITE_INVITE">Write and invite</option>
                      </select>
                      <button className="btn-ghost" onClick={() => handleRemoveMember(member.id)} disabled={membersLoading}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deletingTodo} onClose={() => setDeletingTodo(null)} title="Delete Card" size="sm"
        footer={<div className="todo-modal-footer"><button className="btn-ghost" onClick={() => setDeletingTodo(null)}>Cancel</button><button className="btn-danger" onClick={handleDeleteTodo}>Delete</button></div>}
      >
        <p>Are you sure you want to delete <strong>"{deletingTodo?.title}"</strong>? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default TodoBoard;
