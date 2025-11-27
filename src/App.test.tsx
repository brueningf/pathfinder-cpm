import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

vi.mock('html-to-image', () => ({
    toPng: vi.fn(),
}));

vi.mock('lucide-react', () => ({
    Activity: () => <div data-testid="icon-activity" />,
    Plus: () => <div data-testid="icon-plus" />,
    Trash2: () => <div data-testid="icon-trash" />,
    ArrowRight: () => <div />,
    AlertCircle: () => <div />,
    ZoomIn: () => <div />,
    ZoomOut: () => <div />,
    Move: () => <div />,
    HelpCircle: () => <div />,
    X: () => <div />,
    Edit2: () => <div />,
    Menu: () => <div />,
    Save: () => <div />,
    FolderOpen: () => <div />,
    LayoutGrid: () => <div />,
    ChevronLeft: () => <div />,
    Calendar: () => <div />,
    Settings2: () => <div />,
    FileText: () => <div />,
    Download: () => <div />,
    Image: () => <div />,
}));

describe('App', () => {
    it('renders the dashboard by default', () => {
        render(<App />);
        expect(screen.getByText(/Pathfinder/i)).toBeInTheDocument();
        expect(screen.getByText(/Project Administration & CPM Analysis/i)).toBeInTheDocument();
        expect(screen.getByText(/Create New Diagram/i)).toBeInTheDocument();
    });
});
