import type { CreateProjectRequest, Project, ProjectWithDetails, UpdateProjectRequest } from "@common/types";
import { useCallback, useEffect, useState } from "react";
import { callIpc, useAsyncTask } from "./useAsync";
/**
 * Hooks for Project entities with unified async handling.
 */

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const { loading, error, run, reset } = useAsyncTask();

    const loadProjects = useCallback(async (filter?: { search?: string; status?: string; template_id?: number }) => {
        await run(async () => {
            const data = await callIpc(() => window.ContextBridge.project.list(filter), "Failed to load projects");
            setProjects(data || []);
            return undefined as unknown as void;
        });
    }, []);

    const createProject = useCallback(async (request: CreateProjectRequest) => {
        reset();
        const created = await callIpc(() => window.ContextBridge.project.create(request), "Failed to create project");
        await loadProjects();
        return created;
    }, [loadProjects]);

    const updateProject = useCallback(async (request: UpdateProjectRequest) => {
        reset();
        const updated = await callIpc(() => window.ContextBridge.project.update(request), "Failed to update project");
        await loadProjects();
        return updated;
    }, [loadProjects]);

    const deleteProject = useCallback(async (project_id: number) => {
        reset();
        await callIpc(() => window.ContextBridge.project.delete(project_id), "Failed to delete project");
        await loadProjects();
    }, [loadProjects]);

    const exportProject = useCallback(async (project_id: number) => {
        reset();
        return await callIpc(() => window.ContextBridge.project.export(project_id), "Failed to export project");
    }, []);

    const printProject = useCallback(async (project_id: number) => {
        reset();
        return await callIpc(() => window.ContextBridge.project.print(project_id), "Failed to print project");
    }, []);

    const importProject = useCallback(async () => {
        reset();
        const imported = await callIpc(() => window.ContextBridge.project.import(), "Failed to import project");
        await loadProjects();
        return imported;
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
        printProject,
    };
}

export function useProject(project_id: number | null) {
    const [project, setProject] = useState<ProjectWithDetails | null>(null);
    const { loading, error, run } = useAsyncTask();

    const loadProject = useCallback(async (id: number) => {
        await run(async () => {
            const data = await callIpc(() => window.ContextBridge.project.get(id), "Failed to load project");
            setProject(data || null);
            return undefined as unknown as void;
        });
    }, []);

    const checkComplete = useCallback(async (id: number) => {
        const res = await window.ContextBridge.project.checkComplete(id);
        return res.success && Boolean(res.data);
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


