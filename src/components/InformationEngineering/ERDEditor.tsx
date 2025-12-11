import React, { useState } from 'react';
import { BaseDiagramEditor } from '../StructuredAnalysis/BaseDiagramEditor';
import { CanvasNode, CanvasConnection } from '../common/DiagramCanvas';
import { Entity, Relationship } from '../../types/ie';
import { Plus, Link } from 'lucide-react';

interface ERDEditorProps {
    entities: Entity[];
    relationships: Relationship[];
    onEntitiesChange: (entities: Entity[]) => void;
    onRelationshipsChange: (relationships: Relationship[]) => void;
}

export const ERDEditor: React.FC<ERDEditorProps> = ({ entities, relationships, onEntitiesChange, onRelationshipsChange }) => {
    // No local state for data, only selection/tools
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'pan'>('select');

    // Convert Entities AND Relationships to CanvasNodes
    const nodes: CanvasNode[] = [
        ...entities.map(e => ({
            id: e.id,
            x: e.position.x,
            y: e.position.y,
            width: e.size.width,
            height: e.size.height,
            shape: 'rectangle' as const,
            resizable: true,
            content: (
                <div className="w-full h-full p-2 border bg-white shadow-sm flex items-center justify-center font-bold">
                    {e.name}
                </div>
            )
        })),
        ...relationships.map(r => ({
            id: r.id,
            x: r.position?.x || 0,
            y: r.position?.y || 0,
            width: 100,
            height: 60,
            shape: 'diamond' as const,
            resizable: false,
            content: (
                <div className="w-full h-full relative flex items-center justify-center">
                    <div className="text-xs font-semibold px-1 text-center truncate w-full">{r.label || 'Rel'}</div>
                </div>
            )
        }))
    ];

    // Generate Connections: Entity <-> Relationship <-> Entity
    const connections: CanvasConnection[] = [];
    relationships.forEach(r => {
        const sourceEntity = entities.find(e => e.id === r.sourceEntityId);
        const targetEntity = entities.find(e => e.id === r.targetEntityId);

        // Helper to determine anchor side on the Relationship node
        const getRelAnchorSide = (entity: Entity, rel: Relationship): 'top' | 'bottom' | 'left' | 'right' => {
            if (!entity || !rel.position) return 'left';
            const dx = entity.position.x - rel.position.x;
            const dy = entity.position.y - rel.position.y;
            // Simple quadrant check
            if (Math.abs(dx) > Math.abs(dy)) {
                return dx > 0 ? 'right' : 'left';
            } else {
                return dy > 0 ? 'bottom' : 'top';
            }
        };

        const getOppositeSide = (side: 'top' | 'bottom' | 'left' | 'right'): 'top' | 'bottom' | 'left' | 'right' => {
            switch (side) {
                case 'top': return 'bottom';
                case 'bottom': return 'top';
                case 'left': return 'right';
                case 'right': return 'left';
            }
        };

        // Line 1: Source Entity -> Relationship Node
        if (sourceEntity) {
            const relSide = getRelAnchorSide(sourceEntity, r);
            connections.push({
                id: `${r.id}-source`,
                start: { x: 0, y: 0 },
                end: { x: 0, y: 0 },
                sourceNodeId: r.sourceEntityId,
                targetNodeId: r.id,
                lineStyle: 'straight',
                color: '#64748b',
                anchors: {
                    source: { x: 0, y: 0, side: getOppositeSide(relSide) },
                    target: { x: 0, y: 0, side: relSide }
                }
            });
        }
        
        // Line 2: Relationship Node -> Target Entity
        if (targetEntity) {
            const relSide = getRelAnchorSide(targetEntity, r);
            connections.push({
                id: `${r.id}-target`,
                start: { x: 0, y: 0 },
                end: { x: 0, y: 0 },
                sourceNodeId: r.id,
                targetNodeId: r.targetEntityId,
                lineStyle: 'straight',
                color: '#64748b',
                anchors: {
                    source: { x: 0, y: 0, side: relSide },
                    target: { x: 0, y: 0, side: getOppositeSide(relSide) }
                }
            });
        }
    });

    const handleNodeMove = (id: string, x: number, y: number) => {
        // Check if it's an entity or relationship
        if (entities.find(e => e.id === id)) {
            onEntitiesChange(entities.map(e => e.id === id ? { ...e, position: { x, y } } : e));
        } else if (relationships.find(r => r.id === id)) {
            onRelationshipsChange(relationships.map(r => r.id === id ? { ...r, position: { x, y } } : r));
        }
    };

    const handleAddEntity = () => {
        const id = crypto.randomUUID();
        const newEntity: Entity = {
            id,
            name: 'New Entity',
            attributes: [],
            position: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 },
            size: { width: 140, height: 70 }
        };
        onEntitiesChange([...entities, newEntity]);
    };

    const handleConnectionCreate = (src: string, tgt: string) => {
        // If we connect two entities, we need to create a Relationship Intermediary
        const isSrcEntity = entities.find(e => e.id === src);
        const isTgtEntity = entities.find(e => e.id === tgt);

        if (isSrcEntity && isTgtEntity) {
            // Create new Relationship Node between them
            const midX = (isSrcEntity.position.x + isTgtEntity.position.x) / 2;
            const midY = (isSrcEntity.position.y + isTgtEntity.position.y) / 2;

            const newRel: Relationship = {
                id: crypto.randomUUID(),
                sourceEntityId: src,
                targetEntityId: tgt,
                sourceCardinality: 'one_one',
                targetCardinality: 'one_one',
                label: 'relates',
                position: { x: midX, y: midY },
                controlPoints: []
            };
            onRelationshipsChange([...relationships, newRel]);
        } else {
             // In Chen's, you typically don't connect Rel to Rel or Entity to nothing.
             // Ignore other connections for now
             alert("Connect two Entities to create a Relationship.");
        }
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
            onNodeMove={handleNodeMove}
            onConnectionCreate={handleConnectionCreate}
            toolbarContent={
                <>
                <button 
                    onClick={handleAddEntity}
                    className="btn text-xs flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800"
                    title="Add a new entity to the diagram"
                >
                    <Plus size={16} /> Entity
                </button>
                </>
            }
            onDelete={() => {
                const toDelete = selectedIds;
                if (toDelete.length === 0) return;
                
                // Filter out deleted entities and cascading relationships
                const remainingEntities = entities.filter(e => !toDelete.includes(e.id));
                // Relationships connected to deleted entities must also go
                const remainingRelationships = relationships.filter(r => 
                    !toDelete.includes(r.id) && 
                    !toDelete.includes(r.sourceEntityId) && 
                    !toDelete.includes(r.targetEntityId)
                );
                
                onEntitiesChange(remainingEntities);
                onRelationshipsChange(remainingRelationships);
                setSelectedIds([]);
            }}
            propertiesPanelContent={
                selectedIds.length === 1 && (
                    <div className="flex flex-col gap-4">
                        <h3 className="font-bold mb-2 text-stone-800">Properties</h3>
                        {/* Entity Properties */}
                        {entities.find(e => e.id === selectedIds[0]) && (
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold uppercase opacity-50 block mb-1">Entity Name</label>
                                <input
                                    type="text"
                                    className="w-full px-2 py-1 border rounded bg-white border-stone-300"
                                    value={entities.find(e => e.id === selectedIds[0])?.name}
                                    onChange={(e) => {
                                        onEntitiesChange(entities.map(ent => ent.id === selectedIds[0] ? { ...ent, name: e.target.value } : ent));
                                    }}
                                />
                            </div>
                        )}
                        {/* Relationship Properties */}
                        {relationships.find(r => r.id === selectedIds[0]) && (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase opacity-50 block mb-1">Label</label>
                                    <input
                                        type="text"
                                        className="w-full px-2 py-1 border rounded bg-white border-stone-300"
                                        value={relationships.find(r => r.id === selectedIds[0])?.label}
                                        onChange={(e) => {
                                            onRelationshipsChange(relationships.map(rel => rel.id === selectedIds[0] ? { ...rel, label: e.target.value } : rel));
                                        }}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase opacity-50 block mb-1">Source Cardinality</label>
                                    <select
                                        className="w-full px-2 py-1 border rounded bg-white border-stone-300"
                                        value={relationships.find(r => r.id === selectedIds[0])?.sourceCardinality}
                                        onChange={(e) => {
                                            onRelationshipsChange(relationships.map(rel => rel.id === selectedIds[0] ? { ...rel, sourceCardinality: e.target.value as any } : rel));
                                        }}
                                    >
                                        <option value="one_one">One (Strict)</option>
                                        <option value="zero_one">Zero or One</option>
                                        <option value="zero_many">Zero or Many</option>
                                        <option value="one_many">One or Many</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase opacity-50 block mb-1">Target Cardinality</label>
                                    <select
                                        className="w-full px-2 py-1 border rounded bg-white border-stone-300"
                                        value={relationships.find(r => r.id === selectedIds[0])?.targetCardinality}
                                        onChange={(e) => {
                                            onRelationshipsChange(relationships.map(rel => rel.id === selectedIds[0] ? { ...rel, targetCardinality: e.target.value as any } : rel));
                                        }}
                                    >
                                        <option value="one_one">One (Strict)</option>
                                        <option value="zero_one">Zero or One</option>
                                        <option value="zero_many">Zero or Many</option>
                                        <option value="one_many">One or Many</option>
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
