import React, { useState, useEffect } from 'react';
import { ProjectRepository, createEmptyProject } from '../../types/ie';
import { ProcessNavigator } from './ProcessNavigator';
import { ERDEditor } from './ERDEditor';
import { FDDEditor } from './FDDEditor';
import { PDDEditor } from './PDDEditor';
import { PDFDEditor } from './PDFDEditor';
import { CRUDMatrix } from './CRUDMatrix';
import { Project } from '../../types';

interface IEOrchestratorProps {
    project: Project;
    onSave: (data: ProjectRepository) => void;
    onBack: () => void;
}

export const IEOrchestrator: React.FC<IEOrchestratorProps> = ({ project: mainProject, onSave, onBack }) => {
    // Initialize from props or empty
    // Initialize from props or empty, merging with defaults to ensure all keys exist
    const [project, setProject] = useState<ProjectRepository>({
        ...createEmptyProject(), // Defaults
        ...(mainProject.informationEngineering || {}), // Overrides from storage
        // Ensure ID/Name are always from the project if missing (though they shouldn't be)
        id: mainProject.informationEngineering?.id || mainProject.id,
        name: mainProject.informationEngineering?.name || mainProject.name,
        triggers: mainProject.informationEngineering?.triggers || {}
    });

    // Update local state when prop changes (if needed, e.g. external update)
    // For now, we drive mostly from local state and bubble up on changes.
    // Actually, distinct local state is good to avoid excessive re-renders of App.
    // But we need to sync back.

    const updateProject = (updates: Partial<ProjectRepository>) => {
        const newData = { ...project, ...updates };
        setProject(newData);
        onSave(newData);
    };

    const renderStep = () => {
        switch (project.currentStep) {
            case 1:
                return <ERDEditor 
                    entities={Object.values(project.entities)} 
                    relationships={Object.values(project.relationships)}
                    onEntitiesChange={(entities) => {
                        const entityMap = entities.reduce((acc, e) => ({...acc, [e.id]: e}), {});
                        updateProject({ entities: entityMap });
                    }}
                    onRelationshipsChange={(rels) => {
                        const relMap = rels.reduce((acc, r) => ({...acc, [r.id]: r}), {});
                        updateProject({ relationships: relMap });
                    }}
                />;
            case 2:
                return <FDDEditor 
                    processes={Object.values(project.processes)}
                    onProcessesChange={(procs) => {
                        const procMap = procs.reduce((acc, p) => ({...acc, [p.id]: p}), {});
                        updateProject({ processes: procMap });
                    }}
                />;
            case 3:
                return <PDDEditor 
                    processes={Object.values(project.processes)}
                    dependencies={Object.values(project.processDependencies)}
                    onDependenciesChange={(deps) => {
                        const depMap = deps.reduce((acc, d) => ({...acc, [d.id]: d}), {});
                        updateProject({ processDependencies: depMap });
                    }}
                    onProcessesChange={(procs) => {
                        const procMap = procs.reduce((acc, p) => ({...acc, [p.id]: p}), {});
                        updateProject({ processes: procMap });
                    }}
                />;
            case 4:
                return <PDFDEditor 
                    processes={Object.values(project.processes)} // For visualization
                    entities={Object.values(project.entities)} // For visualization
                    dependencies={Object.values(project.processDependencies)} // For visualization
                    dataFlows={Object.values(project.dataFlows)}
                    triggers={Object.values(project.triggers)}
                    onDataFlowsChange={(flows) => {
                        const flowMap = flows.reduce((acc, f) => ({...acc, [f.id]: f}), {});
                        updateProject({ dataFlows: flowMap });
                    }}
                    onDependenciesChange={(deps) => {
                        const depMap = deps.reduce((acc, d) => ({...acc, [d.id]: d}), {});
                        updateProject({ processDependencies: depMap });
                    }}
                    onProcessesChange={(procs) => {
                        const procMap = procs.reduce((acc, p) => ({...acc, [p.id]: p}), {});
                        updateProject({ processes: procMap });
                    }}
                    onEntitiesChange={(ents) => {
                       const entMap = ents.reduce((acc, e) => ({...acc, [e.id]: e}), {});
                       updateProject({ entities: entMap });
                    }}
                    onTriggersChange={(trigs) => {
                        const trigMap = trigs.reduce((acc, t) => ({...acc, [t.id]: t}), {});
                        updateProject({ triggers: trigMap });
                    }}
                />;
            case 5:
                return <CRUDMatrix 
                    processes={Object.values(project.processes)}
                    entities={Object.values(project.entities)}
                    dependencies={Object.values(project.processDependencies)}
                    dataFlows={Object.values(project.dataFlows)}
                />;
            default:
                return <div>Unknown Step</div>;
        }
    };

    const handleStepChange = (step: 1 | 2 | 3 | 4 | 5) => {
        // Here we will eventually add "Guard" logic (canStepChange?)
        setProject(prev => ({ ...prev, currentStep: step }));
    };

    return (
        <div className="flex w-full h-full bg-slate-50 overflow-hidden">
            {/* Sidebar Navigation */}
            <ProcessNavigator 
                currentStep={project.currentStep} 
                onStepChange={(s) => updateProject({ currentStep: s })} 
                onBack={onBack}
            />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white shadow-xl rounded-tl-xl border-l border-t border-slate-200 ml-[-1px]">
                 {/* Workspace Header - Optional, for Breadcrumb or Title if needed */}
                 {/* <div className="h-12 border-b flex items-center px-4 bg-white">
                     <h2 className="font-bold text-slate-700">{project.name}</h2>
                 </div> */}
                 
                {/* Editor Container */}
                <div className="flex-1 overflow-hidden relative">
                    {renderStep()}
                </div>
            </div>
        </div>
    );
};
