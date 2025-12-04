import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { StructuredAnalysisData, ContextDiagram, DataDictionaryEntry } from '../../types/structuredAnalysis';
import { ContextDiagramEditor } from './ContextDiagramEditor';
import { DFDEditor } from './DFDEditor';
import { DataDictionary } from './DataDictionary';
import { STDEditor } from './STDEditor';
import { validateStructuredAnalysis } from '../../utils/structuredAnalysisValidation';
import { exportStructuredAnalysisReport } from '../../utils/structuredAnalysisExport';
import { ArrowLeft, Database, Activity, Layers, Book, GitGraph, CheckCircle, FileDown } from 'lucide-react';

interface StructuredAnalysisProps {
    project: Project;
    onSave: (id: string, data: StructuredAnalysisData) => void;
    onBack: () => void;
    theme: 'dark' | 'light';
}

const INITIAL_DATA: StructuredAnalysisData = {
    contextDiagram: { id: 'context', nodes: [], connections: [] },
    dfds: [],
    dictionary: [],
    stds: []
};

export const StructuredAnalysis: React.FC<StructuredAnalysisProps> = ({ project, onSave, onBack, theme }) => {
    const [data, setData] = useState<StructuredAnalysisData>(project.structuredAnalysis || INITIAL_DATA);
    const [activeView, setActiveView] = useState<'context' | 'dfd' | 'dictionary' | 'std'>('context');
    const [history, setHistory] = useState<{ past: StructuredAnalysisData[], future: StructuredAnalysisData[] }>({ past: [], future: [] });
    const isDark = theme === 'dark';

    useEffect(() => {
        let initialData = project.structuredAnalysis || INITIAL_DATA;

        // Migration: Clear "Description here..." from dictionary
        if (initialData.dictionary.some(d => d.definition === 'Description here...')) {
            initialData = {
                ...initialData,
                dictionary: initialData.dictionary.map(d =>
                    d.definition === 'Description here...' ? { ...d, definition: '' } : d
                )
            };
            // We should probably save this migration, but let's just set it in state for now
            // and it will be saved on next update. Or we can call onSave immediately.
            // Calling onSave immediately might be risky if it triggers re-renders or loops.
            // Let's just set it in state.
        }

        setData(initialData);
        setHistory({ past: [], future: [] });
    }, [project.id, project.structuredAnalysis]);

    const undo = () => {
        if (history.past.length === 0) return;
        const previous = history.past[history.past.length - 1];
        const newPast = history.past.slice(0, -1);
        setHistory({ past: newPast, future: [data, ...history.future] });
        setData(previous);
        onSave(project.id, previous);
    };

    const redo = () => {
        if (history.future.length === 0) return;
        const next = history.future[0];
        const newFuture = history.future.slice(1);
        setHistory({ past: [...history.past, data], future: newFuture });
        setData(next);
        onSave(project.id, next);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, data]);

    // Auto-save wrapper with synchronization
    const handleUpdate = (newData: StructuredAnalysisData) => {
        // Push to history
        setHistory(prev => ({
            past: [...prev.past, data].slice(-50), // Keep last 50 states
            future: []
        }));

        // Sync Logic
        let syncedData = { ...newData };

        // 0. Deletion Sync (Propagate deletions BEFORE adding/updating)
        // Check for deleted external entities in Context Diagram
        const oldContextEntities = data.contextDiagram.nodes.filter(n => n.type === 'external_entity');
        const newContextEntities = newData.contextDiagram.nodes.filter(n => n.type === 'external_entity');
        const deletedFromContext = oldContextEntities.filter(old => !newContextEntities.find(n => n.id === old.id));

        // Check for deleted external entities in DFD Level 0
        const oldLevel0 = data.dfds.find(d => d.level === 0) || { nodes: [] };
        const newLevel0 = newData.dfds.find(d => d.level === 0) || { nodes: [] };
        const oldDfdEntities = oldLevel0.nodes.filter(n => n.type === 'external_entity');
        const newDfdEntities = newLevel0.nodes.filter(n => n.type === 'external_entity');
        const deletedFromDfd = oldDfdEntities.filter(old => !newDfdEntities.find(n => n.id === old.id));

        // Apply deletions
        if (deletedFromContext.length > 0) {
            // Remove from DFD Level 0
            let level0 = syncedData.dfds.find(d => d.level === 0);
            if (level0) {
                level0.nodes = level0.nodes.filter(n => !deletedFromContext.find(del => del.id === n.id));
                // Also remove connections involving these nodes
                level0.connections = level0.connections.filter(c =>
                    !deletedFromContext.find(del => del.id === c.sourceId || del.id === c.targetId)
                );
                syncedData.dfds = syncedData.dfds.map(d => d.id === level0!.id ? level0! : d);
            }
        }

        if (deletedFromDfd.length > 0) {
            // Remove from Context Diagram
            syncedData.contextDiagram.nodes = syncedData.contextDiagram.nodes.filter(n => !deletedFromDfd.find(del => del.id === n.id));
            // Also remove connections
            syncedData.contextDiagram.connections = syncedData.contextDiagram.connections.filter(c =>
                !deletedFromDfd.find(del => del.id === c.sourceId || del.id === c.targetId)
            );
        }

        // 1. Context -> DFD Sync (Add/Update)
        // Find all external entities in Context Diagram (using the potentially updated syncedData)
        const contextEntities = syncedData.contextDiagram.nodes.filter(n => n.type === 'external_entity');

        // Ensure they exist in DFD Level 0
        let level0 = syncedData.dfds.find(d => d.level === 0);
        if (!level0) {
            level0 = { id: 'level-0', level: 0, nodes: [], connections: [] };
            syncedData.dfds = [...syncedData.dfds, level0];
        }

        let level0Nodes = [...level0.nodes];
        let level0Changed = false;

        contextEntities.forEach(ce => {
            const existing = level0Nodes.find(n => n.id === ce.id);
            if (!existing) {
                // Add to DFD
                level0Nodes.push({ ...ce, position: { x: ce.position.x, y: ce.position.y + 200 } });
                level0Changed = true;
            } else if (existing.name !== ce.name) {
                // Update name
                level0Nodes = level0Nodes.map(n => n.id === ce.id ? { ...n, name: ce.name } : n);
                level0Changed = true;
            }
        });

        // 2. DFD -> Context Sync (Add/Update)
        // Find all external entities in DFD Level 0
        const dfdEntities = level0Nodes.filter(n => n.type === 'external_entity');
        let contextNodes = [...syncedData.contextDiagram.nodes];
        let contextChanged = false;

        dfdEntities.forEach(de => {
            const existing = contextNodes.find(n => n.id === de.id);
            if (!existing) {
                // Add to Context
                contextNodes.push({ ...de });
                contextChanged = true;
            } else if (existing.name !== de.name) {
                // Update name
                contextNodes = contextNodes.map(n => n.id === de.id ? { ...n, name: de.name } : n);
                contextChanged = true;
            }
        });

        if (level0Changed) {
            syncedData.dfds = syncedData.dfds.map(d => d.id === level0!.id ? { ...d, nodes: level0Nodes } : d);
        }
        if (contextChanged) {
            syncedData.contextDiagram = { ...syncedData.contextDiagram, nodes: contextNodes };
        }

        setData(syncedData);
        onSave(project.id, syncedData);
    };

    return (
        <div className={`h-screen flex flex-col overflow-hidden ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-stone-50 text-stone-800'}`}>
            {/* Header */}
            <div className={`border-b px-6 py-3 flex justify-between items-center shrink-0 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (activeView !== 'context') {
                                setActiveView('context');
                            } else {
                                onBack();
                            }
                        }}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-stone-100 text-stone-500'}`}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg">Structured Analysis</h1>
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>{project.name}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveView('context')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${activeView === 'context' ? (isDark ? 'bg-slate-800 text-white' : 'bg-stone-200 text-stone-900') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')}`}
                    >
                        <Activity size={14} /> Context
                    </button>
                    <button
                        onClick={() => setActiveView('dfd')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${activeView === 'dfd' ? (isDark ? 'bg-slate-800 text-white' : 'bg-stone-200 text-stone-900') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')}`}
                    >
                        <Layers size={14} /> DFDs
                    </button>
                    <button
                        onClick={() => setActiveView('dictionary')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${activeView === 'dictionary' ? (isDark ? 'bg-slate-800 text-white' : 'bg-stone-200 text-stone-900') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')}`}
                    >
                        <Book size={14} /> Dictionary
                    </button>
                    <button
                        onClick={() => setActiveView('std')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${activeView === 'std' ? (isDark ? 'bg-slate-800 text-white' : 'bg-stone-200 text-stone-900') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')}`}
                    >
                        <GitGraph size={14} /> STD
                    </button>
                    <button
                        onClick={() => {
                            const errors = validateStructuredAnalysis(data);
                            if (errors.length === 0) {
                                alert('Validation Passed! No errors found.');
                            } else {
                                alert(`Found ${errors.length} issues:\n\n` + errors.map(e => `- [${e.severity.toUpperCase()}] ${e.message}`).join('\n'));
                            }
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${isDark ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                    >
                        <CheckCircle size={14} /> Validate
                    </button>
                    <button
                        onClick={() => exportStructuredAnalysisReport(data, project.name)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 ${isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    >
                        <FileDown size={14} /> Export
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 relative overflow-hidden">
                {activeView === 'context' && (
                    <ContextDiagramEditor
                        data={data.contextDiagram}
                        dictionary={data.dictionary}
                        onUpdate={(diagram, dict) => handleUpdate({ ...data, contextDiagram: diagram, dictionary: dict })}
                        theme={theme}
                        onNavigateToDFD={() => setActiveView('dfd')}
                        undo={undo}
                        redo={redo}
                        canUndo={history.past.length > 0}
                        canRedo={history.future.length > 0}
                    />
                )}
                {activeView === 'dfd' && (
                    <DFDEditor
                        dfds={data.dfds}
                        dictionary={data.dictionary}
                        onUpdate={(dfds, dict) => handleUpdate({ ...data, dfds, dictionary: dict })}
                        theme={theme}
                        undo={undo}
                        redo={redo}
                        canUndo={history.past.length > 0}
                        canRedo={history.future.length > 0}
                    />
                )}
                {activeView === 'dictionary' && (
                    <DataDictionary
                        dictionary={data.dictionary}
                        onUpdate={(dict) => handleUpdate({ ...data, dictionary: dict })}
                        theme={theme}
                    />
                )}
                {activeView === 'std' && (
                    <STDEditor
                        stds={data.stds}
                        dictionary={data.dictionary}
                        onUpdate={(stds, dict) => handleUpdate({ ...data, stds, dictionary: dict })}
                        theme={theme}
                        undo={undo}
                        redo={redo}
                        canUndo={history.past.length > 0}
                        canRedo={history.future.length > 0}
                    />
                )}
            </div>
        </div>
    );
};
