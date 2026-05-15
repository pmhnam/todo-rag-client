import { useContext } from 'react';
import { ProjectContext, type ProjectContextType } from './projectContext';

export const useProjects = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};
