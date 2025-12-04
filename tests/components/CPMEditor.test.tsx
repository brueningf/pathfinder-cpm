import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CPMEditor } from '../../src/components/CPMEditor';
import { Project } from '../../src/types';
import { vi, describe, it, expect } from 'vitest';

// Mock child components
vi.mock('../../src/components/StructuredAnalysis/BaseDiagramEditor', () => ({
    BaseDiagramEditor: ({ undo, redo, onDelete, nodes }: any) => (
        <div data-testid="base-editor">
            <button onClick={undo} data-testid="undo-btn">Undo</button>
            <button onClick={redo} data-testid="redo-btn">Redo</button>
            <button onClick={onDelete} data-testid="delete-btn">Delete</button>
            <div data-testid="node-count">{nodes.length}</div>
        </div>
    )
}));

vi.mock('../../src/components/GanttChart', () => ({
    GanttChart: () => <div>Gantt Chart</div>
}));

// Mock other components to avoid clutter
vi.mock('../../src/components/EditTaskModal', () => ({ EditTaskModal: () => <div>Edit Modal</div> }));
vi.mock('../../src/components/NodeDetailsPanel', () => ({ NodeDetailsPanel: () => <div>Details Panel</div> }));
vi.mock('../../src/components/HelpModal', () => ({ HelpModal: () => <div>Help Modal</div> }));
vi.mock('html-to-image', () => ({ toPng: vi.fn() }));

describe('CPMEditor Undo/Redo', () => {
    const mockProject: Project = {
        id: '1',
        name: 'Test Project',
        data: [],
        structuredAnalysis: {
            contextDiagram: { id: 'context', nodes: [], connections: [] },
            dfds: [],
            dictionary: [],
            stds: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        taskCount: 0
    };

    it('should undo and redo task addition', () => {
        render(<CPMEditor project={mockProject} onSave={vi.fn()} onBack={vi.fn()} theme="light" />);

        // Initial state: 0 nodes
        expect(screen.getByTestId('node-count').textContent).toBe('0');

        // Add a task
        const nameInput = screen.getByPlaceholderText('Name');
        const daysInput = screen.getByPlaceholderText('Days');
        const addButton = screen.getByText('Add');

        fireEvent.change(nameInput, { target: { value: 'Task A' } });
        fireEvent.change(daysInput, { target: { value: '5' } });
        fireEvent.click(addButton);

        // Should have 1 node
        expect(screen.getByTestId('node-count').textContent).toBe('1');

        // Undo
        fireEvent.click(screen.getByTestId('undo-btn'));
        expect(screen.getByTestId('node-count').textContent).toBe('0');

        // Redo
        fireEvent.click(screen.getByTestId('redo-btn'));
        expect(screen.getByTestId('node-count').textContent).toBe('1');
    });
});
