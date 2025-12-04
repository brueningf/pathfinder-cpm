import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, Task, LayoutNode } from '../types';
import { calculateCPM } from '../utils/cpmLogic';
import { calculateLayout } from '../utils/layoutLogic';
import { BaseDiagramEditor } from './StructuredAnalysis/BaseDiagramEditor';
import { CanvasNode, CanvasConnection } from './common/DiagramCanvas';
import { GanttChart } from './GanttChart';
import { EditTaskModal } from './EditTaskModal';
import { NodeDetailsPanel } from './NodeDetailsPanel';
import { HelpModal } from './HelpModal';
import { ArrowLeft, Save, Plus, List, HelpCircle, ImageIcon, ZoomIn, ZoomOut, Move, Edit2 } from 'lucide-react';
import { toPng } from 'html-to-image';

interface CPMEditorProps {
    project: Project;
    onSave: (id: string, taskData: Task[]) => void;
    onBack: () => void;
    theme: 'dark' | 'light';
}

export const CPMEditor: React.FC<CPMEditorProps> = ({ project, onSave, onBack, theme }) => {
    const [tasks, setTasks] = useState<Task[]>(project.data || []);
    const [viewMode, setViewMode] = useState<'diagram' | 'gantt'>('diagram');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'pan'>('select');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [lastSaved, setLastSaved] = useState(false);

    // Undo/Redo State
    const [history, setHistory] = useState<{ past: Task[][], future: Task[][] }>({ past: [], future: [] });

    // Quick Add State
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskType, setNewTaskType] = useState<'task' | 'start' | 'end'>('task');
    const [newTaskDuration, setNewTaskDuration] = useState('');
    const [newTaskPred, setNewTaskPred] = useState('');

    const quickAddInputRef = useRef<HTMLInputElement>(null);
    const ganttRef = useRef<HTMLDivElement>(null);
    const exportRef = useRef<HTMLDivElement>(null); // Ref for export
    const isDark = theme === 'dark';

    // Auto-save
    useEffect(() => {
        const timer = setTimeout(() => {
            if (JSON.stringify(tasks) !== JSON.stringify(project.data)) {
                onSave(project.id, tasks);
                setLastSaved(true);
                setTimeout(() => setLastSaved(false), 2000);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [tasks, project.id, onSave, project.data]);

    const processedData = useMemo(() => {
        const cpmResult = calculateCPM(tasks);
        return calculateLayout(cpmResult.processedTasks);
    }, [tasks]);

    const projectDuration = useMemo(() => {
        if (processedData.length === 0) return 0;
        return Math.max(...processedData.map(t => t.ef));
    }, [processedData]);

    // Undo/Redo Logic
    const pushToHistory = (currentTasks: Task[]) => {
        setHistory(prev => ({
            past: [...prev.past, currentTasks].slice(-50), // Keep last 50 states
            future: []
        }));
    };

    const undo = () => {
        if (history.past.length === 0) return;
        const previous = history.past[history.past.length - 1];
        const newPast = history.past.slice(0, -1);
        setHistory({ past: newPast, future: [tasks, ...history.future] });
        setTasks(previous);
    };

    const redo = () => {
        if (history.future.length === 0) return;
        const next = history.future[0];
        const newFuture = history.future.slice(1);
        setHistory({ past: [...history.past, tasks], future: newFuture });
        setTasks(next);
    };

    const handleAddNode = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskName.trim()) return;

        const newTask: Task = {
            id: (tasks.length + 1).toString(),
            name: newTaskName,
            duration: newTaskType === 'task' ? parseInt(newTaskDuration) || 1 : 0,
            predecessors: newTaskPred ? newTaskPred.split(',').map(s => s.trim()) : [],
            type: newTaskType
        };

        pushToHistory(tasks);
        setTasks([...tasks, newTask]);
        setNewTaskName('');
        setNewTaskDuration('');
        setNewTaskPred('');
    };

    const updateTask = (originalId: string, newId: string, updates: Partial<Task>) => {
        pushToHistory(tasks);
        setTasks(prev => prev.map(t => {
            if (t.id === originalId) {
                return { ...t, ...updates, id: newId };
            }
            if (originalId !== newId && t.predecessors.includes(originalId)) {
                return {
                    ...t,
                    predecessors: t.predecessors.map(p => p === originalId ? newId : p)
                };
            }
            return t;
        }));
        setEditingTask(null);
    };

    const removeTask = (taskId: string) => {
        pushToHistory(tasks);
        setTasks(prev => prev.filter(t => t.id !== taskId).map(t => ({
            ...t,
            predecessors: t.predecessors.filter(p => p !== taskId)
        })));
        setEditingTask(null);
        setSelectedIds([]);
    };

    // Transform for BaseDiagramEditor
    const canvasNodes: CanvasNode[] = processedData.map(node => {
        const isCritical = node.isCritical;
        const isStart = node.type === 'start';
        const isEnd = node.type === 'end';
        const isSelected = selectedIds.includes(node.id);

        // Replicate Node.tsx styles
        let colorClasses = isCritical
            ? `border-[3px] border-red-500 ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}`
            : `border-[3px] ${isDark ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-white border-slate-900 text-slate-800'}`;

        if (isSelected) {
            colorClasses = `border-[3px] border-blue-500 ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}`;
        }

        if (isStart) {
            colorClasses = isDark
                ? 'bg-emerald-950/30 border-[3px] border-emerald-500/50 text-emerald-400'
                : 'bg-emerald-50 border-[3px] border-emerald-500 text-emerald-700';
            if (isSelected) {
                colorClasses = `border-[3px] border-blue-500 ${isDark ? 'bg-emerald-950/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`;
            }
        } else if (isEnd) {
            colorClasses = isDark
                ? 'bg-slate-800 border-[3px] border-slate-600 text-slate-200'
                : 'bg-slate-900 border-[3px] border-slate-700 text-white';
            if (isSelected) {
                colorClasses = `border-[3px] border-blue-500 ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-900 text-white'}`;
            }
        }

        return {
            id: node.id,
            x: node.x || 0,
            y: node.y || 0,
            width: 180,
            height: 180,
            shape: 'circle', // Use circle shape for clipping if supported, or fallback
            content: (
                <div
                    className={`w-full h-full rounded-full flex flex-col items-center justify-center transition-all duration-300 group ${colorClasses}`}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(tasks.find(t => t.id === node.id) || null);
                    }}
                >
                    <div className={`absolute top-2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${isStart ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700') :
                        isEnd ? (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-300') :
                            isCritical ? (isDark ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-100 text-rose-700') :
                                (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                        }`}>
                        ID: {node.id}
                    </div>

                    <div className="flex flex-col items-center text-center px-4 w-full">
                        <span className={`text-sm font-bold leading-tight mb-1 line-clamp-2 ${isEnd ? (isDark ? 'text-slate-200' : 'text-white') : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>
                            {node.name}
                        </span>
                        {!isStart && !isEnd && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${isDark ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>
                                {node.duration} days
                            </span>
                        )}
                    </div>

                    <div className={`absolute bottom-6 w-[70%] grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] border-t pt-1 mt-1 ${isEnd ? 'border-slate-500 text-slate-400' : (isDark ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-400')}`}>
                        <div className="text-center">
                            <span className="block text-[7px] uppercase opacity-50">ES / EF</span>
                            <span className={`font-mono ${isEnd ? 'text-slate-300' : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>
                                {node.manualES ? <span className="text-blue-500 font-bold">{node.es}</span> : node.es}
                                /
                                {node.manualEF ? <span className="text-blue-500 font-bold">{node.ef}</span> : node.ef}
                            </span>
                        </div>
                        <div className="text-center">
                            <span className="block text-[7px] uppercase opacity-50">Slack</span>
                            <span className={`font-mono font-bold ${node.slack === 0 ? 'text-rose-500' : (isEnd ? 'text-slate-300' : (isDark ? 'text-slate-400' : 'text-slate-600'))}`}>
                                {node.manualSlack !== undefined && node.manualSlack !== null && node.manualSlack !== '' ? (
                                    <span className="flex items-center justify-center gap-0.5 text-blue-500">
                                        {node.slack}*
                                    </span>
                                ) : node.slack}
                            </span>
                        </div>
                    </div>
                </div>
            )
        };
    });

    const canvasConnections: CanvasConnection[] = processedData.flatMap(node =>
        node.predecessors.map(predId => {
            const predNode = processedData.find(n => n.id === predId);
            if (!predNode) return null;

            const isCritical = node.isCritical && predNode.isCritical && (Math.abs(node.es - predNode.ef) < 0.001);

            const connection: CanvasConnection = {
                id: `${predId}-${node.id}`,
                start: { x: (predNode.x || 0) + 90, y: (predNode.y || 0) }, // Right center (radius 90)
                end: { x: (node.x || 0) - 90, y: (node.y || 0) }, // Left center (radius 90)
                sourceNodeId: predId,
                targetNodeId: node.id,
                color: isCritical ? (isDark ? '#ef4444' : '#dc2626') : undefined,
                targetArrow: true,
                lineStyle: 'curved'
            };
            return connection;
        })
    ).filter((c): c is CanvasConnection => c !== null);

    const handleNodeMove = (id: string, x: number, y: number) => {
        updateTask(id, id, { manualX: x, manualY: y });
    };

    const handleConnectionCreate = (sourceId: string, targetId: string) => {
        const targetTask = tasks.find(t => t.id === targetId);
        if (targetTask && !targetTask.predecessors.includes(sourceId)) {
            updateTask(targetId, targetId, { predecessors: [...targetTask.predecessors, sourceId] });
        }
    };

    const handleDelete = () => {
        selectedIds.forEach(id => removeTask(id));
    };

    const exportToOfficialFormat = async (dataUrl: string, type: 'cpm' | 'gantt') => {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.zIndex = '-9999';
        container.style.width = '1200px';
        document.body.appendChild(container);

        const bg = isDark ? '#020617' : '#ffffff';
        const text = isDark ? '#e2e8f0' : '#000000';
        const border = isDark ? '#475569' : '#000000';

        const date = new Date().toLocaleDateString();

        const htmlContent = `
            <div style="background-color: ${bg}; color: ${text}; padding: 20px; font-family: 'Courier New', monospace; display: flex; flex-direction: column; height: auto; min-height: 800px; border: 1px solid ${border}; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid ${border}; padding-bottom: 10px; margin-bottom: 20px;">
                    <div>
                        <h1 style="font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 0; letter-spacing: 2px;">PATHFINDER</h1>
                    </div>
                    <div style="text-align: right; font-size: 10px; text-transform: uppercase;">
                        <div>Date: ${date}</div>
                    </div>
                </div>
                <div style="flex: 1; display: flex; justify-content: center; align-items: center; padding: 20px; position: relative;">
                    <img id="export-image" src="${dataUrl}" style="max-width: 100%; height: auto; display: block;" />
                </div>
                <div style="display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 10px;">
                    <table style="border-collapse: collapse; font-size: 10px; text-transform: uppercase; width: 400px;">
                        <tr>
                            <td style="border: 1px solid ${border}; padding: 5px 10px; font-weight: bold; width: 30%;">Project</td>
                            <td style="border: 1px solid ${border}; padding: 5px 10px;">${project.name}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid ${border}; padding: 5px 10px; font-weight: bold;">View</td>
                            <td style="border: 1px solid ${border}; padding: 5px 10px;">${type === 'cpm' ? 'Network Diagram' : 'Gantt Chart'}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid ${border}; padding: 5px 10px; font-weight: bold;">Stats</td>
                            <td style="border: 1px solid ${border}; padding: 5px 10px;">${tasks.length} Tasks / ${projectDuration} Days</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = htmlContent;

        const img = container.querySelector('#export-image') as HTMLImageElement;
        await new Promise((resolve) => {
            if (img.complete) resolve(true);
            else img.onload = () => resolve(true);
        });

        try {
            const finalDataUrl = await toPng(container, { backgroundColor: bg, pixelRatio: 3 });
            const link = document.createElement('a');
            link.download = `${project.name}-${type}-plan.png`;
            link.href = finalDataUrl;
            link.click();
        } catch (err) {
            console.error('Official export failed', err);
        } finally {
            document.body.removeChild(container);
        }
    };

    const handleExport = async () => {
        if (viewMode === 'gantt' && ganttRef.current) {
            try {
                const dataUrl = await toPng(ganttRef.current, { backgroundColor: isDark ? '#0f172a' : '#ffffff', pixelRatio: 3 });
                await exportToOfficialFormat(dataUrl, 'gantt');
            } catch (err) {
                console.error('Gantt export failed', err);
            }
        } else if (viewMode === 'diagram') {
            if (exportRef.current) {
                try {
                    const dataUrl = await toPng(exportRef.current, { backgroundColor: isDark ? '#020617' : '#fafaf9', pixelRatio: 3 });
                    await exportToOfficialFormat(dataUrl, 'cpm');
                } catch (err) {
                    console.error('Export failed', err);
                }
            }
        }
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
                                Duration: {projectDuration} days
                            </span>
                        </div>
                    </div>
                    <button onClick={() => setHelpOpen(true)} className={`p-2 rounded-full transition-colors ml-2 ${isDark ? 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10' : 'text-stone-400 hover:text-blue-500 hover:bg-blue-50'}`}>
                        <HelpCircle size={20} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`flex rounded-lg p-1 mr-2 ${isDark ? 'bg-slate-800' : 'bg-stone-100'}`}>
                        <button onClick={() => setViewMode('diagram')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'diagram' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-stone-800 shadow') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')}`}>Diagram</button>
                        <button onClick={() => setViewMode('gantt')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'gantt' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-stone-800 shadow') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')}`}>Gantt</button>
                    </div>
                    <button onClick={handleExport} className={`btn border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'}`}>
                        <ImageIcon size={16} /> <span className="hidden md:inline">Export PNG</span>
                    </button>
                    <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${lastSaved ? 'bg-green-100 text-green-700' : 'opacity-0'}`}>
                        Saved
                    </div>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-lg md:hidden ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-stone-100'}`}><List size={24} /></button>
                </div>
            </div>

            {/* Modals */}
            {editingTask && <EditTaskModal task={editingTask} onSave={updateTask} onDelete={removeTask} onClose={() => setEditingTask(null)} allTaskIds={tasks.map(t => t.id)} />}

            {/* Main Content */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
                {/* Sidebar */}
                <div className={`fixed inset-x-0 bottom-0 z-50 h-[60vh] border-t shadow-2xl rounded-t-2xl transform transition-transform duration-300 md:relative md:inset-auto md:w-[300px] md:h-auto md:border-r md:border-t-0 md:shadow-none md:rounded-none md:translate-y-0 md:flex md:flex-col ${sidebarOpen ? 'translate-y-0' : 'translate-y-full'} ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`}>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                        <form onSubmit={handleAddNode} className="space-y-3">
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

                {/* Canvas/Gantt */}
                <div className={`flex-1 relative overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-stone-50'}`}>
                    {viewMode === 'gantt' ? (
                        <div className="p-8 h-full overflow-auto" ref={ganttRef}>
                            <GanttChart project={{ ...project, data: processedData.length > 0 ? processedData : tasks }} theme={theme} />
                        </div>
                    ) : (
                        <div className="w-full h-full" ref={exportRef}>
                            <BaseDiagramEditor
                                nodes={canvasNodes}
                                connections={canvasConnections}
                                selectedIds={selectedIds}
                                onSelectionChange={setSelectedIds}
                                activeTool={activeTool}
                                setActiveTool={setActiveTool}
                                isDark={isDark}
                                onNodeMove={handleNodeMove}
                                onConnectionCreate={handleConnectionCreate}
                                onDelete={handleDelete}
                                undo={undo}
                                redo={redo}
                                canUndo={history.past.length > 0}
                                canRedo={history.future.length > 0}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
