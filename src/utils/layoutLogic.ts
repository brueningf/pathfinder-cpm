import { ProcessedTask, LayoutNode } from '../types';

const LEVEL_SPACING = 280;
const SIBLING_SPACING = 200;

export const calculateLayout = (processedTasks: ProcessedTask[]): LayoutNode[] => {
    const levels = new Map<number, ProcessedTask[]>();
    let maxLevel = 0;
    const taskDepth = new Map<string, number>();

    const getDepth = (id: string, visited = new Set<string>()): number => {
        if (visited.has(id)) return 0;
        if (taskDepth.has(id)) return taskDepth.get(id)!;

        visited.add(id);
        const task = processedTasks.find(t => t.id === id);
        if (!task || task.predecessors.length === 0) {
            taskDepth.set(id, 0);
            return 0;
        }

        let maxPDepth = 0;
        task.predecessors.forEach(pId => {
            maxPDepth = Math.max(maxPDepth, getDepth(pId, new Set(visited)));
        });

        const depth = maxPDepth + 1;
        taskDepth.set(id, depth);
        return depth;
    };

    processedTasks.forEach(t => {
        const depth = getDepth(t.id);
        if (!levels.has(depth)) levels.set(depth, []);
        levels.get(depth)!.push(t);
        maxLevel = Math.max(maxLevel, depth);
    });

    const layoutNodes: LayoutNode[] = [];
    levels.forEach((nodes, level) => {
        nodes.forEach((node, index) => {
            // Basic centering logic
            const totalHeight = nodes.length * SIBLING_SPACING;
            const startY = -(totalHeight / 2) + (SIBLING_SPACING / 2);

            const defaultX = level * LEVEL_SPACING + 150;
            const defaultY = startY + (index * SIBLING_SPACING) + 400;

            layoutNodes.push({
                ...node,
                x: node.manualX !== undefined ? node.manualX : defaultX,
                y: node.manualY !== undefined ? node.manualY : defaultY,
                level: level
            });
        });
    });

    return layoutNodes;
};
