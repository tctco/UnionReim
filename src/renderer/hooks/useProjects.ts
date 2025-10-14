import type { CreateProjectRequest, Project, ProjectWithDetails, UpdateProjectRequest } from "@common/types";
import { useCallback, useEffect, useState } from "react";

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadProjects = useCallback(async (filter?: { search?: string; status?: string; template_id?: number }) => {
        setLoading(true);
        setError(null);
        try {
            const response = await window.ContextBridge.project.list(filter);
            if (response.success && response.data) {
                setProjects(response.data);
            } else {
                setError(response.error || "Failed to load projects");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createProject = useCallback(async (request: CreateProjectRequest) => {
        setError(null);
        const response = await window.ContextBridge.project.create(request);
        if (response.success) {
            await loadProjects();
            return response.data!;
        } else {
            setError(response.error || "Failed to create project");
            throw new Error(response.error);
        }
    }, [loadProjects]);

    const updateProject = useCallback(async (request: UpdateProjectRequest) => {
        setError(null);
        const response = await window.ContextBridge.project.update(request);
        if (response.success) {
            await loadProjects();
            return response.data!;
        } else {
            setError(response.error || "Failed to update project");
            throw new Error(response.error);
        }
    }, [loadProjects]);

    const deleteProject = useCallback(async (project_id: number) => {
        setError(null);
        const response = await window.ContextBridge.project.delete(project_id);
        if (response.success) {
            await loadProjects();
        } else {
            setError(response.error || "Failed to delete project");
            throw new Error(response.error);
        }
    }, [loadProjects]);

    const exportProject = useCallback(async (project_id: number) => {
        setError(null);
        const response = await window.ContextBridge.project.export(project_id);
        if (response.success) {
            return response.data!;
        } else {
            setError(response.error || "Failed to export project");
            throw new Error(response.error);
        }
    }, []);

    const importProject = useCallback(async () => {
        setError(null);
        const response = await window.ContextBridge.project.import();
        if (response.success) {
            await loadProjects();
            return response.data!;
        } else {
            setError(response.error || "Failed to import project");
            throw new Error(response.error);
        }
    }, [loadProjects]);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    return {
        projects,
        loading,
        error,
        loadProjects,
        createProject,
        updateProject,
        deleteProject,
        exportProject,
        importProject,
    };
}

export function useProject(project_id: number | null) {
    const [project, setProject] = useState<ProjectWithDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadProject = useCallback(async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            const response = await window.ContextBridge.project.get(id);
            if (response.success && response.data) {
                setProject(response.data);
            } else {
                setError(response.error || "Failed to load project");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const checkComplete = useCallback(async (id: number) => {
        const response = await window.ContextBridge.project.checkComplete(id);
        return response.success && response.data;
    }, []);

    useEffect(() => {
        if (project_id) {
            loadProject(project_id);
        }
    }, [project_id, loadProject]);

    return {
        project,
        loading,
        error,
        loadProject,
        checkComplete,
    };
}


