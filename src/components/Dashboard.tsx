import React, { useState } from 'react';
import { Activity, Plus, FileText, LayoutGrid, Trash2 } from 'lucide-react';
import { Project } from '../types';

interface DashboardProps {
    onOpenProject: (id: string) => void;
    onDeleteProject: (id: string) => void;
    projects: Project[];
    onCreateProject: (name: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenProject, onDeleteProject, projects, onCreateProject }) => {
    const [newProjectName, setNewProjectName] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        onCreateProject(newProjectName);
        setNewProjectName('');
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                        <Activity size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Pathfinder</h1>
                        <p className="text-slate-500">Project Administration & CPM Analysis</p>
                    </div>
                </div>

                {/* Create New */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
                    <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Create New Diagram</h2>
                    <form onSubmit={handleCreate} className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Project Name (e.g., Office Relocation)"
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                        />
                        <button type="submit" disabled={!newProjectName} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2">
                            <Plus size={20} /> Create
                        </button>
                    </form>
                </div>

                {/* List */}
                <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Saved Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.length === 0 && (
                        <div className="col-span-2 text-center py-12 text-slate-400 bg-slate-100/50 rounded-2xl border border-dashed border-slate-300">
                            <FileText size={48} className="mx-auto mb-2 opacity-50" />
                            <p>No diagrams found. Create one above!</p>
                        </div>
                    )}
                    {projects.map(p => (
                        <div key={p.id} className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                    <LayoutGrid size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{p.name}</h3>
                                    <p className="text-xs text-slate-400">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'Just now'} • {p.taskCount} tasks</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onOpenProject(p.id)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors">
                                    Open
                                </button>
                                <button onClick={() => onDeleteProject(p.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
