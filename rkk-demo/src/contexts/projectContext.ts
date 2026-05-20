import { createContext } from 'react';
import type { Project, Todo, TodoStatus, Workspace } from '../api/types';

export interface BoardCacheEntry {
  statuses: TodoStatus[];
  todosByStatus: Map<string, Todo[]>;
}

export interface ProjectContextType {
  projects: Project[];
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  selectedWorkspace: Workspace | null;
  selectedProjectId: string | null;
  selectedProject: Project | null;
  isLoading: boolean;
  isSaving: boolean;
  refreshProjects: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  selectWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<Workspace>;
  deleteWorkspace: (workspaceId: string) => Promise<Workspace>;
  selectProject: (projectId: string) => void;
  createProject: (name: string) => Promise<Project>;
  renameProject: (projectId: string, name: string) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<Project>;
  getBoardCache: (projectId: string) => BoardCacheEntry | undefined;
  setBoardCache: (projectId: string, cache: BoardCacheEntry) => void;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
