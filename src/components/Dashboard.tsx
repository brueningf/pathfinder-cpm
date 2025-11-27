
import React, { useState } from 'react';
import { Activity, Plus, FileText, LayoutGrid, Trash2, Download, Upload, Coffee, Moon, Sun } from 'lucide-react';
import { Project } from '../types';
import { AbstractHero } from './AbstractHero';

interface DashboardProps {
    onOpenProject: (id: string) => void;
    onDeleteProject: (id: string) => void;
    projects: Project[];
    onCreateProject: (name: string) => void;
    onExportData: () => void;
    onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenRequirements: (id: string) => void;
    onLoadExample?: () => void;
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
    onOpenProject, onDeleteProject, projects, onCreateProject, onExportData, onImportData, onOpenRequirements, onLoadExample, theme, toggleTheme
}) => {
    const [newProjectName, setNewProjectName] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        onCreateProject(newProjectName);
        setNewProjectName('');
    };

    const isDark = theme === 'dark';

    return (
        <div className={`min-h-screen font-sans relative ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-stone-50 text-stone-800'}`}>
            {/* Top Bar with Coffee Button & Theme Toggle */}
            <div className="absolute top-6 right-8 z-50 flex items-center gap-3">
                <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-stone-100 shadow-sm border border-stone-200'}`}>
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <a href="https://ko-fi.com/brueningf" target="_blank" rel="noopener noreferrer" className="btn bg-[#FF5E5B] text-white hover:bg-[#ff4542] border-none shadow-lg shadow-red-500/20 text-sm">
                    <Coffee size={16} /> <span className="hidden md:inline">Buy me a coffee</span>
                </a>
            </div>

            {/* Hero Section */}
            <div className={`relative h-[350px] md:h-[500px] overflow-hidden flex flex-col items-center pt-28 md:pt-20 mb-8 ${isDark ? 'bg-slate-950' : 'bg-stone-100'}`}>
                <AbstractHero theme={theme} />
                <div className="relative z-10 text-center pointer-events-none select-none">
                    <h1 className={`text-3xl md:text-5xl font-black mb-4 tracking-wider ${isDark ? 'text-white' : 'text-stone-800'}`} style={{ fontFamily: '"Orbitron", sans-serif' }}>PATHFINDER</h1>
                    <p className={`text-xs md:text-sm tracking-[0.3em] uppercase ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>Project Administration & CPM Analysis</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 md:px-8 pb-12 relative z-20 -mt-20 md:-mt-32">

                {/* Info Section with Fading Border Effect */}
                <div className={`relative p-[1px] rounded-xl mb-8 overflow-hidden`}>
                    <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/50 to-purple-500/20 opacity-50 rounded-xl pointer-events-none`}></div>
                    <div className={`relative p-8 rounded-xl backdrop-blur-xl ${isDark ? 'bg-slate-900/80 text-slate-400' : 'bg-white/90 text-stone-600 shadow-xl'}`}>
                        <p className="mb-4 text-base">
                            <strong className={isDark ? 'text-slate-200' : 'text-stone-800'}>Welcome to Pathfinder.</strong> This tool is designed to help software engineering students and professionals visualize and analyze project schedules using the Critical Path Method (CPM).
                        </p>
                        <p className="mb-4">
                            Create a new project, define your tasks and their dependencies, and Pathfinder will automatically calculate the Critical Path, Earliest/Latest Start/Finish times, and Slack for each task. You can also define project requirements and prioritize them using the MoSCoW method.
                        </p>
                        <p className="text-xs text-slate-500 mt-6 pt-4 border-t border-dashed border-slate-700/50">
                            <strong className={isDark ? 'text-slate-400' : 'text-stone-500'}>Privacy Note:</strong> All data is stored locally in your browser's Local Storage. No data is sent to any server. Please use the Export feature to backup your work or transfer it to another device.
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-end gap-2 mb-6">
                    <label className={`btn border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                        <Upload size={16} /> Import JSON
                        <input type="file" accept=".json" onChange={onImportData} className="hidden" />
                    </label>
                    <button onClick={onExportData} className={`btn border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                        <Download size={16} /> Export All JSON
                    </button>
                </div>

                {/* Create New */}
                <div className={`p-6 rounded-2xl shadow-lg border mb-8 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`}>
                    <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>Create New Diagram</h2>
                    <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Project Name (e.g., Office Relocation)"
                            className={`flex-1 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 ${isDark ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-600' : 'bg-stone-50 border-stone-200 text-stone-800 placeholder-stone-400'}`}
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                        />
                        <button type="submit" disabled={!newProjectName} className="btn bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600">
                            <Plus size={20} /> Create
                        </button>
                    </form>
                </div>

                {/* List */}
                <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>Saved Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.length === 0 && (
                        <div className={`col-span-2 text-center py-12 rounded-2xl border border-dashed ${isDark ? 'text-slate-500 bg-slate-900/50 border-slate-800' : 'text-stone-400 bg-stone-50 border-stone-300'}`}>
                            <FileText size={48} className="mx-auto mb-2 opacity-30" />
                            <p>No diagrams found. Create one above!</p>
                        </div>
                    )}
                    {projects.map(p => (
                        <div key={p.id} className={`group p-5 rounded-2xl shadow-sm border transition-all flex flex-col gap-4 ${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-stone-200 hover:border-stone-300'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-800 text-red-500' : 'bg-stone-100 text-red-500'}`}>
                                    <LayoutGrid size={20} />
                                </div>
                                <div>
                                    <h3 className={`font-bold transition-colors ${isDark ? 'text-slate-200 group-hover:text-white' : 'text-stone-700 group-hover:text-stone-900'}`}>{p.name}</h3>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'Just now'} • {p.taskCount} tasks</p>
                                </div>
                            </div>
                            <div className="flex items-stretch gap-2 w-full">
                                <button onClick={() => onOpenRequirements(p.id)} className={`btn flex-1 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700' : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'}`}>
                                    Requirements
                                </button>
                                <button onClick={() => onOpenProject(p.id)} className={`btn flex-1 ${isDark ? 'bg-slate-100 hover:bg-white text-slate-900 border-none' : 'bg-stone-800 hover:bg-stone-900 text-white border-none'}`}>
                                    Open Diagram
                                </button>
                                <button onClick={() => onDeleteProject(p.id)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-600 hover:text-red-500 hover:bg-red-500/10' : 'text-stone-400 hover:text-red-500 hover:bg-red-50'}`}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className={`mt-16 pt-8 pb-8 border-t text-center ${isDark ? 'border-slate-800 text-slate-600' : 'border-stone-200 text-stone-400'}`}>
                {onLoadExample && (
                    <button onClick={onLoadExample} className={`text-xs mb-4 hover:underline ${isDark ? 'text-blue-500 hover:text-blue-400' : 'text-blue-600 hover:text-blue-700'}`}>
                        Need inspiration? Load Example Project
                    </button>
                )}
                <p className="text-xs">
                    Pathfinder • Made by <a href="https://fredesk.com" target="_blank" rel="noopener noreferrer" className={`hover:underline ${isDark ? 'text-slate-500 hover:text-slate-400' : 'text-stone-500 hover:text-stone-600'}`}>Fredesk</a>
                </p>
            </div>
        </div>
    );
};
