import { SeoResult } from '../types';

// PDF Export using html2pdf.js (supports Cyrillic via HTML rendering)
export async function exportToPdf(result: SeoResult, filename: string = 'seo-content'): Promise<void> {
    const html2pdf = (await import('html2pdf.js')).default;

    // Create HTML content for PDF
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
            <h1 style="color: #006450; margin-bottom: 20px; font-size: 24px;">SEO Content Export</h1>
            
            ${result.metaTitle ? `
                <div style="margin-bottom: 15px;">
                    <strong style="color: #333;">Meta Title:</strong>
                    <p style="margin: 5px 0; color: #555;">${escapeHtml(result.metaTitle)}</p>
                </div>
            ` : ''}
            
            ${result.metaDescription ? `
                <div style="margin-bottom: 20px;">
                    <strong style="color: #333;">Meta Description:</strong>
                    <p style="margin: 5px 0; color: #555;">${escapeHtml(result.metaDescription)}</p>
                </div>
            ` : ''}
            
            <div style="margin-bottom: 15px;">
                <strong style="color: #333; font-size: 14px;">Content:</strong>
            </div>
            
            <div style="line-height: 1.6; color: #333; font-size: 12px;">
                ${markdownToHtml(result.content)}
            </div>
            
            ${result.spamScore !== undefined && result.spamScore >= 0 ? `
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <strong style="color: #333;">Spam Score: ${result.spamScore}%</strong>
                    ${result.spamAnalysis ? `<p style="margin: 10px 0; color: #666; font-size: 11px;">${escapeHtml(result.spamAnalysis)}</p>` : ''}
                </div>
            ` : ''}
        </div>
    `;

    // Create temporary container
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    // PDF options
    const opt = {
        margin: 10,
        filename: `${filename}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            letterRendering: true
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' as const
        }
    };

    try {
        await html2pdf().set(opt).from(container).save();
    } finally {
        // Cleanup
        document.body.removeChild(container);
    }
}

// Helper to escape HTML
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
    if (!markdown) return '';
    
    return markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3 style="font-size: 14px; color: #333; margin: 15px 0 10px;">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="font-size: 16px; color: #333; margin: 20px 0 10px;">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 style="font-size: 18px; color: #333; margin: 25px 0 15px;">$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code
        .replace(/`(.*?)`/g, '<code style="background: #f4f4f4; padding: 2px 5px; border-radius: 3px;">$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #006450;">$1</a>')
        // Bullet points
        .replace(/^[-*] (.*$)/gim, '<li style="margin: 5px 0;">$1</li>')
        // Wrap lists
        .replace(/(<li.*<\/li>\n?)+/g, '<ul style="margin: 10px 0; padding-left: 20px;">$&</ul>')
        // Paragraphs (lines that don't start with HTML tags)
        .replace(/^(?!<[hulo])(.*$)/gim, (match) => {
            if (match.trim() && !match.startsWith('<')) {
                return `<p style="margin: 10px 0;">${match}</p>`;
            }
            return match;
        })
        // Line breaks
        .replace(/\n\n/g, '<br/><br/>');
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
    const lines = result.content.split('\n');

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
            // Handle bold text
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
            new Paragraph({
                text: '',
                spacing: { before: 400 }
            })
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
        sections: [{
            properties: {},
            children
        }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
}
