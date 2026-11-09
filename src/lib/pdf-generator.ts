import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { FormSectionWithFields } from "./firebaseService";

// Helper to sanitize text for standard PDF Helvetica font (ASCII only)
function sanitizePdfText(str: string): string {
  if (!str) return "";
  return str.replace(/[^\x20-\x7E]/g, " ").trim();
}

// Helper to truncate or wrap single-line text
function truncateText(str: string, maxLen: number = 85): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

export async function generateFormPdf(
  formName: string,
  formSections: FormSectionWithFields[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let currentPage = pdfDoc.addPage();
  const { width, height } = currentPage.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const x = 50;
  let y = height - 45;
  const lineHeight = 16;
  const sectionGap = 22;
  const fieldGap = 8;
  let pageNumber = 1;

  const drawHeaderAndFooter = (page: typeof currentPage, pageNum: number) => {
    // Footer
    page.drawText(`FormEase Assistant • Application Preparation Copy • Page ${pageNum}`, {
      x: width / 2 - 130,
      y: 25,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.45)
    });
  };

  // Title
  currentPage.drawText(sanitizePdfText(formName), {
    x,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0.08, 0.18, 0.36)
  });

  y -= 22;

  // Subtitle with date
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
  currentPage.drawText(`Preparation Sheet Generated: ${date}`, {
    x,
    y,
    size: 10,
    font,
    color: rgb(0.38, 0.42, 0.48)
  });

  y -= 20;

  // Disclaimer banner box
  currentPage.drawRectangle({
    x,
    y: y - 26,
    width: width - 100,
    height: 30,
    color: rgb(0.95, 0.97, 1.0),
    borderColor: rgb(0.72, 0.8, 0.92),
    borderWidth: 1
  });

  currentPage.drawText("OFFICIAL APPLICATION PREPARATION COPY - FOR REVIEW & ENTRY", {
    x: x + 10,
    y: y - 12,
    size: 8.5,
    font: boldFont,
    color: rgb(0.12, 0.25, 0.45)
  });

  currentPage.drawText("Use these verified values to complete submission on the authorized government portal.", {
    x: x + 10,
    y: y - 22,
    size: 7.5,
    font,
    color: rgb(0.35, 0.42, 0.52)
  });

  y -= 44;
  drawHeaderAndFooter(currentPage, pageNumber);

  // Draw Sections
  for (const section of formSections) {
    if (y < 90) {
      currentPage = pdfDoc.addPage();
      pageNumber++;
      y = height - 45;
      drawHeaderAndFooter(currentPage, pageNumber);
    }

    // Section Header Box
    currentPage.drawRectangle({
      x,
      y: y - 16,
      width: width - 100,
      height: 20,
      color: rgb(0.92, 0.94, 0.97)
    });

    currentPage.drawText(sanitizePdfText(truncateText(section.title, 75)), {
      x: x + 8,
      y: y - 12,
      size: 11,
      font: boldFont,
      color: rgb(0.1, 0.2, 0.35)
    });

    y -= 26;

    // Fields
    const fields = Array.isArray(section.fields) ? section.fields : [];
    for (const field of fields) {
      if (y < 85) {
        currentPage = pdfDoc.addPage();
        pageNumber++;
        y = height - 45;
        drawHeaderAndFooter(currentPage, pageNumber);
      }

      const labelText = sanitizePdfText(truncateText(`${field.label}:`, 80));
      currentPage.drawText(labelText, {
        x: x + 6,
        y,
        size: 9.5,
        font: boldFont,
        color: rgb(0.25, 0.28, 0.32)
      });

      y -= lineHeight;

      const val = field.value && field.value.trim() ? field.value : "Not provided";
      const isFilled = val !== "Not provided";
      const valueText = sanitizePdfText(truncateText(val, 85));

      currentPage.drawText(valueText, {
        x: x + 18,
        y,
        size: 9.5,
        font,
        color: isFilled ? rgb(0.05, 0.15, 0.25) : rgb(0.6, 0.65, 0.7)
      });

      y -= lineHeight + fieldGap;
    }

    y -= sectionGap;
  }

  return await pdfDoc.save();
}

export function downloadPdf(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
