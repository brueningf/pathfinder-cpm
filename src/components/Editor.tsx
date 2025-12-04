import React from 'react';
import { CPMEditor } from './CPMEditor';
import { Project, Task } from '../types';

interface EditorProps {
    project: Project;
    onSave: (id: string, taskData: Task[]) => void;
    onBack: () => void;
    theme: 'dark' | 'light';
}

export const Editor: React.FC<EditorProps> = (props) => {
    return <CPMEditor {...props} />;
};
