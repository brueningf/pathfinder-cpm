import { StructuredAnalysisData, DataFlowDiagram, ContextDiagram } from '../types/structuredAnalysis';

export interface ValidationError {
    id: string;
    message: string;
    severity: 'error' | 'warning';
    diagramId?: string;
}

export const validateStructuredAnalysis = (data: StructuredAnalysisData): ValidationError[] => {
    const errors: ValidationError[] = [];

    // 1. Context Diagram Validation
    if (data.contextDiagram.nodes.length === 0) {
        errors.push({ id: 'ctx-empty', message: 'Context Diagram is empty.', severity: 'warning', diagramId: 'context' });
    }

    const systemNode = data.contextDiagram.nodes.find(n => n.type === 'process');
    if (!systemNode) {
        errors.push({ id: 'ctx-no-system', message: 'Context Diagram must have a System process.', severity: 'error', diagramId: 'context' });
    }

    // 2. Dictionary Completeness
    const allNodes = [
        ...data.contextDiagram.nodes,
        ...data.dfds.flatMap(d => d.nodes),
        ...data.stds.flatMap(s => s.nodes)
    ];

    allNodes.forEach(node => {
        const entry = data.dictionary.find(e => e.id === node.id);
        if (!entry) {
            errors.push({ id: `dict-missing-${node.id}`, message: `Node "${node.name}" is missing from Data Dictionary.`, severity: 'warning' });
        } else if (!entry.definition || entry.definition.trim() === '' || entry.definition === 'Description...') {
            errors.push({ id: `dict-incomplete-${node.id}`, message: `Node "${node.name}" has incomplete definition.`, severity: 'warning' });
        }
    });

    // 3. Balancing
    // Check if Level 0 DFD inputs/outputs match Context Diagram System inputs/outputs
    if (systemNode) {
        const contextInputs = data.contextDiagram.connections.filter(c => c.targetId === systemNode.id).map(c => c.label || 'Unlabeled');
        const contextOutputs = data.contextDiagram.connections.filter(c => c.sourceId === systemNode.id).map(c => c.label || 'Unlabeled');

        const level0 = data.dfds.find(d => d.level === 0);
        if (level0) {
            // For Level 0, we check if external entities are present (Context Entities should match Level 0 Entities)
            const contextEntities = data.contextDiagram.nodes.filter(n => n.type === 'external_entity');
            const level0Entities = level0.nodes.filter(n => n.type === 'external_entity');

            contextEntities.forEach(ce => {
                if (!level0Entities.find(le => le.name === ce.name)) {
                    errors.push({ id: `balance-entity-${ce.id}`, message: `External Entity "${ce.name}" from Context Diagram is missing in Level 0 DFD.`, severity: 'error', diagramId: level0.id });
                }
            });
        }
    }

    // Check Parent-Child Balancing for all DFDs
    data.dfds.forEach(childDFD => {
        if (childDFD.parentProcessId && childDFD.parentId) {
            const parentDFD = data.dfds.find(d => d.id === childDFD.parentId);
            if (parentDFD) {
                const parentProcess = parentDFD.nodes.find(n => n.id === childDFD.parentProcessId);
                if (parentProcess) {
                    // Flows entering the parent process
                    const inputsToProcess = parentDFD.connections
                        .filter(c => c.targetId === parentProcess.id)
                        .map(c => c.label || 'Unlabeled');

                    // Flows leaving the parent process
                    const outputsFromProcess = parentDFD.connections
                        .filter(c => c.sourceId === parentProcess.id)
                        .map(c => c.label || 'Unlabeled');

                    // In the child DFD, these should appear as flows from/to external entities (or "empty" sources/sinks if we supported that)
                    // For this implementation, we assume child DFDs must include the external sources/destinations or data stores that interact with the parent process.
                    // A stricter check: The set of data flows crossing the boundary of the child DFD must match the parent process flows.
                    // Boundary flows in child DFD:
                    // - Inputs: Flows from External Entities/Stores -> Process (where Entity/Store is NOT created in this level but inherited? No, DFDs usually redraw them)
                    // Let's simplify: Check if the *names* of data flows match.

                    // Actually, in a child DFD, the "inputs" are flows coming from "nothing" or external entities/stores.
                    // Let's check if the child DFD has flows with the same names.
                    const childFlowLabels = childDFD.connections.map(c => c.label || 'Unlabeled');

                    inputsToProcess.forEach(input => {
                        if (!childFlowLabels.includes(input)) {
                            errors.push({
                                id: `balance-input-${childDFD.id}-${input}`,
                                message: `Balancing Error: Input flow "${input}" to process "${parentProcess.name}" is missing in its child DFD (Level ${childDFD.level}).`,
                                severity: 'error',
                                diagramId: childDFD.id
                            });
                        }
                    });

                    outputsFromProcess.forEach(output => {
                        if (!childFlowLabels.includes(output)) {
                            errors.push({
                                id: `balance-output-${childDFD.id}-${output}`,
                                message: `Balancing Error: Output flow "${output}" from process "${parentProcess.name}" is missing in its child DFD (Level ${childDFD.level}).`,
                                severity: 'error',
                                diagramId: childDFD.id
                            });
                        }
                    });
                }
            }
        }
    });

    // 4. Unconnected Nodes
    data.dfds.forEach(dfd => {
        dfd.nodes.forEach(node => {
            const hasInput = dfd.connections.some(c => c.targetId === node.id);
            const hasOutput = dfd.connections.some(c => c.sourceId === node.id);

            if (node.type === 'process' && (!hasInput || !hasOutput)) {
                errors.push({ id: `unconnected-${node.id}`, message: `Process "${node.name}" in DFD Level ${dfd.level} must have at least one input and one output.`, severity: 'warning', diagramId: dfd.id });
            }
        });
    });

    return errors;
};
