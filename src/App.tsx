import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { Project, Task } from './types';

const NEW_PROJECT_TEMPLATE: Task[] = [
    { id: 'A', name: 'Start Task', duration: 1, predecessors: [] },
];

export default function App() {
    const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);

    // Load from LocalStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('pathfinder_projects');
        if (saved) {
            try {
                setProjects(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load projects", e);
            }
        }
    }, []);

    // Save to LocalStorage whenever projects change
    useEffect(() => {
        if (projects.length > 0) {
            localStorage.setItem('pathfinder_projects', JSON.stringify(projects));
        }
    }, [projects]);

    const handleCreateProject = (name: string) => {
        const newProject: Project = {
            id: crypto.randomUUID(),
            name: name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            data: NEW_PROJECT_TEMPLATE,
            taskCount: 1
        };
        setProjects([newProject, ...projects]);
    };

    const handleOpenProject = (id: string) => {
        setActiveProjectId(id);
        setView('editor');
    };

    const handleDeleteProject = (id: string) => {
        if (window.confirm("Are you sure you want to delete this project?")) {
            setProjects(projects.filter(p => p.id !== id));
            localStorage.setItem('pathfinder_projects', JSON.stringify(projects.filter(p => p.id !== id)));
        }
    };

    const handleSaveProject = (id: string, taskData: Task[]) => {
        const updatedProjects = projects.map(p => {
            if (p.id === id) {
                return { ...p, data: taskData, taskCount: taskData.length, updatedAt: new Date().toISOString() };
            }
            return p;
        });
        setProjects(updatedProjects);
    };

    const handleBack = () => {
        setView('dashboard');
        setActiveProjectId(null);
    };

    const handleExportData = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "pathfinder_backup.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (e.target.files && e.target.files[0]) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (event) => {
                if (event.target?.result) {
                    try {
                        const parsed = JSON.parse(event.target.result as string);
                        if (Array.isArray(parsed)) {
                            if (window.confirm(`Importing ${parsed.length} projects. This will replace current data. Continue?`)) {
                                setProjects(parsed);
                            }
                        } else {
                            alert("Invalid file format");
                        }
                    } catch (error) {
                        console.error(error);
                        alert("Failed to parse JSON");
                    }
                }
            };
        }
    };

    const activeProject = projects.find(p => p.id === activeProjectId);

    if (view === 'editor' && activeProject) {
        return <Editor project={activeProject} onSave={handleSaveProject} onBack={handleBack} />;
    }

    return <Dashboard
        projects={projects}
        onCreateProject={handleCreateProject}
        onOpenProject={handleOpenProject}
        onDeleteProject={handleDeleteProject}
        onExportData={handleExportData}
        onImportData={handleImportData}
    />;
}
