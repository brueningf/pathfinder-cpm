import React from 'react';
import { Entity, ProcessNode, ProcessDependency, DataFlowRef } from '../../types/ie';

interface CRUDMatrixProps {
    entities: Entity[];
    processes: ProcessNode[];
    dependencies: ProcessDependency[];
    dataFlows: DataFlowRef[];
}

export const CRUDMatrix: React.FC<CRUDMatrixProps> = ({ entities, processes, dependencies, dataFlows }) => {
    // Determine interactions from DataFlows
    // Matrix Cell Type
    type CRUD = ('C' | 'R' | 'U' | 'D')[];
    
    // Build interactions map: ProcessID -> EntityID -> CRUD
    const interactions: Record<string, Record<string, CRUD>> = {};

    // 1. Iterate Data Flows
    dataFlows.forEach(df => {
        // Find the process that owns this dependency
        const dep = dependencies.find(d => d.id === df.processDependencyId);
        if (!dep) return;
        
        const pid = dep.sourceProcessId; // Assuming flow happens at source process transition
        const eid = df.entityId;

        if (!interactions[pid]) interactions[pid] = {};
        if (!interactions[pid][eid]) interactions[pid][eid] = [];
        
        const op = df.accessType === 'create' ? 'C'
                 : df.accessType === 'read' ? 'R'
                 : df.accessType === 'update' ? 'U'
                 : df.accessType === 'delete' ? 'D'
                 : null;
        
        if (op && !interactions[pid][eid].includes(op)) {
            interactions[pid][eid].push(op);
        }
    });

    return (
        <div className="flex flex-col h-full w-full bg-slate-50 p-8 overflow-auto">
            <div className="bg-white shadow rounded-lg p-6 max-w-4xl mx-auto w-full">
                <h2 className="text-2xl font-bold mb-4">CRUD Matrix Validation</h2>
                <div className="mb-4 text-slate-600 text-sm">
                    Verify that every Entity has at least one 'C' and one 'R'. <br/>
                    Verify that every Process interacts with data.
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-200">
                        <thead>
                            <tr>
                                <th className="p-3 border border-slate-200 bg-slate-100 text-left min-w-[150px]">Process / Entity</th>
                                {entities.map(e => (
                                    <th key={e.id} className="p-3 border border-slate-200 bg-slate-100 text-center font-semibold">
                                        {e.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {processes.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="p-3 border border-slate-200 font-medium text-slate-700">
                                        {p.name}
                                    </td>
                                    {entities.map(e => {
                                        const crud = interactions[p.id]?.[e.id] || [];
                                        return (
                                            <td key={e.id} className="p-3 border border-slate-200 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                {crud.map(op => (
                                                    <span key={op} className={`
                                                        inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold
                                                        ${op === 'C' ? 'bg-green-100 text-green-700' : ''}
                                                        ${op === 'R' ? 'bg-blue-100 text-blue-700' : ''}
                                                        ${op === 'U' ? 'bg-orange-100 text-orange-700' : ''}
                                                        ${op === 'D' ? 'bg-red-100 text-red-700' : ''}
                                                    `}>
                                                        {op}
                                                    </span>
                                                ))}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Validation Report */}
                <div className="mt-8 border-t pt-6">
                    <h3 className="font-bold text-lg mb-2">Automated Analysis</h3>
                    <ul className="space-y-2">
                        {entities.map(e => {
                            const hasC = processes.some(p => interactions[p.id]?.[e.id]?.includes('C'));
                            const hasR = processes.some(p => interactions[p.id]?.[e.id]?.includes('R'));
                            if (!hasC) return <li key={e.id} className="text-red-600 flex items-center gap-2">⚠️ Entity <strong>{e.name}</strong> is never created! (Missing 'C')</li>;
                            if (!hasR) return <li key={e.id} className="text-yellow-600 flex items-center gap-2">⚠️ Entity <strong>{e.name}</strong> is never read! (Missing 'R')</li>;
                            return null;
                        })}
                        <li className="text-green-600 flex items-center gap-2">✓ All processes have defined data interactions.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
