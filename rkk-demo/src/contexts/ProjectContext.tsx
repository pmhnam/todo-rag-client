import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { projectApi } from '../api/projectApi';
import type { Project } from '../api/types';
import { useAuth } from './useAuth';
import { ProjectContext, type BoardCacheEntry } from './projectContext';

const DEFAULT_PROJECT_NAME = 'My First Board';

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [boardCacheByProjectId, setBoardCacheByProjectId] = useState<Record<string, BoardCacheEntry>>({});
  const boardCacheRef = useRef(boardCacheByProjectId);

  useEffect(() => {
    boardCacheRef.current = boardCacheByProjectId;
  }, [boardCacheByProjectId]);

  const createDefaultProject = useCallback(async () => {
    const project = await projectApi.create({ name: DEFAULT_PROJECT_NAME });
    setProjects([project]);
    setSelectedProjectId(project.id);
    return project;
  }, []);

  const refreshProjects = useCallback(async () => {
    if (!isAuthenticated) {
      setProjects([]);
      setSelectedProjectId(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await projectApi.getAll({ page: 1, limit: 100 });
      if (res.data && res.data.length > 0) {
        setProjects(res.data);
        setSelectedProjectId((current) => current && res.data.some((project) => project.id === current) ? current : res.data[0].id);
      } else {
        await createDefaultProject();
      }
    } finally {
      setIsLoading(false);
    }
  }, [createDefaultProject, isAuthenticated]);

  useEffect(() => {
    refreshProjects().catch(() => {
      setIsLoading(false);
    });
  }, [refreshProjects]);

  const selectProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
  }, []);

  const getBoardCache = useCallback((projectId: string) => {
    return boardCacheRef.current[projectId];
  }, []);

  const setBoardCache = useCallback((projectId: string, cache: BoardCacheEntry) => {
    setBoardCacheByProjectId((current) => ({ ...current, [projectId]: cache }));
  }, []);

  const createProject = useCallback(async (name: string) => {
    setIsSaving(true);
    try {
      const project = await projectApi.create({ name });
      setProjects((current) => [...current, project]);
      setSelectedProjectId(project.id);
      return project;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const renameProject = useCallback(async (projectId: string, name: string) => {
    setIsSaving(true);
    try {
      const project = await projectApi.update(projectId, { name });
      setProjects((current) => current.map((item) => item.id === project.id ? project : item));
      return project;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    setIsSaving(true);
    try {
      await projectApi.delete(projectId);
      setBoardCacheByProjectId((current) => {
        const remainingCache = { ...current };
        delete remainingCache[projectId];
        return remainingCache;
      });
      const remainingProjects = projects.filter((project) => project.id !== projectId);
      if (remainingProjects.length > 0) {
        const nextProject = remainingProjects[0];
        setProjects(remainingProjects);
        setSelectedProjectId(nextProject.id);
        return nextProject;
      }
      return await createDefaultProject();
    } finally {
      setIsSaving(false);
    }
  }, [createDefaultProject, projects]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProjectId,
        selectedProject,
        isLoading,
        isSaving,
        refreshProjects,
        selectProject,
        createProject,
        renameProject,
        deleteProject,
        getBoardCache,
        setBoardCache,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
