import { SeoResult } from '../types';

// PDF Export using jsPDF with proper text handling
export async function exportToPdf(result: SeoResult, filename: string = 'seo-content'): Promise<void> {
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = 20;

    // Helper to add text with word wrap and page breaks
    const addText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        
        // Use standard font
        const fontStyle = isBold ? 'bold' : 'normal';
        doc.setFont('helvetica', fontStyle);

        // Split text into lines that fit the page width
        const lines = doc.splitTextToSize(text, maxWidth);

        for (const line of lines) {
            // Check if we need a new page
            if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
            }
            doc.text(line, margin, yPosition);
            yPosition += fontSize * 0.4;
        }
        yPosition += 2;
    };

    // Title
    addText('SEO Content Export', 18, true, [0, 100, 80]);
    yPosition += 5;

    // Meta Title
    if (result.metaTitle) {
        addText('Meta Title:', 12, true);
        addText(result.metaTitle, 11);
        yPosition += 3;
    }

    // Meta Description
    if (result.metaDescription) {
        addText('Meta Description:', 12, true);
        addText(result.metaDescription, 11);
        yPosition += 3;
    }

    // Main Content
    addText('Content:', 12, true);
    yPosition += 2;

    // Clean content from markdown
    const cleanContent = (result.content || '')
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[-*]\s/g, '• ');

    addText(cleanContent, 10);

    // Spam Score
    if (result.spamScore !== undefined && result.spamScore >= 0) {
        yPosition += 5;
        addText(`Spam Score: ${result.spamScore}%`, 11, true);
        if (result.spamAnalysis) {
            addText(result.spamAnalysis, 10);
        }
    }

    // Save the PDF
    doc.save(`${filename}.pdf`);
}

// DOCX Export using docx library (full Unicode/Cyrillic support)
export async function exportToDocx(result: SeoResult, filename: string = 'seo-content'): Promise<void> {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
    const { saveAs } = await import('file-saver');

    const children: any[] = [];

    // Title
    children.push(
        new Paragraph({
            text: 'SEO Content Export',
            heading: HeadingLevel.TITLE,
            spacing: { after: 300 }
        })
    );

    // Meta Title
    if (result.metaTitle) {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Meta Title: ', bold: true }),
                    new TextRun({ text: result.metaTitle })
                ],
                spacing: { after: 200 }
            })
        );
    }

    // Meta Description
    if (result.metaDescription) {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Meta Description: ', bold: true }),
                    new TextRun({ text: result.metaDescription })
                ],
                spacing: { after: 300 }
            })
        );
    }

    // Parse markdown content to DOCX paragraphs
    const lines = (result.content || '').split('\n');

    for (const line of lines) {
        if (!line.trim()) {
            children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
            continue;
        }

        // H1
        if (line.startsWith('# ')) {
            children.push(
                new Paragraph({
                    text: line.replace('# ', ''),
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                })
            );
        }
        // H2
        else if (line.startsWith('## ')) {
            children.push(
                new Paragraph({
                    text: line.replace('## ', ''),
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 150 }
                })
            );
        }
        // H3
        else if (line.startsWith('### ')) {
            children.push(
                new Paragraph({
                    text: line.replace('### ', ''),
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 }
                })
            );
        }
        // Bullet points
        else if (line.startsWith('- ') || line.startsWith('* ')) {
            children.push(
                new Paragraph({
                    text: line.replace(/^[-*]\s/, ''),
                    bullet: { level: 0 },
                    spacing: { after: 50 }
                })
            );
        }
        // Regular paragraph
        else {
            const parts: any[] = [];
            const boldRegex = /\*\*(.*?)\*\*/g;
            let lastIndex = 0;
            let match;

            while ((match = boldRegex.exec(line)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(new TextRun({ text: line.slice(lastIndex, match.index) }));
                }
                parts.push(new TextRun({ text: match[1], bold: true }));
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < line.length) {
                parts.push(new TextRun({ text: line.slice(lastIndex) }));
            }

            if (parts.length === 0) {
                parts.push(new TextRun({ text: line }));
            }

            children.push(
                new Paragraph({
                    children: parts,
                    spacing: { after: 120 }
                })
            );
        }
    }

    // Spam Score section
    if (result.spamScore !== undefined && result.spamScore >= 0) {
        children.push(
            new Paragraph({ text: '', spacing: { before: 400 } })
        );
        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Spam Score: ', bold: true }),
                    new TextRun({ text: `${result.spamScore}%` })
                ],
                spacing: { after: 100 }
            })
        );
        if (result.spamAnalysis) {
            children.push(
                new Paragraph({
                    text: result.spamAnalysis,
                    spacing: { after: 100 }
                })
            );
        }
    }

    const doc = new Document({
        sections: [{ properties: {}, children }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
}
