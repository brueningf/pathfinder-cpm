import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BaseDiagramEditor } from '../../../src/components/StructuredAnalysis/BaseDiagramEditor';
import { CanvasNode, CanvasConnection } from '../../../src/components/common/DiagramCanvas';

describe('BaseDiagramEditor', () => {
    const mockNodes: CanvasNode[] = [
        { id: '1', x: 0, y: 0, width: 100, height: 100, content: <div>Node 1</div> },
        { id: '2', x: 200, y: 0, width: 100, height: 100, content: <div>Node 2</div> }
    ];

    const mockConnections: CanvasConnection[] = [
        { id: 'c1', start: { x: 100, y: 50 }, end: { x: 200, y: 50 }, sourceNodeId: '1', targetNodeId: '2' }
    ];

    const mockProps = {
        nodes: mockNodes,
        connections: mockConnections,
        selectedIds: [],
        onSelectionChange: vi.fn(),
        activeTool: 'select' as const,
        setActiveTool: vi.fn(),
        isDark: false,
        onNodeMove: vi.fn(),
        onConnectionCreate: vi.fn(),
        onDelete: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
        canUndo: true,
        canRedo: true
    };

    it('renders nodes and connections', () => {
        render(<BaseDiagramEditor {...mockProps} />);
        expect(screen.getByText('Node 1')).toBeTruthy();
        expect(screen.getByText('Node 2')).toBeTruthy();
    });

    it('calls onSelectionChange when clicking a node', () => {
        render(<BaseDiagramEditor {...mockProps} />);
        const node1 = screen.getByText('Node 1');
        fireEvent.mouseDown(node1);
        expect(mockProps.onSelectionChange).toHaveBeenCalledWith(['1']);
    });

    it('calls onNodeMove when dragging a node', () => {
        render(<BaseDiagramEditor {...mockProps} />);
        const node1 = screen.getByText('Node 1');

        fireEvent.mouseDown(node1, { clientX: 0, clientY: 0 });
        fireEvent.mouseMove(node1, { clientX: 50, clientY: 50 });

        expect(mockProps.onNodeMove).toHaveBeenCalled();
    });

    it('calls undo when undo button is clicked', () => {
        render(<BaseDiagramEditor {...mockProps} />);
        const undoButton = screen.getByTitle('Undo (Ctrl+Z)');
        fireEvent.click(undoButton);
        expect(mockProps.undo).toHaveBeenCalled();
    });

    it('calls redo when redo button is clicked', () => {
        render(<BaseDiagramEditor {...mockProps} />);
        const redoButton = screen.getByTitle('Redo (Ctrl+Shift+Z)');
        fireEvent.click(redoButton);
        expect(mockProps.redo).toHaveBeenCalled();
    });

    it('changes tool when tool button is clicked', () => {
        render(<BaseDiagramEditor {...mockProps} />);
        const connectButton = screen.getByTitle('Connect (C)');
        fireEvent.click(connectButton);
        expect(mockProps.setActiveTool).toHaveBeenCalledWith('connect');
    });
});
