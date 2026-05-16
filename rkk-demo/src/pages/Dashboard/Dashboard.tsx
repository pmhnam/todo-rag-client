import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Flag,
  FolderKanban,
  MessageSquare,
  RefreshCw,
  TicketCheck,
} from 'lucide-react';
import { todoApi, todoStatusApi } from '../../api/todoApi';
import type { Project, Todo, TodoPriority, TodoStatus } from '../../api/types';
import { Spinner } from '../../components/Spinner';
import { useProjects } from '../../contexts/useProjects';
import { useToast } from '../../components/Toast';

type DashboardProjectData = {
  project: Project;
  statuses: TodoStatus[];
  todos: Todo[];
};

type DashboardScope = 'ALL' | string;

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDueBucket(todo: Todo) {
  if (!todo.dueDate) return 'none';
  const today = startOfToday();
  const due = new Date(todo.dueDate);
  due.setHours(0, 0, 0, 0);
  if (isSameDay(due, today)) return 'today';
  if (due < today) return 'overdue';
  return 'upcoming';
}

function sortByDueDate(a: Todo, b: Todo) {
  return new Date(a.dueDate || a.createdAt).getTime() - new Date(b.dueDate || b.createdAt).getTime();
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { projects, selectedProjectId, selectedProject, isLoading: isProjectLoading, selectProject } = useProjects();
  const [scope, setScope] = useState<DashboardScope>('ALL');
  const [data, setData] = useState<DashboardProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (selectedProjectId) setScope(selectedProjectId);
  }, [selectedProjectId]);

  const loadDashboard = useCallback(async () => {
    if (projects.length === 0) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const selectedProjects = scope === 'ALL'
        ? projects
        : projects.filter((project) => project.id === scope);

      const nextData = await Promise.all(
        selectedProjects.map(async (project) => {
          const [statusRes, todos] = await Promise.all([
            todoStatusApi.getAll({ projectId: project.id, page: 1, limit: 100 }),
            todoApi.getBoard({ projectId: project.id, page: 1, limit: 1000 }),
          ]);
          return {
            project,
            statuses: statusRes.data || [],
            todos,
          };
        }),
      );

      setData(nextData);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      showToast('Failed to load dashboard', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [projects, scope, showToast]);

  useEffect(() => {
    if (!isProjectLoading) {
      loadDashboard();
    }
  }, [isProjectLoading, loadDashboard]);

  const allTodos = useMemo(() => data.flatMap((item) => item.todos), [data]);
  const doneStatusIds = useMemo(() => {
    return new Set(
      data.flatMap((item) =>
        item.statuses
          .filter((status) => /done|complete|closed/i.test(status.name))
          .map((status) => status.id),
      ),
    );
  }, [data]);

  const metrics = useMemo(() => {
    const total = allTodos.length;
    const completed = allTodos.filter((todo) => doneStatusIds.has(todo.statusId)).length;
    const overdue = allTodos.filter((todo) => getDueBucket(todo) === 'overdue').length;
    const dueToday = allTodos.filter((todo) => getDueBucket(todo) === 'today').length;
    const highPriority = allTodos.filter((todo) => todo.priority === 'HIGH').length;
    const jiraIssues = allTodos.filter((todo) => todo.jiraIssueKey).length;
    const jiraAttention = allTodos.filter((todo) => todo.jiraSyncStatus === 'FAILED' || todo.jiraSyncStatus === 'PENDING').length;
    const aiGenerated = allTodos.filter((todo) => todo.generatedByAi).length;
    return { total, completed, overdue, dueToday, highPriority, jiraIssues, jiraAttention, aiGenerated };
  }, [allTodos, doneStatusIds]);

  const statusBreakdown = useMemo(() => {
    return data.flatMap((item) =>
      item.statuses.map((status) => ({
        project: item.project,
        status,
        count: item.todos.filter((todo) => todo.statusId === status.id).length,
      })),
    );
  }, [data]);

  const priorityCounts = useMemo(() => {
    return (['HIGH', 'MEDIUM', 'LOW'] as TodoPriority[]).map((priority) => ({
      priority,
      count: allTodos.filter((todo) => todo.priority === priority).length,
    }));
  }, [allTodos]);

  const overdueTasks = useMemo(() => allTodos.filter((todo) => getDueBucket(todo) === 'overdue').sort(sortByDueDate).slice(0, 6), [allTodos]);
  const dueTodayTasks = useMemo(() => allTodos.filter((todo) => getDueBucket(todo) === 'today').sort(sortByDueDate).slice(0, 6), [allTodos]);
  const jiraAttentionTasks = useMemo(() => allTodos.filter((todo) => todo.jiraSyncStatus === 'FAILED' || todo.jiraSyncStatus === 'PENDING').slice(0, 6), [allTodos]);
  const aiGeneratedTasks = useMemo(() => allTodos.filter((todo) => todo.generatedByAi).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6), [allTodos]);

  const projectById = useMemo(() => new Map(data.map((item) => [item.project.id, item.project])), [data]);

  const openProject = (projectId: string) => {
    selectProject(projectId);
    navigate(`/board?projectId=${projectId}`);
  };

  const renderTaskList = (tasks: Todo[], emptyText: string) => (
    <div className="dashboard-task-list">
      {tasks.length === 0 ? (
        <div className="dashboard-empty-line">{emptyText}</div>
      ) : (
        tasks.map((todo) => (
          <button key={todo.id} className="dashboard-task-row" onClick={() => openProject(todo.projectId)}>
            <div>
              <strong>{todo.title}</strong>
              <span>{projectById.get(todo.projectId)?.name || selectedProject?.name || 'Project'}</span>
            </div>
            <small>{todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : todo.priority}</small>
          </button>
        ))
      )}
    </div>
  );

  if (isProjectLoading || isLoading) {
    return <div className="dashboard-loading"><Spinner size="lg" /><p>Loading dashboard...</p></div>;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">Workspace overview</span>
          <h1>Dashboard</h1>
          <p>Track workload, due dates, Jira health, and AI-created tasks.</p>
        </div>
        <div className="dashboard-actions">
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="ALL">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <button className="btn-ghost" onClick={loadDashboard}><RefreshCw size={16} /> Refresh</button>
          <Link className="btn-primary" to={selectedProjectId ? `/board?projectId=${selectedProjectId}` : '/board'}><FolderKanban size={16} /> Open Board</Link>
        </div>
      </div>

      <div className="dashboard-kpis">
        <div className="dashboard-kpi"><ClipboardList /><span>Total tasks</span><strong>{metrics.total}</strong></div>
        <div className="dashboard-kpi"><CheckCircle2 /><span>Completed</span><strong>{metrics.completed}</strong></div>
        <div className="dashboard-kpi danger"><AlertTriangle /><span>Overdue</span><strong>{metrics.overdue}</strong></div>
        <div className="dashboard-kpi warning"><CalendarClock /><span>Due today</span><strong>{metrics.dueToday}</strong></div>
        <div className="dashboard-kpi hot"><Flag /><span>High priority</span><strong>{metrics.highPriority}</strong></div>
        <div className="dashboard-kpi"><TicketCheck /><span>Jira linked</span><strong>{metrics.jiraIssues}</strong></div>
        <div className="dashboard-kpi warning"><TicketCheck /><span>Jira attention</span><strong>{metrics.jiraAttention}</strong></div>
        <div className="dashboard-kpi ai"><Bot /><span>AI generated</span><strong>{metrics.aiGenerated}</strong></div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel dashboard-panel-large">
          <h2>Status breakdown</h2>
          <div className="dashboard-bars">
            {statusBreakdown.length === 0 ? <div className="dashboard-empty-line">No statuses yet.</div> : statusBreakdown.map(({ project, status, count }) => {
              const percent = metrics.total ? Math.round((count / metrics.total) * 100) : 0;
              return (
                <button key={`${project.id}-${status.id}`} className="dashboard-bar-row" onClick={() => openProject(project.id)}>
                  <div className="dashboard-bar-label"><span style={{ backgroundColor: status.color || '#6366f1' }} />{scope === 'ALL' ? `${project.name} / ${status.name}` : status.name}</div>
                  <div className="dashboard-bar-track"><div style={{ width: `${percent}%`, backgroundColor: status.color || '#6366f1' }} /></div>
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>
        </section>

        <section className="dashboard-panel">
          <h2>Priority</h2>
          <div className="dashboard-priority-list">
            {priorityCounts.map(({ priority, count }) => (
              <div key={priority} className={`dashboard-priority dashboard-priority-${priority.toLowerCase()}`}>
                <span>{PRIORITY_LABELS[priority]}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-panel">
          <h2>Overdue</h2>
          {renderTaskList(overdueTasks, 'No overdue tasks.')}
        </section>

        <section className="dashboard-panel">
          <h2>Due today</h2>
          {renderTaskList(dueTodayTasks, 'No tasks due today.')}
        </section>

        <section className="dashboard-panel">
          <h2>Jira health</h2>
          {renderTaskList(jiraAttentionTasks, 'No Jira sync issues.')}
        </section>

        <section className="dashboard-panel">
          <h2>Latest AI tasks</h2>
          {renderTaskList(aiGeneratedTasks, 'No AI-generated tasks yet.')}
        </section>
      </div>

      <div className="dashboard-footer-actions">
        <Link to="/chat" className="btn-ghost"><MessageSquare size={16} /> Ask AI about these tasks</Link>
      </div>
    </div>
  );
};

export default Dashboard;
