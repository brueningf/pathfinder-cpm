import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { StructuredAnalysisData } from '../types/structuredAnalysis';

export const exportStructuredAnalysisReport = async (data: StructuredAnalysisData, projectName: string) => {
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    let yOffset = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Title Page
    pdf.setFontSize(24);
    pdf.text('Structured Analysis Report', pageWidth / 2, 100, { align: 'center' });
    pdf.setFontSize(16);
    pdf.text(projectName, pageWidth / 2, 115, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(new Date().toLocaleDateString(), pageWidth / 2, 130, { align: 'center' });

    pdf.addPage();

    // 1. Context Diagram
    pdf.setFontSize(18);
    pdf.text('1. Context Diagram', margin, yOffset);
    yOffset += 10;

    // Note: Capturing the actual rendered diagram is tricky without it being visible.
    // For now, we will list the components textually as a fallback, 
    // or we would need to render the components off-screen and capture them.
    // Given the constraints, a textual summary is safer and faster to implement reliably.

    pdf.setFontSize(12);
    data.contextDiagram.nodes.forEach(node => {
        pdf.text(`- [${node.type.toUpperCase()}] ${node.name}`, margin + 5, yOffset);
        yOffset += 7;
    });

    yOffset += 10;

    // 2. Data Flow Diagrams
    pdf.setFontSize(18);
    pdf.text('2. Data Flow Diagrams', margin, yOffset);
    yOffset += 10;

    if (data.dfds.length === 0) {
        pdf.setFontSize(12);
        pdf.text('No DFDs defined.', margin + 5, yOffset);
        yOffset += 10;
    } else {
        data.dfds.forEach(dfd => {
            if (yOffset > 250) { pdf.addPage(); yOffset = 20; }
            pdf.setFontSize(14);
            pdf.text(`Level ${dfd.level} DFD`, margin + 5, yOffset);
            yOffset += 10;

            pdf.setFontSize(12);
            dfd.nodes.forEach(node => {
                pdf.text(`- [${node.type.toUpperCase()}] ${node.name}`, margin + 10, yOffset);
                yOffset += 7;
            });
            yOffset += 5;
        });
    }

    yOffset += 10;

    // 3. Data Dictionary
    if (yOffset > 200) { pdf.addPage(); yOffset = 20; }
    pdf.setFontSize(18);
    pdf.text('3. Data Dictionary', margin, yOffset);
    yOffset += 10;

    data.dictionary.forEach(entry => {
        if (yOffset > 270) { pdf.addPage(); yOffset = 20; }
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${entry.name} (${entry.type})`, margin + 5, yOffset);
        yOffset += 5;
        pdf.setFont('helvetica', 'normal');

        const lines = pdf.splitTextToSize(entry.definition, contentWidth - 10);
        pdf.text(lines, margin + 10, yOffset);
        yOffset += (lines.length * 5) + 5;
    });

    pdf.save(`${projectName.replace(/\s+/g, '_')}_Analysis_Report.pdf`);
};
