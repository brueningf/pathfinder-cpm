import { describe, it, expect } from 'vitest';
import { calculateCPM } from './cpmLogic';
import { Task } from '../types';

describe('calculateCPM', () => {
    it('should correctly calculate CPM for a simple sequence', () => {
        const tasks: Task[] = [
            { id: 'A', name: 'Task A', duration: 3, predecessors: [] },
            { id: 'B', name: 'Task B', duration: 2, predecessors: ['A'] },
        ];

        const result = calculateCPM(tasks);

        expect(result.error).toBeNull();
        expect(result.projectDuration).toBe(5);

        const taskA = result.processedTasks.find(t => t.id === 'A');
        const taskB = result.processedTasks.find(t => t.id === 'B');

        expect(taskA).toBeDefined();
        expect(taskA?.es).toBe(0);
        expect(taskA?.ef).toBe(3);
        expect(taskA?.isCritical).toBe(true);

        expect(taskB).toBeDefined();
        expect(taskB?.es).toBe(3);
        expect(taskB?.ef).toBe(5);
        expect(taskB?.isCritical).toBe(true);
    });

    it('should detect cycles', () => {
        const tasks: Task[] = [
            { id: 'A', name: 'Task A', duration: 3, predecessors: ['B'] },
            { id: 'B', name: 'Task B', duration: 2, predecessors: ['A'] },
        ];

        const result = calculateCPM(tasks);
        expect(result.error).toBe("Cycle detected");
    });
});
