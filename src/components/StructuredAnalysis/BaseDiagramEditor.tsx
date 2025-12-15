import React, { useEffect } from 'react';
import { DiagramCanvas, CanvasNode, CanvasConnection } from '../common/DiagramCanvas';
import { MousePointer, Link, Move, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { calculateFitToView, getDiagramBounds } from '../../utils/diagramUtils';

export interface BaseDiagramEditorProps {
    // Data
    nodes: CanvasNode[];
    connections: CanvasConnection[];

    // State
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    activeTool: 'select' | 'connect' | 'pan';
    setActiveTool: (tool: 'select' | 'connect' | 'pan') => void;
    isDark: boolean;

    // Actions
    onNodeMove: (id: string, x: number, y: number) => void;
    onNodeResize?: (id: string, width: number, height: number) => void;
    onConnectionCreate?: (sourceId: string, targetId: string) => void;
    onConnectionControlPointMove?: (id: string, index: number, x: number, y: number) => void;
    onDelete?: () => void;

    // Undo/Redo
    undo?: () => void;
    redo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;

    // Custom UI
    toolbarContent?: React.ReactNode;
    propertiesPanelContent?: React.ReactNode;
    breadcrumbs?: React.ReactNode;
}

export const BaseDiagramEditor: React.FC<BaseDiagramEditorProps> = ({
    nodes,
    connections,
    selectedIds,
    onSelectionChange,
    activeTool,
    setActiveTool,
    isDark,
    onNodeMove,
    onNodeResize,
    onConnectionCreate,
    onConnectionControlPointMove,
    onDelete,
    undo,
    redo,
    canUndo,
    canRedo,
    toolbarContent,
    propertiesPanelContent,
    breadcrumbs
}) => {
    const [zoom, setZoom] = React.useState(1);
    const [pan, setPan] = React.useState({ x: 0, y: 0 });
    const containerRef = React.useRef<HTMLDivElement>(null);
    const hasFittedRef = React.useRef(false);

    // Auto-Fit Function
    const fitToContent = React.useCallback(() => {
        if (!containerRef.current || nodes.length === 0) return;
        
        const bounds = getDiagramBounds(nodes);
        const { width, height } = containerRef.current.getBoundingClientRect();
        
        const viewState = calculateFitToView(bounds, width, height, 50);
        setZoom(viewState.zoom);
        setPan(viewState.pan);
    }, [nodes]);

    // Initial Fit on Mount (wait for resize observer practically, or just generic timeout/effect)
    useEffect(() => {
        if (!hasFittedRef.current && nodes.length > 0 && containerRef.current) {
            // Small delay to ensure container has size
            const timer = setTimeout(() => {
                fitToContent();
                hasFittedRef.current = true;
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [nodes, fitToContent]);
    
    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case 'v':
                    setActiveTool('select');
                    break;
                case 'c':
                    setActiveTool('connect');
                    break;
                case ' ':
                    e.preventDefault(); // Prevent scrolling
                    setActiveTool('pan');
                    break;
                case 'escape':
                    onSelectionChange([]);
                    break;
                case 'delete':
                case 'backspace':
                    if (selectedIds.length > 0 && onDelete) onDelete();
                    break;
                case 'z':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (e.shiftKey) {
                            redo?.();
                        } else {
                            undo?.();
                        }
                    }
                    break;
                case 'y':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        redo?.();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, onDelete, setActiveTool, onSelectionChange, undo, redo]);

    const handleGlobalClick = () => {
        // Fallback deselection for any unhandled clicks
        if (activeTool === 'select') {
            onSelectionChange([]);
        }
    };

    return (
        <div
            className={`flex flex-col h-full w-full select-none ${isDark ? 'bg-slate-950' : 'bg-stone-50'}`}
            onClick={handleGlobalClick}
        >
            {/* Toolbar */}
            <div
                className={`p-2 border-b flex items-center justify-between shrink-0 z-10 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {breadcrumbs && (
                        <>
                            <div className="flex items-center gap-2 mr-2">
                                {breadcrumbs}
                            </div>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2 shrink-0"></div>
                        </>
                    )}
                    <div className="flex gap-2">
                        {/* Undo/Redo */}
                        <div className={`flex rounded-lg p-1 mr-2 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-stone-200 shadow-sm'}`}>
                            <button
                                onClick={undo}
                                disabled={!canUndo}
                                className={`p-2 rounded transition-colors ${!canUndo ? 'opacity-30 cursor-not-allowed' : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100')}`}
                                title="Undo (Ctrl+Z)"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
                            </button>
                            <button
                                onClick={redo}
                                disabled={!canRedo}
                                className={`p-2 rounded transition-colors ${!canRedo ? 'opacity-30 cursor-not-allowed' : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100')}`}
                                title="Redo (Ctrl+Shift+Z)"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></svg>
                            </button>
                        </div>

                        {/* Tools */}
                        <div className={`flex rounded-lg p-1 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-stone-200 shadow-sm'}`}>
                            <button
                                onClick={() => setActiveTool('select')}
                                className={`p-2 rounded transition-colors ${activeTool === 'select'
                                    ? (isDark ? 'bg-slate-800 text-blue-400' : 'bg-stone-100 text-blue-600')
                                    : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')
                                    }`}
                                title="Select (V)"
                            >
                                <MousePointer size={20} />
                            </button>
                            <button
                                onClick={() => setActiveTool('connect')}
                                className={`p-2 rounded transition-colors ${activeTool === 'connect'
                                    ? (isDark ? 'bg-slate-800 text-blue-400' : 'bg-stone-100 text-blue-600')
                                    : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')
                                    }`}
                                title="Connect (C)"
                            >
                                <Link size={20} />
                            </button>
                            <button
                                onClick={() => setActiveTool('pan')}
                                className={`p-2 rounded transition-colors ${activeTool === 'pan'
                                    ? (isDark ? 'bg-slate-800 text-blue-400' : 'bg-stone-100 text-blue-600')
                                    : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-700')
                                    }`}
                                title="Pan Tool (Space)"
                            >
                                <Move size={20} />
                            </button>
                        </div>

                        {/* Zoom / Pan Controls */}
                        <div className={`flex rounded-lg p-1 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-stone-200 shadow-sm'}`}>
                            <button
                                onClick={() => setZoom(Math.min(zoom + 0.1, 3))}
                                className={`p-2 rounded transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'}`}
                                title="Zoom In"
                            >
                                <ZoomIn size={20} />
                            </button>
                            <button
                                onClick={() => setZoom(Math.max(zoom - 0.1, 0.2))}
                                className={`p-2 rounded transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'}`}
                                title="Zoom Out"
                            >
                                <ZoomOut size={20} />
                            </button>
                            <button
                                onClick={fitToContent}
                                className={`p-2 rounded transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'}`}
                                title="Fit to Content (Maximize)"
                            >
                                <Maximize size={20} />
                            </button>
                        </div>

                        {/* Custom Toolbar Items */}
                        {toolbarContent && (
                            <>
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2 shrink-0"></div>
                                {toolbarContent}
                            </>
                        )}
                    </div>
                </div>

            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative flex overflow-hidden" ref={containerRef}>
                <DiagramCanvas
                    nodes={nodes}
                    connections={connections}
                    onNodeMove={onNodeMove}
                    onNodeResize={onNodeResize}
                    onConnectionCreate={onConnectionCreate}
                    onConnectionControlPointMove={onConnectionControlPointMove}
                    onSelectionChange={onSelectionChange}
                    selectedIds={selectedIds}
                    isDark={isDark}
                    mode={activeTool}
                    onBackgroundClick={() => onSelectionChange([])}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    pan={pan}
                    onPanChange={setPan}
                />

                {/* Properties Panel */}
                {selectedIds.length === 1 && propertiesPanelContent && (
                    <div
                        className={`absolute right-4 top-4 w-64 p-4 rounded-lg shadow-xl border z-20 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {propertiesPanelContent}
                    </div>
                )}
            </div>
        </div>
    );
};
