import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { Requirements } from './components/Requirements';
import { Project, Task, Requirement } from './types';

const NEW_PROJECT_TEMPLATE: Task[] = [
    { id: 'A', name: 'Start Task', duration: 1, predecessors: [] },
];

const EXAMPLE_PROJECT: Project = {
    id: 'example-mobile-app',
    name: 'Mobile App Launch 🚀',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    taskCount: 12,
    data: [
        { id: 'A', name: 'Market Research', duration: 5, predecessors: [], type: 'start' },
        { id: 'B', name: 'Define Requirements', duration: 3, predecessors: ['A'], type: 'task' },
        { id: 'C', name: 'UI/UX Design', duration: 8, predecessors: ['B'], type: 'task' },
        { id: 'D', name: 'Tech Stack Selection', duration: 2, predecessors: ['B'], type: 'task' },
        { id: 'E', name: 'Frontend Dev', duration: 10, predecessors: ['C', 'D'], type: 'task' },
        { id: 'F', name: 'Backend Dev', duration: 12, predecessors: ['D'], type: 'task' },
        { id: 'G', name: 'API Integration', duration: 5, predecessors: ['E', 'F'], type: 'task' },
        { id: 'H', name: 'Testing', duration: 5, predecessors: ['G'], type: 'task' },
        { id: 'I', name: 'Bug Fixes', duration: 3, predecessors: ['H'], type: 'task' },
        { id: 'J', name: 'App Store Submission', duration: 2, predecessors: ['I'], type: 'task' },
        { id: 'K', name: 'Marketing Campaign', duration: 7, predecessors: ['C'], type: 'task' },
        { id: 'L', name: 'Launch', duration: 0, predecessors: ['J', 'K'], type: 'end' },
    ],
    requirements: [
        { id: 'R1', title: 'User Authentication', description: 'Secure login via Email and OAuth (Google, Apple).', priority: 'Must', type: 'Functional', status: 'Approved' },
        { id: 'R2', title: 'Push Notifications', description: 'Real-time alerts for user engagement.', priority: 'Should', type: 'Functional', status: 'Pending' },
        { id: 'R3', title: 'Offline Mode', description: 'App must function without internet connection for core features.', priority: 'Must', type: 'Non-Functional', status: 'Draft' },
    ]
};

export default function App() {
    const [projects, setProjects] = useState<Project[]>(() => {
        const saved = localStorage.getItem('pathfinder_projects');
        return saved ? JSON.parse(saved) : [EXAMPLE_PROJECT];
    });
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [view, setView] = useState<'dashboard' | 'editor' | 'requirements'>('dashboard');

    // Save to LocalStorage whenever projects change
    useEffect(() => {
        localStorage.setItem('pathfinder_projects', JSON.stringify(projects));
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

    const handleUpdateRequirements = (reqs: Requirement[]) => {
        if (!activeProjectId) return;
        const updatedProjects = projects.map(p =>
            p.id === activeProjectId ? { ...p, requirements: reqs, updatedAt: new Date().toISOString() } : p
        );
        setProjects(updatedProjects);
    };

    const activeProject = projects.find(p => p.id === activeProjectId);

    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (localStorage.getItem('pathfinder_theme') as 'dark' | 'light') || 'dark';
    });

    useEffect(() => {
        localStorage.setItem('pathfinder_theme', theme);
        // Update body class for global styles if needed
        document.body.className = theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50';
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // ... existing code ...

    if (view === 'editor' && activeProject) {
        return <Editor project={activeProject} onSave={handleSaveProject} onBack={handleBack} theme={theme} />;
    }

    if (view === 'requirements' && activeProject) {
        return (
            <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50'}`}>
                <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'} border-b px-4 py-3 flex items-center gap-4`}>
                    <button onClick={handleBack} className={`p-2 rounded-lg flex items-center gap-2 transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-stone-100 text-stone-500'}`}>
                        <ChevronLeft size={20} /> <span className="font-medium">Back</span>
                    </button>
                    <div className={`h-6 w-px ${theme === 'dark' ? 'bg-slate-800' : 'bg-stone-200'}`}></div>
                    <h1 className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-stone-800'}`}>{activeProject.name}</h1>
                </div>
                <Requirements requirements={activeProject.requirements || []} onUpdate={handleUpdateRequirements} theme={theme} />
            </div>
        );
    }

    const handleLoadExample = () => {
        if (window.confirm("Load example project? This will add 'Mobile App Launch' to your projects.")) {
            const exampleWithNewId = { ...EXAMPLE_PROJECT, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
            setProjects([exampleWithNewId, ...projects]);
        }
    };

    return <Dashboard
        projects={projects}
        onCreateProject={handleCreateProject}
        onOpenProject={handleOpenProject}
        onOpenRequirements={(id) => { setActiveProjectId(id); setView('requirements'); }}
        onDeleteProject={handleDeleteProject}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onLoadExample={handleLoadExample}
        theme={theme}
        toggleTheme={toggleTheme}
    />;
}
