import React from 'react';

export const CPMAnimation: React.FC = () => {
    return (
        <div className="w-full h-32 flex items-center justify-center overflow-hidden">
            <svg width="300" height="100" viewBox="0 0 300 100" className="opacity-80">
                <defs>
                    <marker id="anim-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                    </marker>
                </defs>

                {/* Nodes */}
                <circle cx="30" cy="50" r="15" fill="white" stroke="#ef4444" strokeWidth="2" />
                <circle cx="110" cy="20" r="15" fill="white" stroke="#ef4444" strokeWidth="2" />
                <circle cx="110" cy="80" r="15" fill="white" stroke="#ef4444" strokeWidth="2" />
                <circle cx="190" cy="20" r="15" fill="white" stroke="#ef4444" strokeWidth="2" />
                <circle cx="190" cy="80" r="15" fill="white" stroke="#ef4444" strokeWidth="2" />
                <circle cx="270" cy="50" r="15" fill="white" stroke="#ef4444" strokeWidth="2" />

                {/* Paths */}
                <path d="M 45 50 L 95 20" stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#anim-arrow)" className="animate-dash" />
                <path d="M 45 50 L 95 80" stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#anim-arrow)" className="animate-dash delay-100" />

                <path d="M 125 20 L 175 20" stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#anim-arrow)" className="animate-dash delay-200" />
                <path d="M 125 80 L 175 80" stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#anim-arrow)" className="animate-dash delay-200" />

                <path d="M 205 20 L 255 50" stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#anim-arrow)" className="animate-dash delay-300" />
                <path d="M 205 80 L 255 50" stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#anim-arrow)" className="animate-dash delay-300" />

                <style>{`
                    .animate-dash {
                        stroke-dasharray: 100;
                        stroke-dashoffset: 100;
                        animation: dash 2s linear infinite;
                    }
                    @keyframes dash {
                        to {
                            stroke-dashoffset: 0;
                        }
                    }
                    .delay-100 { animation-delay: 0.1s; }
                    .delay-200 { animation-delay: 0.2s; }
                    .delay-300 { animation-delay: 0.3s; }
                `}</style>
            </svg>
        </div>
    );
};
