import React, { useState, useEffect, useCallback } from 'react';
import { Kanban, type BoardData, type BoardItem, dropHandler, dropColumnHandler } from 'react-kanban-kit';
import { todoApi, todoStatusApi } from '../../api/todoApi';
import { projectApi } from '../../api/projectApi';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import type { Todo, TodoStatus, CreateTodoReq, TodoPriority, Project } from '../../api/types';
import {
  Plus, Trash2, Calendar, Flag, GripVertical, X, Edit3, AlertCircle, Sparkles, Link2
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

// ─── TodoCard ──────────────────────────────────────────

const TodoCard: React.FC<{
  data: BoardItem;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}> = ({ data, onEdit, onDelete }) => {
  const todo = data.content as Todo;
  if (!todo?.priority) return <div className="todo-card"><div className="todo-card-title">{data.title}</div></div>;
  return (
    <div className="todo-card">
      <div className="todo-card-header">
        <div className="todo-card-priority">
          <Flag size={14} style={{ color: PRIORITY_COLORS[todo.priority] }} fill={PRIORITY_COLORS[todo.priority]} />
          <span style={{ color: PRIORITY_COLORS[todo.priority] }}>{PRIORITY_LABELS[todo.priority]}</span>
          {todo.generatedByAi && <span title="AI Generated" style={{ display: 'inline-flex' }}><Sparkles size={14} style={{ color: '#8b5cf6', marginLeft: 4 }} /></span>}
        </div>
        <div className="todo-card-actions">
          <button onClick={(e) => { e.stopPropagation(); onEdit(todo); }} title="Edit"><Edit3 size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(todo); }} title="Delete"><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="todo-card-title">{todo.title}</div>
      {todo.description && <div className="todo-card-description">{todo.description}</div>}
      {todo.aiSummary && <div className="todo-card-ai-summary" style={{ fontSize: '11px', color: '#6b7280', marginTop: 4, fontStyle: 'italic', background: '#f3f4f6', padding: '4px 6px', borderRadius: 4 }}>✨ {todo.aiSummary}</div>}
      {todo.tags && todo.tags.length > 0 && (
        <div className="todo-card-tags" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
          {todo.tags.map(tag => (
            <span key={tag} style={{ fontSize: '10px', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: 10 }}>#{tag}</span>
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
          <div className="todo-card-due"><Calendar size={12} /><span>{new Date(todo.dueDate).toLocaleDateString()}</span></div>
        )}
        {todo.jiraIssueKey && (
          <a href={todo.jiraIssueUrl} target="_blank" rel="noopener noreferrer" className="todo-card-jira" onClick={(e) => e.stopPropagation()}>
            🎫 {todo.jiraIssueKey}
          </a>
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

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ 
      title: title.trim(), 
      statusId, 
      priority,
      tags: tagsStr ? tagsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined
    });
    setTitle('');
    setTagsStr('');
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<TodoStatus[]>([]);
  const [todosByStatus, setTodosByStatus] = useState<Map<string, Todo[]>>(new Map());
  const [dataSource, setDataSource] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addingCardForColumn, setAddingCardForColumn] = useState<string | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState(DEFAULT_COLUMN_COLORS[0]);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TodoPriority>('MEDIUM');
  const [editDueDate, setEditDueDate] = useState('');
  const [editTagsStr, setEditTagsStr] = useState('');
  const [editAiSummary, setEditAiSummary] = useState('');
  const [editGeneratedByAi, setEditGeneratedByAi] = useState(false);
  const [editExternalLinks, setEditExternalLinks] = useState<{name: string, url: string}[]>([]);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);

  const { showToast } = useToast();

  const loadProjects = useCallback(async () => {
    try {
      const res = await projectApi.getAll({ page: 1, limit: 100 });
      if (res.data && res.data.length > 0) {
        setProjects(res.data);
        setSelectedProjectId(res.data[0].id);
      } else {
        const newProject = await projectApi.create({ name: 'My First Board' });
        setProjects([newProject]);
        setSelectedProjectId(newProject.id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      showToast('Failed to load projects', 'error');
      setIsLoading(false);
    }
  }, [showToast]);

  const loadData = useCallback(async (projectId: string) => {
    setIsLoading(true);
    try {
      const statusRes = await todoStatusApi.getAll({ projectId, page: 1, limit: 50 });
      const fetchedStatuses: TodoStatus[] = statusRes.data || [];
      setStatuses(fetchedStatuses);

      const todosMap = new Map<string, Todo[]>();
      for (const status of fetchedStatuses) {
        const todosRes = await todoApi.getAll({ projectId, statusId: status.id, page: 1, limit: 100 });
        todosMap.set(status.id, todosRes.data || []);
      }
      setTodosByStatus(todosMap);
      setDataSource(statusesToBoardData(fetchedStatuses, todosMap));
    } catch (err) {
      console.error('Failed to load board data:', err);
      showToast('Failed to load board. Please check API connection.', 'error');
      const emptyBoard: BoardData = { root: { id: 'root', title: 'Board', parentId: null, children: [], totalChildrenCount: 0, totalItemsCount: 0 } };
      setDataSource(emptyBoard);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => { 
    if (selectedProjectId) {
      loadData(selectedProjectId); 
    }
  }, [selectedProjectId, loadData]);

  const handleAddCard = async (data: Omit<CreateTodoReq, 'projectId'>) => {
    if (!selectedProjectId) return;
    try { await todoApi.create({ ...data, projectId: selectedProjectId }); setAddingCardForColumn(null); showToast('Card created!', 'success'); loadData(selectedProjectId); }
    catch { showToast('Failed to create card', 'error'); }
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo); setEditTitle(todo.title); setEditDescription(todo.description || '');
    setEditPriority(todo.priority); setEditDueDate(todo.dueDate ? todo.dueDate.split('T')[0] : '');
    setEditTagsStr(todo.tags?.join(', ') || '');
    setEditAiSummary(todo.aiSummary || '');
    setEditGeneratedByAi(todo.generatedByAi || false);
    setEditExternalLinks(todo.externalLinks || []);
  };

  const handleSaveEdit = async () => {
    if (!editingTodo) return;
    try {
      await todoApi.update(editingTodo.id, { 
        title: editTitle, 
        description: editDescription || undefined, 
        priority: editPriority, 
        dueDate: editDueDate || undefined,
        tags: editTagsStr ? editTagsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
        aiSummary: editAiSummary || undefined,
        generatedByAi: editGeneratedByAi,
        externalLinks: editExternalLinks
      });
      setEditingTodo(null); showToast('Card updated!', 'success'); loadData(selectedProjectId!);
    } catch { showToast('Failed to update card', 'error'); }
  };

  const handleDeleteTodo = async () => {
    if (!deletingTodo || !selectedProjectId) return;
    try { await todoApi.delete(deletingTodo.id); setDeletingTodo(null); showToast('Card deleted', 'success'); loadData(selectedProjectId); }
    catch { showToast('Failed to delete card', 'error'); }
  };

  const handleCardMove = async (move: { cardId: string; fromColumnId: string; toColumnId: string; taskAbove: string | null; taskBelow: string | null; position: number }) => {
    if (!dataSource) return;
    const newData = dropHandler(move, dataSource, () => {},
      (newCol) => ({ ...newCol, totalItemsCount: (newCol.totalItemsCount || 0) + 1, totalChildrenCount: (newCol.totalChildrenCount || 0) + 1 }),
      (srcCol) => ({ ...srcCol, totalItemsCount: (srcCol.totalItemsCount || 0) - 1, totalChildrenCount: (srcCol.totalChildrenCount || 0) - 1 }),
    );
    setDataSource(newData);

    const { cardId, toColumnId, fromColumnId } = move;
    if (toColumnId !== fromColumnId) {
      try { await todoApi.update(cardId, { statusId: toColumnId }); }
      catch { showToast('Failed to move card', 'error'); loadData(selectedProjectId!); }
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim() || !selectedProjectId) return;
    try {
      await todoStatusApi.create({ projectId: selectedProjectId, name: newColumnName.trim(), color: newColumnColor, order: statuses.length });
      setNewColumnName(''); setShowAddColumn(false); showToast('Column created!', 'success'); loadData(selectedProjectId);
    } catch { showToast('Failed to create column', 'error'); }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!selectedProjectId) return;
    try { await todoStatusApi.delete(columnId); showToast('Column deleted', 'success'); loadData(selectedProjectId); }
    catch { showToast('Cannot delete column (has cards?)', 'error'); }
  };

  const handleColumnMove = async (move: { columnId: string; fromIndex: number; toIndex: number }) => {
    if (!dataSource) return;
    const newData = dropColumnHandler(move, dataSource);
    setDataSource(newData);

    // Update order for all columns based on new root.children order
    const newOrder = newData.root.children;
    try {
      await Promise.all(newOrder.map((colId, idx) => todoStatusApi.update(colId, { order: idx })));
    } catch { showToast('Failed to reorder columns', 'error'); loadData(selectedProjectId!); }
  };

  if (isLoading) {
    return <div className="todo-board-loading"><Spinner size="lg" /><p>Loading your board...</p></div>;
  }

  const totalTasks = Array.from(todosByStatus.values()).reduce((a, b) => a + b.length, 0);
  const hasColumns = dataSource && dataSource.root.children.length > 0;

  return (
    <div className="todo-board">
      <div className="todo-board-header">
        <div className="todo-board-header-left" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <select 
            value={selectedProjectId || ''} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ 
              padding: '6px 12px', 
              fontSize: '18px', 
              fontWeight: 'bold', 
              border: 'none', 
              backgroundColor: 'transparent',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <span className="todo-board-count">{totalTasks} tasks</span>
        </div>
        <div className="todo-board-header-right">
          <button className="btn-primary" onClick={() => setShowAddColumn(true)}><Plus size={16} /> Add Column</button>
        </div>
      </div>

      {showAddColumn && (
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
                render: ({ data }) => <TodoCard data={data} onEdit={handleEditTodo} onDelete={(todo) => setDeletingTodo(todo)} />,
                isDraggable: true,
              },
            }}
            allowColumnDrag
            onColumnMove={handleColumnMove}
            columnClassName={() => 'todo-board-column'}
            renderColumnHeader={(column) => {
              const color = (column.content as { color?: string })?.color || '#6366f1';
              return (
                <div className="todo-column-header">
                  <div className="todo-column-header-left">
                    <GripVertical size={14} className="todo-column-grip" />
                    <div className="todo-column-dot" style={{ backgroundColor: color }} />
                    <span className="todo-column-name">{column.title}</span>
                    <span className="todo-column-count">{column.totalItemsCount || 0}</span>
                  </div>
                  <button className="todo-column-delete" onClick={() => handleDeleteColumn(column.id)} title="Delete column"><Trash2 size={14} /></button>
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
                <button className="todo-add-card-btn" onClick={() => setAddingCardForColumn(column.id)}><Plus size={16} /> Add card</button>
              )
            }
            allowListFooter={() => true}
          />
        ) : (
          <div className="todo-board-empty">
            <AlertCircle size={48} /><h3>No columns yet</h3><p>Create your first column to start organizing tasks</p>
            <button className="btn-primary" onClick={() => setShowAddColumn(true)}><Plus size={16} /> Create Column</button>
          </div>
        )}
      </div>

      <Modal isOpen={!!editingTodo} onClose={() => setEditingTodo(null)} title="Edit Card" size="md"
        footer={<div className="todo-modal-footer"><button className="btn-ghost" onClick={() => setEditingTodo(null)}>Cancel</button><button className="btn-primary" onClick={handleSaveEdit}>Save Changes</button></div>}
      >
        <div className="todo-edit-form">
          <div className="auth-field"><label>Title</label><input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
          <div className="auth-field"><label>Description</label><textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} /></div>
          <div className="todo-edit-row">
            <div className="auth-field"><label>Priority</label><select value={editPriority} onChange={(e) => setEditPriority(e.target.value as TodoPriority)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></div>
            <div className="auth-field"><label>Due Date</label><input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} /></div>
          </div>
          <div className="auth-field"><label>Tags (comma separated)</label><input type="text" value={editTagsStr} onChange={(e) => setEditTagsStr(e.target.value)} placeholder="bug, frontend, urgent" /></div>
          <div className="auth-field"><label>AI Summary</label><textarea value={editAiSummary} onChange={(e) => setEditAiSummary(e.target.value)} rows={2} placeholder="Brief AI summary..." /></div>
          <div className="auth-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={editGeneratedByAi} onChange={(e) => setEditGeneratedByAi(e.target.checked)} id="gen-ai" />
            <label htmlFor="gen-ai" style={{ margin: 0 }}>Generated by AI</label>
          </div>
          <div className="auth-field">
            <label>External Links</label>
            {editExternalLinks.map((link, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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
