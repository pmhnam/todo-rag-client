import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Edit3, FolderKanban, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Navigation } from "../Navigation";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { useProjects } from "../../contexts/useProjects";
import { useAuth } from "../../contexts/useAuth";
import type { Project } from "../../api/types";

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const {
    projects,
    selectedProjectId,
    isLoading,
    isSaving,
    selectProject,
    createProject,
    renameProject,
    deleteProject,
  } = useProjects();
  const [projectName, setProjectName] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null);
  const openProjectMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openProjectMenuId) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!openProjectMenuRef.current?.contains(event.target as Node)) {
        setOpenProjectMenuId(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openProjectMenuId]);

  const goToProject = (projectId: string) => {
    selectProject(projectId);
    navigate(`/board?projectId=${projectId}`);
  };

  const handleCreateProject = async () => {
    const name = projectName.trim();
    if (!name) {
      showToast("Project name is required", "error");
      return;
    }

    try {
      const project = await createProject(name);
      setProjectName("");
      setShowCreateProject(false);
      goToProject(project.id);
      showToast("Project created", "success");
    } catch {
      showToast("Failed to create project", "error");
    }
  };

  const handleRenameProject = async () => {
    if (!renamingProject) return;
    const name = projectName.trim();
    if (!name) {
      showToast("Project name is required", "error");
      return;
    }

    try {
      await renameProject(renamingProject.id, name);
      setProjectName("");
      setRenamingProject(null);
      showToast("Project renamed", "success");
    } catch {
      showToast("Failed to rename project", "error");
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;

    try {
      const nextProject = await deleteProject(deletingProject.id);
      setDeletingProject(null);
      goToProject(nextProject.id);
      showToast("Project deleted", "success");
    } catch {
      showToast("Failed to delete project", "error");
    }
  };

  const openRenameProject = (project: Project) => {
    setOpenProjectMenuId(null);
    setProjectName(project.name);
    setRenamingProject(project);
  };

  const openDeleteProject = (project: Project) => {
    setOpenProjectMenuId(null);
    setDeletingProject(project);
  };

  return (
    <aside className="rkk-demo-sidebar">
      <div className="rkk-demo-sidebar-content">
        <div className="rkk-demo-sidebar-section">
          <h3 className="rkk-demo-sidebar-title">
            {t("navigation.myWorkspace")}
          </h3>
          <Navigation />
        </div>

        {isAuthenticated && (
          <div className="rkk-demo-sidebar-section rkk-demo-projects-section">
            <div className="rkk-demo-projects-header">
              <h3 className="rkk-demo-sidebar-title">Projects</h3>
              <button
                className="rkk-demo-project-add"
                onClick={() => { setProjectName(""); setShowCreateProject(true); }}
                title="New project"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="rkk-demo-project-list">
              {isLoading && <div className="rkk-demo-project-empty">Loading projects...</div>}
              {!isLoading && projects.map((project) => (
                <div className="rkk-demo-project-row" key={project.id}>
                  <button
                    className={`rkk-demo-project-item ${project.id === selectedProjectId ? "active" : ""}`}
                    onClick={() => goToProject(project.id)}
                    title={project.name}
                  >
                    <FolderKanban size={17} />
                    <span>{project.name}</span>
                  </button>
                  <div
                    className="rkk-demo-project-menu-wrap"
                    ref={openProjectMenuId === project.id ? openProjectMenuRef : undefined}
                  >
                    <button
                      className="rkk-demo-project-menu-btn"
                      onClick={() => setOpenProjectMenuId((current) => current === project.id ? null : project.id)}
                      title="Project actions"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {openProjectMenuId === project.id && (
                      <div className="rkk-demo-project-menu">
                        <button onClick={() => openRenameProject(project)}><Edit3 size={14} /> Rename</button>
                        <button className="danger" onClick={() => openDeleteProject(project)}><Trash2 size={14} /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showCreateProject} onClose={() => setShowCreateProject(false)} title="Create Project" size="sm"
        footer={<div className="todo-modal-footer"><button className="btn-ghost" onClick={() => setShowCreateProject(false)}>Cancel</button><button className="btn-primary" onClick={handleCreateProject} disabled={isSaving}>{isSaving ? "Creating..." : "Create"}</button></div>}
      >
        <div className="todo-edit-form">
          <div className="auth-field">
            <label>Project Name</label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); }} placeholder="Project name" autoFocus />
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!renamingProject} onClose={() => setRenamingProject(null)} title="Rename Project" size="sm"
        footer={<div className="todo-modal-footer"><button className="btn-ghost" onClick={() => setRenamingProject(null)}>Cancel</button><button className="btn-primary" onClick={handleRenameProject} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button></div>}
      >
        <div className="todo-edit-form">
          <div className="auth-field">
            <label>Project Name</label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleRenameProject(); }} placeholder="Project name" autoFocus />
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deletingProject} onClose={() => setDeletingProject(null)} title="Delete Project" size="sm"
        footer={<div className="todo-modal-footer"><button className="btn-ghost" onClick={() => setDeletingProject(null)}>Cancel</button><button className="btn-danger" onClick={handleDeleteProject} disabled={isSaving}>{isSaving ? "Deleting..." : "Delete"}</button></div>}
      >
        <p>Are you sure you want to delete <strong>"{deletingProject?.name}"</strong>? If this is the last project, a default project will be created automatically.</p>
      </Modal>
    </aside>
  );
};

export default Sidebar;
