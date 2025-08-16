import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { FormSectionWithFields } from "./firebaseService";

export async function generateFormPdf(
  formName: string,
  formSections: FormSectionWithFields[]
): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Add a page to the document and get dimensions
  let currentPage = pdfDoc.addPage();
  
  // Get the page dimensions
  const { width, height } = currentPage.getSize();
  
  // Embed the standard font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Set up initial coordinates
  let x = 50;
  let y = height - 50;
  const lineHeight = 20;
  const sectionGap = 30;
  const fieldGap = 10;
  
  // Add title
  currentPage.drawText(formName, {
    x,
    y,
    size: 24,
    font: boldFont,
    color: rgb(0, 0, 0.5)
  });
  
  y -= 40;
  
  // Add subtitle with date
  const date = new Date().toLocaleDateString();
  currentPage.drawText(`Generated on ${date}`, {
    x,
    y,
    size: 12,
    font,
    color: rgb(0.4, 0.4, 0.4)
  });
  
  y -= sectionGap;
  
  // Draw each section and its fields
  for (const section of formSections) {
    // Check if we need to add a new page
    if (y < 100) {
      currentPage = pdfDoc.addPage();
      y = height - 50;
    }
    
    // Draw section title
    currentPage.drawText(section.title, {
      x,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0.7)
    });
    
    y -= lineHeight + 5;
    
    // Draw horizontal line
    currentPage.drawLine({
      start: { x, y: y + 5 },
      end: { x: width - 50, y: y + 5 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7)
    });
    
    y -= lineHeight;
    
    // Draw each field
    for (const field of section.fields) {
      // Check if we need to add a new page
      if (y < 100) {
        currentPage = pdfDoc.addPage();
        y = height - 50;
      }
      
      // Draw field label
      currentPage.drawText(`${field.label}${field.required ? ' *' : ''}:`, {
        x,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.3, 0.3, 0.3)
      });
      
      y -= lineHeight;
      
      // Draw field value
      currentPage.drawText(field.value || 'Not provided', {
        x: x + 20,
        y,
        size: 12,
        font,
        color: field.value ? rgb(0, 0, 0) : rgb(0.6, 0.6, 0.6)
      });
      
      y -= lineHeight + fieldGap;
    }
    
    y -= sectionGap - fieldGap; // Add space between sections
  }
  
  // Add footer
  const footerY = 30;
  currentPage.drawText('FormEase - AI-Powered Form Assistant', {
    x: width / 2 - 100,
    y: footerY,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  // Serialize the PDFDocument to bytes
  return await pdfDoc.save();
}

export function downloadPdf(pdfBytes: Uint8Array, filename: string): void {
  // Create a blob from the PDF bytes
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger the download
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
