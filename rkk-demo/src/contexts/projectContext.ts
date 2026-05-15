import { createContext } from 'react';
import type { Project } from '../api/types';

export interface ProjectContextType {
  projects: Project[];
  selectedProjectId: string | null;
  selectedProject: Project | null;
  isLoading: boolean;
  isSaving: boolean;
  refreshProjects: () => Promise<void>;
  selectProject: (projectId: string) => void;
  createProject: (name: string) => Promise<Project>;
  renameProject: (projectId: string, name: string) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<Project>;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
