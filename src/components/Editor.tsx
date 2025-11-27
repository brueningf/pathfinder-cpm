import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Activity, Save, Menu, Plus, Edit2, ZoomIn, ZoomOut, Move, Download, Image as ImageIcon, HelpCircle, List } from 'lucide-react';
import { Project, Task, LayoutNode } from '../types';
import { calculateCPM } from '../utils/cpmLogic';
import { calculateLayout } from '../utils/layoutLogic';
import { Node } from './Node';
import { Connection } from './Connection';
import { EditTaskModal } from './EditTaskModal';
import { GanttChart } from './GanttChart';
import { toPng } from 'html-to-image';
import { HelpModal } from './HelpModal';

interface EditorProps {
    project: Project;
    onSave: (id: string, taskData: Task[]) => void;
    onBack: () => void;
    theme: 'dark' | 'light';
}

export const Editor: React.FC<EditorProps> = ({ project, onSave, onBack, theme }) => {
    const [tasks, setTasks] = useState<Task[]>(project.data || []);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Quick Add State
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskType, setNewTaskType] = useState<'task' | 'start' | 'end'>('task');
    const [newTaskDuration, setNewTaskDuration] = useState('');
    const [newTaskPred, setNewTaskPred] = useState('');

    // View State
    const [viewMode, setViewMode] = useState<'diagram' | 'gantt'>('diagram');
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [draggedNode, setDraggedNode] = useState<string | null>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [lastSaved, setLastSaved] = useState(false);
    const [lastTouch, setLastTouch] = useState<{ x: number, y: number } | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);
    const exportRef = useRef<HTMLDivElement>(null);
    const quickAddInputRef = useRef<HTMLInputElement>(null);

    const isDark = theme === 'dark';

    useEffect(() => {
        if (canvasRef.current) {
            setContainerSize({
                width: canvasRef.current.offsetWidth,
                height: canvasRef.current.offsetHeight
            });
        }

        const handleResize = () => {
            if (canvasRef.current) {
                setContainerSize({
                    width: canvasRef.current.offsetWidth,
                    height: canvasRef.current.offsetHeight
                });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const processedData = useMemo(() => {
        const cpmResult = calculateCPM(tasks);
        return calculateLayout(cpmResult.processedTasks);
    }, [tasks, containerSize]);

    const projectDuration = useMemo(() => {
        if (processedData.length === 0) return 0;
        return Math.max(...processedData.map(t => t.ef));
    }, [processedData]);

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskName.trim()) return;

        const newTask: Task = {
            id: (tasks.length + 1).toString(),
            name: newTaskName,
            duration: newTaskType === 'task' ? parseInt(newTaskDuration) || 1 : 0,
            predecessors: newTaskPred ? newTaskPred.split(',').map(s => s.trim()) : [],
            type: newTaskType
        };

        const newTasks = [...tasks, newTask];
        setTasks(newTasks);
        setNewTaskName('');
        setNewTaskDuration('');
        setNewTaskPred('');
        setLastSaved(false);
    };

    const updateTask = (originalId: string, newId: string, updates: Partial<Task>) => {
        setTasks(prev => {
            const newTasks = prev.map(t => {
                if (t.id === originalId) {
                    return { ...t, ...updates, id: newId };
                }
                // Update references in predecessors if ID changed
                if (originalId !== newId && t.predecessors.includes(originalId)) {
                    return {
                        ...t,
                        predecessors: t.predecessors.map(p => p === originalId ? newId : p)
                    };
                }
                return t;
            });
            return newTasks;
        });
        setEditingTask(null);
        setLastSaved(false);
    };

    const removeTask = (taskId: string) => {
        const newTasks = tasks.filter(t => t.id !== taskId);
        // Also remove from predecessors
        const cleanedTasks = newTasks.map(t => ({
            ...t,
            predecessors: t.predecessors.filter(p => p !== taskId)
        }));
        setTasks(cleanedTasks);
        setEditingTask(null);
        setLastSaved(false);
    };

    const handleSave = () => {
        onSave(project.id, tasks);
        setLastSaved(true);
        setTimeout(() => setLastSaved(false), 2000);
    };

    const handleExport = async () => {
        if (exportRef.current) {
            try {
                const dataUrl = await toPng(exportRef.current, { backgroundColor: isDark ? '#020617' : '#fafaf9' });
                const link = document.createElement('a');
                link.download = `${project.name}-cpm.png`;
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error('Export failed', err);
            }
        }
    };

    // Canvas Interaction
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        // Zoom by default
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(z => Math.min(Math.max(z * delta, 0.2), 3));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && !draggedNode)) { // Middle click or left click on empty space
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDraggedNode(null);
    };

    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        // Node dragging logic could be implemented here if we want manual layout
        // For now, we just prevent canvas panning
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && lastTouch) {
            const dx = e.touches[0].clientX - lastTouch.x;
            const dy = e.touches[0].clientY - lastTouch.y;
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
            setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        }
    };

    const handleTouchEnd = () => {
        setLastTouch(null);
    };

    const handleAddClick = () => {
        setSidebarOpen(true);
        setTimeout(() => {
            quickAddInputRef.current?.focus();
        }, 300); // Wait for transition
    };

    const handleContextMenu = (e: React.MouseEvent, taskId: string) => {
        e.preventDefault();
        const task = tasks.find(t => t.id === taskId);
        if (task) setEditingTask(task);
    };

    return (
        <div className={`h-screen flex flex-col overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-stone-50'}`}>
            <HelpModal
                isOpen={helpOpen}
                onClose={() => setHelpOpen(false)}
                title="CPM Guide"
                content={
                    <div className="space-y-4">
                        <p><strong>Critical Path Method (CPM)</strong> helps you plan and schedule projects.</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Nodes:</strong> Represent tasks.</li>
                            <li><strong>Arrows:</strong> Represent dependencies.</li>
                            <li><strong>Red Nodes/Arrows:</strong> The Critical Path. Any delay here delays the project.</li>
                            <li><strong>ES/EF:</strong> Earliest Start / Earliest Finish.</li>
                            <li><strong>Slack:</strong> How long a task can be delayed without affecting the project end date.</li>
                        </ul>
                    </div>
                }
            />

            {/* Header */}
            <div className={`border-b px-6 py-3 flex justify-between items-center z-20 shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`}>
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-stone-100 text-stone-500'}`}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className={`font-bold text-lg truncate max-w-[150px] md:max-w-none ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>{project.name}</h1>
                        <div className={`flex items-center gap-2 text-[10px] md:text-xs ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>
                            <span className={`px-2 py-0.5 rounded font-medium ${isDark ? 'bg-slate-800' : 'bg-stone-100'}`}>{tasks.length} Tasks</span>
                            <span className="hidden md:inline">•</span>
                            <span className={`px-2 py-0.5 rounded font-medium ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
                                <span className="md:hidden">Dur: </span><span className="hidden md:inline">Duration: </span>{projectDuration}<span className="hidden md:inline"> days</span><span className="md:hidden">d</span>
                            </span>
                        </div>
                    </div>
                    <button onClick={() => setHelpOpen(true)} className={`p-2 rounded-full transition-colors ml-2 ${isDark ? 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10' : 'text-stone-400 hover:text-blue-500 hover:bg-blue-50'}`}>
                        <HelpCircle size={20} />
                    </button>
                </div>
                <div className="hidden md:flex items-center gap-2">
                    <div className={`flex rounded-lg p-1 mr-2 ${isDark ? 'bg-slate-800' : 'bg-stone-100'}`}>
                        <button onClick={() => setViewMode('diagram')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'diagram' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-stone-800 shadow') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')}`}>Diagram</button>
                        <button onClick={() => setViewMode('gantt')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'gantt' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-stone-800 shadow') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')}`}>Gantt</button>
                    </div>
                    <button onClick={handleExport} className={`btn border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'}`}>
                        <ImageIcon size={16} /> <span className="hidden md:inline">Export PNG</span>
                    </button>
                    <button onClick={handleSave} className={`btn ${lastSaved ? 'bg-green-100 text-green-700' : (isDark ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'bg-stone-800 text-white hover:bg-stone-900')}`}>
                        <Save size={16} /> {lastSaved ? 'Saved!' : 'Save'}
                    </button>
                    <button onClick={handleAddClick} className={`p-2 rounded-lg md:hidden ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-stone-100'}`}><Plus size={24} /></button>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-lg md:hidden ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-stone-100'}`}><List size={24} /></button>
                </div>
            </div>

            {/* Modals */}
            {editingTask && <EditTaskModal task={editingTask} onSave={updateTask} onDelete={removeTask} onClose={() => setEditingTask(null)} allTaskIds={tasks.map(t => t.id)} />}

            {/* Main Content Wrapper */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
                {/* Sidebar (Adapted) */}
                <div className={`fixed inset-x-0 bottom-0 z-50 h-[60vh] border-t shadow-2xl rounded-t-2xl transform transition-transform duration-300 md:relative md:inset-auto md:w-[300px] md:h-auto md:border-r md:border-t-0 md:shadow-none md:rounded-none md:translate-y-0 md:flex md:flex-col ${sidebarOpen ? 'translate-y-0' : 'translate-y-full'} ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`}>
                    {/* Mobile Drag Handle */}
                    <div className="w-12 h-1.5 bg-slate-300/50 rounded-full mx-auto mt-3 mb-1 md:hidden" />

                    {/* Mobile Controls */}
                    <div className={`p-4 border-b md:hidden space-y-3 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-stone-100 bg-stone-50/50'}`}>
                        <div className={`flex rounded-lg p-1 ${isDark ? 'bg-slate-800' : 'bg-stone-100'}`}>
                            <button onClick={() => setViewMode('diagram')} className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${viewMode === 'diagram' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-stone-800 shadow') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')}`}>Diagram</button>
                            <button onClick={() => setViewMode('gantt')} className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${viewMode === 'gantt' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-stone-800 shadow') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')}`}>Gantt</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleExport} className={`btn flex-1 border justify-center ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'}`}>
                                <ImageIcon size={16} /> Export
                            </button>
                            <button onClick={handleSave} className={`btn flex-1 justify-center ${lastSaved ? 'bg-green-100 text-green-700' : (isDark ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'bg-stone-800 text-white hover:bg-stone-900')}`}>
                                <Save size={16} /> {lastSaved ? 'Saved!' : 'Save'}
                            </button>
                        </div>
                    </div>

                    <div className={`p-4 border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-stone-100 bg-stone-50/50'}`}>
                        <div className="grid grid-cols-2 gap-2 text-center">
                            <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-stone-200'}`}>
                                <span className={`text-[9px] uppercase font-bold ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>Duration</span>
                                <div className={`text-xl font-bold ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>{projectDuration}d</div>
                            </div>
                            <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-stone-200'}`}>
                                <span className={`text-[9px] uppercase font-bold ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>Tasks</span>
                                <div className={`text-xl font-bold ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>{tasks.length}</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                        <form onSubmit={addTask} className="space-y-3">
                            <label className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>Quick Add</label>
                            <input ref={quickAddInputRef} type="text" placeholder="Name" className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600' : 'bg-stone-50 border-stone-200 text-stone-800'}`} value={newTaskName} onChange={e => setNewTaskName(e.target.value)} />

                            <div className="flex gap-2">
                                <select className={`w-1/3 px-2 py-2 border rounded-lg text-xs font-bold uppercase ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-stone-50 border-stone-200'}`} value={newTaskType} onChange={e => setNewTaskType(e.target.value as any)}>
                                    <option value="task">Task</option>
                                    <option value="start">Start</option>
                                    <option value="end">End</option>
                                </select>
                                {newTaskType === 'task' && (
                                    <input type="number" min="1" placeholder="Days" className={`w-1/3 px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-stone-50 border-stone-200'}`} value={newTaskDuration} onChange={e => setNewTaskDuration(e.target.value)} />
                                )}
                            </div>

                            <input type="text" placeholder="Preds (e.g. A, B)" className={`w-full px-3 py-2 border rounded-lg text-sm uppercase ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600' : 'bg-stone-50 border-stone-200'}`} value={newTaskPred} onChange={e => setNewTaskPred(e.target.value)} />

                            <button disabled={!newTaskName} type="submit" className={`btn w-full text-white ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-stone-900 hover:bg-stone-800'}`}><Plus size={16} /> Add</button>
                        </form>

                        <div className="space-y-2">
                            <label className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>Tasks</label>
                            {tasks.map(t => (
                                <div key={t.id} className={`group flex items-center justify-between p-2.5 border rounded-lg transition-colors cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 hover:border-blue-500/50 text-slate-300' : 'bg-white border-stone-200 hover:border-blue-400'}`} onClick={() => setEditingTask(t)}>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded ${t.type === 'start' ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : t.type === 'end' ? (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-800 text-white') : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-stone-100')}`}>{t.id}</span>
                                        <span className="text-sm font-medium truncate">{t.name}</span>
                                    </div>
                                    <Edit2 size={12} className={`group-hover:text-blue-500 ${isDark ? 'text-slate-600' : 'text-stone-300'}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Canvas */}
                <div className={`flex-1 relative overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-stone-50'}`} ref={canvasRef} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
                    {/* Main Content Area */}
                    <div className={`flex-1 overflow-hidden relative ${isDark ? 'bg-slate-950' : 'bg-stone-50'}`}>
                        {viewMode === 'gantt' ? (
                            <div className="p-8">
                                <GanttChart project={{ ...project, data: processedData.length > 0 ? processedData : tasks }} />
                            </div>
                        ) : (
                            <div
                                className="relative"
                                ref={exportRef}
                                style={{
                                    width: containerSize.width,
                                    height: containerSize.height,
                                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                    transformOrigin: 'center center',
                                    transition: isDragging || draggedNode ? 'none' : 'transform 0.15s'
                                }}
                            >
                                {/* Grid background */}
                                <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: `radial-gradient(${isDark ? '#334155' : '#cbd5e1'} 1px, transparent 1px)`, backgroundSize: '24px 24px', transform: `translate(${pan.x % 24}px, ${pan.y % 24}px)` }} />

                                {/* Connections */}
                                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
                                    <defs>
                                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                            <polygon points="0 0, 10 3.5, 0 7" fill={isDark ? '#475569' : '#94a3b8'} />
                                        </marker>
                                        <marker id="arrowhead-critical" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                            <polygon points="0 0, 10 3.5, 0 7" fill={isDark ? '#f43f5e' : '#f43f5e'} />
                                        </marker>
                                    </defs>
                                    {processedData.map(node => (
                                        node.predecessors.map(predId => {
                                            const predNode = processedData.find(n => n.id === predId);
                                            if (predNode) {
                                                const isCriticalConnection = node.isCritical && predNode.isCritical && (Math.abs(node.es - predNode.ef) < 0.001); // Simplified critical path check
                                                // Node diameter is 180, so radius is 90.
                                                // Start from right edge of predecessor, end at left edge of successor.
                                                return (
                                                    <Connection
                                                        key={`${predId}-${node.id}`}
                                                        start={{ x: predNode.x! + 90, y: predNode.y! }}
                                                        end={{ x: node.x! - 90, y: node.y! }}
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
                                        onContextMenu={(e) => handleContextMenu(e, node.id)}
                                        onDoubleClick={() => setEditingTask(node as LayoutNode)}
                                        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                                        theme={theme}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Floating Controls */}
                    <div className="absolute bottom-6 right-6 flex gap-2">
                        <button onClick={() => setZoom(Math.min(zoom + 0.1, 2))} className={`p-3 shadow-lg rounded-full ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-stone-600 hover:bg-stone-50'}`}><ZoomIn size={20} /></button>
                        <button onClick={() => setZoom(Math.max(zoom - 0.1, 0.2))} className={`p-3 shadow-lg rounded-full ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-stone-600 hover:bg-stone-50'}`}><ZoomOut size={20} /></button>
                        <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} className={`p-3 shadow-lg rounded-full ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-stone-600 hover:bg-stone-50'}`}><Move size={20} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};
