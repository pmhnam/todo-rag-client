import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { projectApi } from '../api/projectApi';
import { workspaceApi } from '../api/workspaceApi';
import type { Project, Workspace } from '../api/types';
import { useAuth } from './useAuth';
import { ProjectContext, type BoardCacheEntry } from './projectContext';

const DEFAULT_PROJECT_NAME = 'My First Board';
const DEFAULT_WORKSPACE_NAME = 'My Workspace';

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [boardCacheByProjectId, setBoardCacheByProjectId] = useState<Record<string, BoardCacheEntry>>({});
  const boardCacheRef = useRef(boardCacheByProjectId);

  useEffect(() => {
    boardCacheRef.current = boardCacheByProjectId;
  }, [boardCacheByProjectId]);

  const createDefaultWorkspace = useCallback(async () => {
    const workspace = await workspaceApi.create({ name: DEFAULT_WORKSPACE_NAME });
    setWorkspaces([workspace]);
    setSelectedWorkspaceId(workspace.id);
    return workspace;
  }, []);

  const loadProjectsForWorkspace = useCallback(async (workspaceId: string) => {
    const res = await projectApi.getAll({ page: 1, limit: 100, workspaceId });
    setProjects(res.data || []);
    setSelectedProjectId((current) => current && res.data.some((project) => project.id === current) ? current : res.data[0]?.id || null);
    return res.data || [];
  }, []);

  const refreshProjects = useCallback(async () => {
    if (!selectedWorkspaceId) {
      setProjects([]);
      setSelectedProjectId(null);
      return;
    }
    await loadProjectsForWorkspace(selectedWorkspaceId);
  }, [loadProjectsForWorkspace, selectedWorkspaceId]);

  const refreshWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setProjects([]);
      setSelectedWorkspaceId(null);
      setSelectedProjectId(null);
      return;
    }

    setIsLoading(true);
    try {
      const workspaceRes = await workspaceApi.getAll({ page: 1, limit: 100 });
      const nextWorkspaces = workspaceRes.data?.length ? workspaceRes.data : [await createDefaultWorkspace()];
      setWorkspaces(nextWorkspaces);
      const nextWorkspaceId = selectedWorkspaceId && nextWorkspaces.some((workspace) => workspace.id === selectedWorkspaceId)
        ? selectedWorkspaceId
        : nextWorkspaces[0].id;
      setSelectedWorkspaceId(nextWorkspaceId);
      const nextProjects = await loadProjectsForWorkspace(nextWorkspaceId);
      if (nextProjects.length === 0) {
        const project = await projectApi.create({ name: DEFAULT_PROJECT_NAME, workspaceId: nextWorkspaceId });
        setProjects([project]);
        setSelectedProjectId(project.id);
      }
    } finally {
      setIsLoading(false);
    }
  }, [createDefaultWorkspace, isAuthenticated, loadProjectsForWorkspace, selectedWorkspaceId]);

  useEffect(() => {
    refreshWorkspaces().catch(() => {
      setIsLoading(false);
    });
  }, [refreshWorkspaces]);

  useEffect(() => {
    if (selectedWorkspaceId && isAuthenticated) {
      loadProjectsForWorkspace(selectedWorkspaceId).catch(() => undefined);
    }
  }, [isAuthenticated, loadProjectsForWorkspace, selectedWorkspaceId]);

  const selectWorkspace = useCallback((workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    setSelectedProjectId(null);
  }, []);

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
    if (!selectedWorkspaceId) throw new Error('No workspace selected');
    setIsSaving(true);
    try {
      const project = await projectApi.create({ name, workspaceId: selectedWorkspaceId });
      setProjects((current) => [...current, project]);
      setSelectedProjectId(project.id);
      return project;
    } finally {
      setIsSaving(false);
    }
  }, [selectedWorkspaceId]);

  const createWorkspace = useCallback(async (name: string) => {
    setIsSaving(true);
    try {
      const workspace = await workspaceApi.create({ name });
      const project = await projectApi.create({ name: DEFAULT_PROJECT_NAME, workspaceId: workspace.id });
      setWorkspaces((current) => [...current, workspace]);
      setSelectedWorkspaceId(workspace.id);
      setProjects([project]);
      setSelectedProjectId(project.id);
      return workspace;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const renameWorkspace = useCallback(async (workspaceId: string, name: string) => {
    setIsSaving(true);
    try {
      const workspace = await workspaceApi.update(workspaceId, { name });
      setWorkspaces((current) => current.map((item) => item.id === workspace.id ? workspace : item));
      return workspace;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    setIsSaving(true);
    try {
      await workspaceApi.delete(workspaceId);
      const remaining = workspaces.filter((workspace) => workspace.id !== workspaceId);
      if (remaining.length > 0) {
        setWorkspaces(remaining);
        setSelectedWorkspaceId(remaining[0].id);
        return remaining[0];
      }
      return await createDefaultWorkspace();
    } finally {
      setIsSaving(false);
    }
  }, [createDefaultWorkspace, workspaces]);

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
      if (!selectedWorkspaceId) throw new Error('No workspace selected');
      const project = await projectApi.create({ name: DEFAULT_PROJECT_NAME, workspaceId: selectedWorkspaceId });
      setProjects([project]);
      setSelectedProjectId(project.id);
      return project;
    } finally {
      setIsSaving(false);
    }
  }, [projects, selectedWorkspaceId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null,
    [selectedWorkspaceId, workspaces],
  );

  return (
    <ProjectContext.Provider
      value={{
        projects,
        workspaces,
        selectedWorkspaceId,
        selectedWorkspace,
        selectedProjectId,
        selectedProject,
        isLoading,
        isSaving,
        refreshProjects,
        refreshWorkspaces,
        selectWorkspace,
        createWorkspace,
        renameWorkspace,
        deleteWorkspace,
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
