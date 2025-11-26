import { Task, ProcessedTask, CPMResult } from '../types';

export const calculateCPM = (tasks: Task[]): CPMResult => {
    // Initialize map
    const taskMap = new Map<string, ProcessedTask>(tasks.map(t => [t.id, {
        ...t,
        es: 0, ef: 0, ls: Infinity, lf: Infinity, slack: 0, isCritical: false
    }]));

    const adj = new Map<string, string[]>(tasks.map(t => [t.id, []]));
    const revAdj = new Map<string, string[]>(tasks.map(t => [t.id, []]));

    // Build Graph
    tasks.forEach(task => {
        task.predecessors.forEach(pId => {
            if (taskMap.has(pId)) {
                adj.get(pId)?.push(task.id);
                revAdj.get(task.id)?.push(pId);
            }
        });
    });

    // Topological Sort
    const inDegree = new Map<string, number>(tasks.map(t => [t.id, 0]));
    tasks.forEach(t => {
        t.predecessors.forEach(p => {
            if (inDegree.has(t.id)) inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
        });
    });

    const queue = tasks.filter(t => inDegree.get(t.id) === 0).map(t => t.id);
    const sortedOrder: string[] = [];

    while (queue.length > 0) {
        const u = queue.shift()!;
        sortedOrder.push(u);
        const neighbors = adj.get(u) || [];
        neighbors.forEach(v => {
            inDegree.set(v, (inDegree.get(v) || 0) - 1);
            if (inDegree.get(v) === 0) queue.push(v);
        });
    }

    if (sortedOrder.length !== tasks.length) {
        return { error: "Cycle detected", processedTasks: [], projectDuration: 0 };
    }

    // --- 1. Standard Forward Pass ---
    sortedOrder.forEach(u => {
        const task = taskMap.get(u)!;
        let maxPrevEF = 0;
        const preds = revAdj.get(u) || [];
        if (preds.length > 0) {
            preds.forEach(pId => {
                maxPrevEF = Math.max(maxPrevEF, taskMap.get(pId)!.ef);
            });
        }
        task.es = maxPrevEF;
        task.ef = task.es + task.duration;
    });

    let projectDuration = 0;
    taskMap.forEach(t => {
        projectDuration = Math.max(projectDuration, t.ef);
    });

    // --- 2. Standard Backward Pass ---
    [...sortedOrder].reverse().forEach(u => {
        const task = taskMap.get(u)!;
        const succs = adj.get(u) || [];
        if (succs.length === 0) {
            task.lf = projectDuration;
        } else {
            let minSuccLS = Infinity;
            succs.forEach(vId => {
                minSuccLS = Math.min(minSuccLS, taskMap.get(vId)!.ls);
            });
            task.lf = minSuccLS;
        }
        task.ls = task.lf - task.duration;

        // Natural Slack
        let calculatedSlack = task.ls - task.es;
        if (Math.abs(calculatedSlack) < 0.001) calculatedSlack = 0;
        task.slack = calculatedSlack;
        task.isCritical = task.slack === 0;
    });

    // --- 3. APPLY MANUAL OVERRIDES (Force Values) ---
    taskMap.forEach(task => {
        if (task.manualES !== undefined && task.manualES !== null && task.manualES !== '') task.es = parseFloat(task.manualES as string);
        if (task.manualEF !== undefined && task.manualEF !== null && task.manualEF !== '') task.ef = parseFloat(task.manualEF as string);
        if (task.manualLS !== undefined && task.manualLS !== null && task.manualLS !== '') task.ls = parseFloat(task.manualLS as string);
        if (task.manualLF !== undefined && task.manualLF !== null && task.manualLF !== '') task.lf = parseFloat(task.manualLF as string);

        // Recalculate slack based on forced values if slack isn't also forced
        if (task.manualSlack !== undefined && task.manualSlack !== null && task.manualSlack !== '') {
            task.slack = parseFloat(task.manualSlack as string);
        } else {
            // If we manually moved dates, re-compute slack visually
            task.slack = task.ls - task.es;
        }

        if (task.manualCritical !== undefined && task.manualCritical !== 'auto') {
            task.isCritical = task.manualCritical === 'true';
        } else {
            // Re-evaluate criticality based on potentially new slack
            task.isCritical = task.slack === 0;
        }
    });

    return { error: null, processedTasks: Array.from(taskMap.values()), projectDuration };
};
