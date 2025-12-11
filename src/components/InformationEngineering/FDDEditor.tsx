import React, { useState, useCallback } from 'react';
import { BaseDiagramEditor } from '../StructuredAnalysis/BaseDiagramEditor';
import { CanvasNode, CanvasConnection } from '../common/DiagramCanvas';
import { ProcessNode } from '../../types/ie';
import { GitMerge, Layout, Plus } from 'lucide-react';

interface FDDEditorProps {
    processes: ProcessNode[];
    onProcessesChange: (processes: ProcessNode[]) => void;
}

export const FDDEditor: React.FC<FDDEditorProps> = ({ processes, onProcessesChange }) => {
    // No local process state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'pan'>('select');

    // Convert ProcessNodes to CanvasNodes
    const nodes: CanvasNode[] = processes.map(p => ({
        id: p.id,
        x: p.position.x,
        y: p.position.y,
        width: p.size.width,
        height: p.size.height,
        shape: 'rounded-rectangle',
        resizable: true,
        content: (
            <div className={`w-full h-full flex flex-col items-center justify-center border-2 rounded bg-white shadow-sm p-2 text-center
                ${p.type === 'function' ? 'border-green-600' : p.type === 'activity' ? 'border-blue-600' : 'border-slate-400'}
            `}>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{p.type}</div>
                <div className="font-semibold leading-tight">{p.name}</div>
            </div>
        )
    }));

    // Generate Connections based on parentId
    const connections: CanvasConnection[] = processes
        .filter(p => p.parentId)
        .map(p => ({
            id: `conn-${p.parentId}-${p.id}`,
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 },
            sourceNodeId: p.parentId!,
            targetNodeId: p.id,
            lineStyle: 'orthogonal',
            color: '#94a3b8',
            anchors: {
                source: { x: 0, y: 0, side: 'bottom' },
                target: { x: 0, y: 0, side: 'top' }
            }
        }));

    const handleAddChild = () => {
        if (processes.length === 0) {
            // Create Root Process
            const newId = crypto.randomUUID();
            const rootNode: ProcessNode = {
                id: newId,
                name: 'System Root',
                type: 'function',
                level: 0,
                position: { x: 400, y: 50 },
                size: { width: 200, height: 80 }
            };
            onProcessesChange([rootNode]);
            return;
        }

        if (selectedIds.length !== 1) {
            alert("Please select exactly one parent process.");
            return;
        }
        const parentId = selectedIds[0];
        const parent = processes.find(p => p.id === parentId);
        if (!parent) return;

        const newId = crypto.randomUUID();
        const newNode: ProcessNode = {
            id: newId,
            name: 'New Function',
            type: 'activity',
            level: parent.level + 1,
            parentId: parentId,
            position: { x: parent.position.x, y: parent.position.y + 150 }, // Initial placement below parent
            size: { width: 160, height: 60 }
        };

        onProcessesChange([...processes, newNode]);
    };

    const performAutoLayout = () => {
        // Simple Tree Layout
        const newProcesses = [...processes];
        const levelHeight = 150;
        const siblingGap = 180;

        const getChildren = (pid?: string) => newProcesses.filter(p => p.parentId === pid);
        
        // Recursive layout function
        // Returns the total width of the subtree
        const layoutNode = (node: ProcessNode, x: number, y: number): number => {
            const children = getChildren(node.id);
            node.position = { x, y };
            node.level = Math.round(y / levelHeight);

            if (children.length === 0) {
                return siblingGap; // Leaf node width
            }

            let totalWidth = 0;
            // Calculate width of children
            // We need to know widths first to center parent? 
            // Actually, usually we layout children then position parent.
            
            // Simplified: Pre-calculate width requirements?
            // Let's do a simple approach: x is the center.
            
            // 1. Calculate subtree widths
            const subtreeWidths = children.map(child => layoutNode(child, 0, 0)); // dry run? No, need another pass.
            
            // Re-implement: Post-order traversal to get widths, then Pre-order to set positions?
            return 0; 
        };

        // Better Approach: Reingold-Tilford is complex.
        // Simple approach:
        // Group by level.
        // This loses tree structure visual if not careful.
        
        // Let's stick to a very basic "Spread children below parent" logic
        
        const layoutSubtree = (parentId: string | undefined, startX: number, y: number): number => {
             const children = getChildren(parentId);
             if (children.length === 0) return startX;

             let cx = startX;
             let mySubtreeWidth = 0;
             const childWidths: number[] = [];
             
             // First pass: Calculate width of each child's subtree
             // Actually, let's just place them left-to-right for now
             
             let currentChildX = startX;
             children.forEach(child => {
                 // Place child
                 const childSubtreeEnd = layoutSubtree(child.id, currentChildX, y + levelHeight);
                 const childWidth = Math.max(siblingGap, childSubtreeEnd - currentChildX);
                 
                 // Center the child over its subtree? 
                 // For this simple algo, let's just set the child X
                 // Wait, we need to know the child's subtree width to properties center the child.
                 
                 // Let's cheat:
                 // Just line them up. Center parent later?
                 // Valid layout is hard without a library (dagre).
                 // Default to: Place new nodes intelligently, let user move them.
             });
             
             return currentChildX;
        }

        // Using dagre would be ideal but I don't have it.
        // Let's implement a very simple BFS level layout, centering children under parents if possible.
        
        // Map of parent -> children
        const childrenMap: Record<string, ProcessNode[]> = {};
        newProcesses.forEach(p => {
            if(p.parentId) {
                if(!childrenMap[p.parentId]) childrenMap[p.parentId] = [];
                childrenMap[p.parentId].push(p);
            }
        });
        
        const root = newProcesses.find(p => !p.parentId);
        if(!root) return;

        // Assign X,Y recursively
        const assignPositions = (node: ProcessNode, x: number, y: number) => {
             node.position = { x, y };
             const kids = childrenMap[node.id] || [];
             if (kids.length === 0) return 0; // Leaf

             // Total width of children
             const widthPerChild = siblingGap;
             const totalChildrenWidth = kids.length * widthPerChild;
             let startX = x - (totalChildrenWidth / 2) + (widthPerChild / 2);
             
             // Problem: Overlap if subtrees are wide.
             // We need to know subtree width.
        };
        
        // Correct algorithm:
        // 1. Get width of every node's subtree.
        interface Meta { width: number }
        const metas: Record<string, Meta> = {};
        
        const calcWidth = (node: ProcessNode): number => {
            const kids = childrenMap[node.id] || [];
            if (kids.length === 0) {
                 metas[node.id] = { width: siblingGap };
                 return siblingGap;
            }
            let w = 0;
            kids.forEach(k => w += calcWidth(k));
            metas[node.id] = { width: w };
            return w;
        };
        
        calcWidth(root);
        
        const setPos = (node: ProcessNode, x: number, y: number) => {
            node.position = { x, y };
            const kids = childrenMap[node.id] || [];
            let currentX = x - (metas[node.id].width / 2);
            
            kids.forEach(k => {
                const kWidth = metas[k.id].width;
                const kCenterX = currentX + (kWidth / 2);
                setPos(k, kCenterX, y + levelHeight);
                currentX += kWidth;
            });
        };
        
        setPos(root, root.position.x, 50); // Keep root X, reset Y
        onProcessesChange(newProcesses);
    };

    return (
        <BaseDiagramEditor
            nodes={nodes}
            connections={connections}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            isDark={false}
             onNodeMove={(id, x, y) => {
                onProcessesChange(processes.map(p => p.id === id ? { ...p, position: { x, y } } : p));
            }}
             toolbarContent={
                <>
                    <button 
                        onClick={handleAddChild}
                        className={`btn text-xs flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 ${processes.length > 0 && selectedIds.length !== 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={processes.length > 0 && selectedIds.length !== 1}
                        title={processes.length === 0 ? "Create Root System Process" : "Select a parent process to add a child"}
                    >
                        <Plus size={16} /> {processes.length === 0 ? "Create Root Process" : "Add Child Process"}
                    </button>
                    <button 
                        onClick={performAutoLayout}
                        className="btn text-xs flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800"
                        title="Auto-arrange tree"
                    >
                        <GitMerge size={16} className="rotate-90" /> Auto Layout
                    </button>
                </>
            }
            onDelete={() => {
                const toDelete = selectedIds;
                if (toDelete.length === 0) return;
                
                // Cannot delete if it has children? Or cascade delete?
                // Let's implement cascade delete for simplicity
                const getDescendants = (pid: string): string[] => {
                    const children = processes.filter(p => p.parentId === pid);
                    return [...children.map(c => c.id), ...children.flatMap(c => getDescendants(c.id))];
                };
                
                const allToDelete = new Set(toDelete);
                toDelete.forEach(id => getDescendants(id).forEach(d => allToDelete.add(d)));
                
                onProcessesChange(processes.filter(p => !allToDelete.has(p.id)));
                setSelectedIds([]);
            }}
            propertiesPanelContent={
                selectedIds.length === 1 && (
                    <div className="flex flex-col gap-4">
                        <h3 className="font-bold mb-2 text-stone-800">Properties</h3>
                        {processes.find(p => p.id === selectedIds[0]) && (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase opacity-50 block mb-1">Process Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-2 py-1 border rounded bg-white border-stone-300"
                                        value={processes.find(p => p.id === selectedIds[0])?.name}
                                        onChange={(e) => {
                                            onProcessesChange(processes.map(p => p.id === selectedIds[0] ? { ...p, name: e.target.value } : p));
                                        }}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase opacity-50 block mb-1">Type</label>
                                    <select
                                        className="w-full px-2 py-1 border rounded bg-white border-stone-300"
                                        value={processes.find(p => p.id === selectedIds[0])?.type}
                                        onChange={(e) => {
                                            onProcessesChange(processes.map(p => p.id === selectedIds[0] ? { ...p, type: e.target.value as any } : p));
                                        }}
                                    >
                                        <option value="process">Process (High Level)</option>
                                        <option value="function">Function (Grouping)</option>
                                        <option value="activity">Activity (Atomic)</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        />
    );
};
