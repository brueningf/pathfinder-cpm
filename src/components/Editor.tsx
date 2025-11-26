import React, { useState, useMemo, useRef } from 'react';
import { ChevronLeft, Activity, Save, Menu, Plus, Edit2, ZoomIn, ZoomOut, Move, Download, Image as ImageIcon } from 'lucide-react';
import { Project, Task, LayoutNode } from '../types';
import { calculateCPM } from '../utils/cpmLogic';
import { calculateLayout } from '../utils/layoutLogic';
import { Node } from './Node';
import { Connection } from './Connection';
import { EditTaskModal } from './EditTaskModal';
import { GanttChart } from './GanttChart';
import { toPng } from 'html-to-image';

interface EditorProps {
    project: Project;
    onSave: (id: string, taskData: Task[]) => void;
    onBack: () => void;
}

const NEW_PROJECT_TEMPLATE: Task[] = [
    { id: 'A', name: 'Start Task', duration: 1, predecessors: [] },
];

export const Editor: React.FC<EditorProps> = ({ project, onSave, onBack }) => {
    const [tasks, setTasks] = useState<Task[]>(project.data || NEW_PROJECT_TEMPLATE);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // -- Logic from previous App --
    const [zoom, setZoom] = useState(0.9);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, taskId: string | null } | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'diagram' | 'gantt'>('diagram'); // View mode state

    // Add Task Form State
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskDuration, setNewTaskDuration] = useState<number | string>(1);
    const [newTaskPred, setNewTaskPred] = useState('');
    const [newTaskType, setNewTaskType] = useState<'task' | 'start' | 'end'>('task');

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const exportRef = useRef<HTMLDivElement>(null); // Ref for export

    const { processedData, projectDuration } = useMemo(() => {
        const { error, processedTasks, projectDuration } = calculateCPM(tasks);
        if (error) return { processedData: [], projectDuration: 0, isError: error };
        const layoutTasks = calculateLayout(processedTasks);
        return { processedData: layoutTasks, projectDuration, isError: null };
    }, [tasks]);

    // Handlers
    const handleSave = () => {
        onSave(project.id, tasks);
        setLastSaved(new Date());
        setTimeout(() => setLastSaved(null), 2000);
    };

    const handleExport = async () => {
        if (exportRef.current === null) return;
        try {
            // Reset transform for capture to ensure full graph is visible?
            // Actually, capturing the current view is usually what users expect,
            // but for a large graph, we might want to capture the whole content.
            // For simplicity, let's capture the current viewport or the container.
            // Better yet: Capture the inner container that has the transform, but we need to handle the scale.
            // Let's stick to capturing the visible area for now or the whole canvas container.

            const dataUrl = await toPng(exportRef.current, { cacheBust: true, backgroundColor: '#f8fafc' });
            const link = document.createElement('a');
            link.download = `${project.name.replace(/\s+/g, '_')}_diagram.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to export image', err);
            alert('Failed to export image.');
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (contextMenu) setContextMenu(null);
        const scaleAmount = -e.deltaY * 0.001;
        setZoom(Math.min(Math.max(zoom + scaleAmount, 0.2), 3));
    };
    const handleMouseDown = (e: React.MouseEvent) => { if (e.button !== 0) return; if (contextMenu) setContextMenu(null); setIsDragging(true); setLastMousePos({ x: e.clientX, y: e.clientY }); };
    const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; const dx = e.clientX - lastMousePos.x; const dy = e.clientY - lastMousePos.y; setPan(prev => ({ x: prev.x + dx, y: prev.y + dy })); setLastMousePos({ x: e.clientX, y: e.clientY }); };
    const handleMouseUp = () => setIsDragging(false);
    const handleContextMenu = (e: React.MouseEvent, taskId: string) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, taskId }); };

    const addTask = (e: React.FormEvent) => {
        if (e) e.preventDefault(); if (!newTaskName.trim()) return;
        const existingIds = tasks.map(t => t.id); let nextId = 'A'; let i = 0; while (existingIds.includes(String.fromCharCode(65 + i))) i++; nextId = String.fromCharCode(65 + i); if (i > 25) nextId = `T${tasks.length + 1}`;
        const preds = newTaskPred.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== '');
        if (preds.filter(p => !tasks.map(t => t.id).includes(p)).length > 0) { setErrorMsg("Invalid IDs"); return; }

        setTasks([...tasks, {
            id: nextId,
            name: newTaskName,
            duration: newTaskType === 'task' ? (parseInt(newTaskDuration as string) || 1) : 0,
            predecessors: preds,
            type: newTaskType
        }]);
        setNewTaskName(''); setNewTaskPred(''); setErrorMsg(null); setNewTaskType('task');
    };
    const removeTask = (id: string) => {
        setTasks(tasks.filter(t => t.id !== id).map(t => ({ ...t, predecessors: t.predecessors.filter(p => p !== id) })));
        setContextMenu(null);
        setEditingTask(null);
    };

    const updateTask = (originalId: string, newId: string, updates: Partial<Task>) => {
        // 1. Map over tasks to update the edited task AND update references in others
        const updatedTasks = tasks.map(t => {
            if (t.id === originalId) {
                return { ...t, id: newId, ...updates };
            }
            // Update references if ID changed
            if (t.predecessors.includes(originalId)) {
                return {
                    ...t,
                    predecessors: t.predecessors.map(p => p === originalId ? newId : p)
                };
            }
            return t;
        });

        setTasks(updatedTasks);
        setEditingTask(null);
    };

    return (
        <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden select-none">
            {/* Modals */}
            {editingTask && <EditTaskModal task={editingTask} onSave={updateTask} onDelete={removeTask} onClose={() => setEditingTask(null)} allTaskIds={tasks.map(t => t.id)} />}

            {/* Top Navigation Bar */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 flex items-center gap-2 transition-colors">
                        <ChevronLeft size={20} /> <span className="hidden md:inline font-medium">Dashboard</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold"><Activity size={18} /></div>
                        <div>
                            <h1 className="font-bold text-slate-900 text-sm md:text-base">{project.name}</h1>
                            <p className="text-[10px] text-slate-400 hidden md:block">Last saved: {lastSaved ? 'Just now' : '...'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleExport} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-50 flex items-center gap-2 transition-all">
                        <ImageIcon size={16} /> <span className="hidden md:inline">Export PNG</span>
                    </button>
                    <button onClick={handleSave} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${lastSaved ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                        <Save size={16} /> {lastSaved ? 'Saved!' : 'Save'}
                    </button>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg md:hidden"><Menu size={24} /></button>
                </div>
            </div>

            {/* Sidebar (Adapted) */}
            <div className={`fixed inset-y-0 left-0 z-40 w-[300px] bg-white border-r border-slate-200 shadow-xl pt-20 transform transition-transform duration-300 md:relative md:translate-x-0 md:pt-0 md:top-16 md:shadow-none md:flex md:flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-[9px] uppercase font-bold text-slate-400">Duration</span>
                            <div className="text-xl font-bold text-slate-800">{projectDuration}d</div>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <span className="text-[9px] uppercase font-bold text-slate-400">Tasks</span>
                            <div className="text-xl font-bold text-slate-800">{tasks.length}</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                    <form onSubmit={addTask} className="space-y-3">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Quick Add</label>
                        <input type="text" placeholder="Name" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} />

                        <div className="flex gap-2">
                            <select className="w-1/3 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase" value={newTaskType} onChange={e => setNewTaskType(e.target.value as any)}>
                                <option value="task">Task</option>
                                <option value="start">Start</option>
                                <option value="end">End</option>
                            </select>
                            {newTaskType === 'task' && (
                                <input type="number" min="1" placeholder="Days" className="w-1/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={newTaskDuration} onChange={e => setNewTaskDuration(e.target.value)} />
                            )}
                        </div>

                        <input type="text" placeholder="Preds (e.g. A, B)" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase" value={newTaskPred} onChange={e => setNewTaskPred(e.target.value)} />

                        <button disabled={!newTaskName} type="submit" className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Plus size={16} /> Add</button>
                    </form>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Tasks</label>
                        {tasks.map(t => (
                            <div key={t.id} className="group flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg hover:border-blue-400 transition-colors cursor-pointer" onClick={() => setEditingTask(t)}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded ${t.type === 'start' ? 'bg-emerald-100 text-emerald-700' : t.type === 'end' ? 'bg-slate-800 text-white' : 'bg-slate-100'}`}>{t.id}</span>
                                    <span className="text-sm font-medium truncate">{t.name}</span>
                                </div>
                                <Edit2 size={12} className="text-slate-300 group-hover:text-blue-500" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative bg-slate-50 mt-16 overflow-hidden" ref={canvasRef} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
                {/* Main Content Area */}
                <div className="flex-1 overflow-auto bg-slate-50 relative">
                    {viewMode === 'gantt' ? (
                        <div className="p-8">
                            <GanttChart project={{ ...project, data: processedData.length > 0 ? processedData : tasks }} />
                        </div>
                    ) : (
                        <div className="min-w-[2000px] min-h-[2000px] relative" ref={exportRef} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.15s' }}>
                            {/* Grid background */}
                            <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`, backgroundSize: '24px 24px', transform: `translate(${pan.x % 24}px, ${pan.y % 24}px)` }} />

                            {/* Connections */}
                            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                                    </marker>
                                    <marker id="arrowhead-critical" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e" />
                                    </marker>
                                </defs>
                                {processedData.map(node => (
                                    node.predecessors.map(predId => {
                                        const predNode = processedData.find(n => n.id === predId);
                                        if (predNode) {
                                            const isCriticalConnection = node.isCritical && predNode.isCritical && (Math.abs(node.es - predNode.ef) < 0.001); // Simplified critical path check
                                            return (
                                                <Connection
                                                    key={`${predId}-${node.id}`}
                                                    start={{ x: predNode.x + 180, y: predNode.y + 40 }}
                                                    end={{ x: node.x, y: node.y + 40 }}
                                                    isCritical={isCriticalConnection}
                                                />
                                            );
                                        }
                                        return null;
                                    })
                                ))}
                            </svg>

                            {/* Nodes */}
                            {processedData.map(node => (
                                <Node
                                    key={node.id}
                                    data={node as LayoutNode}
                                    onContextMenu={(e) => handleContextMenu(e, node.id)} // Reverted to original handler
                                    onDoubleClick={() => setEditingTask(node as LayoutNode)}
                                />
                            ))}
                        </div>
                    )}
                </div>
                {/* Floating Controls */}
                <div className="absolute bottom-6 right-6 flex gap-2">
                    <button onClick={() => setZoom(Math.min(zoom + 0.1, 2))} className="p-3 bg-white shadow-lg rounded-full text-slate-600 hover:bg-slate-50"><ZoomIn size={20} /></button>
                    <button onClick={() => setZoom(Math.max(zoom - 0.1, 0.2))} className="p-3 bg-white shadow-lg rounded-full text-slate-600 hover:bg-slate-50"><ZoomOut size={20} /></button>
                    <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} className="p-3 bg-white shadow-lg rounded-full text-slate-600 hover:bg-slate-50"><Move size={20} /></button>
                </div>
            </div>
        </div>
    );
};
