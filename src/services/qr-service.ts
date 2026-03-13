import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

export type QrRenderableFaculty = {
  id: string;
  firstName: string;
  lastName: string;
  publicToken: string;
};

export function facultyFeedbackUrl(publicToken: string): string {
  return `${env.APP_BASE_URL}/f/${publicToken}`;
}

export async function generateQrDataUrl(publicToken: string): Promise<string> {
  return QRCode.toDataURL(facultyFeedbackUrl(publicToken), {
    errorCorrectionLevel: "H",
    margin: 1,
    scale: 8
  });
}

export async function generateFacultyQrPngBuffer(publicToken: string): Promise<Uint8Array> {
  const png = await QRCode.toBuffer(facultyFeedbackUrl(publicToken), {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 1,
    width: 512
  });

  return new Uint8Array(png);
}

function drawCenteredText(
  page: import("pdf-lib").PDFPage,
  font: import("pdf-lib").PDFFont,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  color: ReturnType<typeof rgb>
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  const drawX = x + Math.max(0, (width - textWidth) / 2);

  page.drawText(text, {
    x: drawX,
    y,
    size,
    font,
    color
  });
}

async function addCard(
  pdfDoc: PDFDocument,
  page: import("pdf-lib").PDFPage,
  font: import("pdf-lib").PDFFont,
  faculty: QrRenderableFaculty,
  qrPng: Uint8Array,
  x: number,
  topY: number,
  cardWidth: number,
  cardHeight: number,
  includeUrl: boolean
) {
  const pageHeight = page.getHeight();
  const y = pageHeight - topY - cardHeight;
  const qrImage = await pdfDoc.embedPng(qrPng);
  const qrSize = Math.min(cardWidth - 24, cardHeight - 110);
  const qrX = x + (cardWidth - qrSize) / 2;
  const qrY = y + cardHeight - 36 - qrSize - 18;

  page.drawRectangle({
    x,
    y,
    width: cardWidth,
    height: cardHeight,
    borderWidth: 1,
    borderColor: rgb(0.12, 0.16, 0.22)
  });

  page.drawText(`${faculty.firstName} ${faculty.lastName}`, {
    x: x + 12,
    y: y + cardHeight - 28,
    size: 14,
    font,
    color: rgb(0.07, 0.09, 0.12)
  });

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize
  });

  drawCenteredText(
    page,
    font,
    "Scan to provide anonymous feedback",
    x + 12,
    y + 28,
    cardWidth - 24,
    11,
    rgb(0.22, 0.25, 0.32)
  );

  if (includeUrl) {
    drawCenteredText(
      page,
      font,
      facultyFeedbackUrl(faculty.publicToken),
      x + 12,
      y + 12,
      cardWidth - 24,
      9,
      rgb(0.42, 0.45, 0.5)
    );
  }
}

export async function generateQrPacketPdf(options: {
  faculty: QrRenderableFaculty[];
  format: "single" | "grid";
  includeShortUrl?: boolean;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  const qrCache = new Map<string, Uint8Array>();
  for (const f of options.faculty) {
    qrCache.set(f.id, new Uint8Array(await generateFacultyQrPngBuffer(f.publicToken)));
  }

  if (options.format === "single") {
    for (let i = 0; i < options.faculty.length; i += 1) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const f = options.faculty[i];
      await addCard(pdfDoc, page, font, f, qrCache.get(f.id)!, 70, 120, 450, 620, options.includeShortUrl ?? true);
    }
  } else {
    const cols = 2;
    const rows = 3;
    const gap = 14;
    const margin = 24;
    const cardWidth = (pageWidth - margin * 2 - gap) / cols;
    const cardHeight = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);

    for (let i = 0; i < options.faculty.length; i += 1) {
      const pagePosition = i % (cols * rows);
      const row = Math.floor(pagePosition / cols);
      const col = pagePosition % cols;

      if (i > 0 && pagePosition === 0) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
      }

      const x = margin + col * (cardWidth + gap);
      const y = margin + row * (cardHeight + gap);
      const f = options.faculty[i];
      await addCard(pdfDoc, page, font, f, qrCache.get(f.id)!, x, y, cardWidth, cardHeight, options.includeShortUrl ?? true);
    }
  }

  return await pdfDoc.save();
}

export async function generateSessionQrPacket(sessionId: string, format: "single" | "grid") {
  const session = await prisma.teachingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      activeStatus: true,
      facultyAssignments: {
        include: {
          faculty: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              publicToken: true,
              activeStatus: true
            }
          }
        }
      }
    }
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (!session.activeStatus) {
    throw new Error("Session is archived");
  }

  const faculty = session.facultyAssignments
    .map((assignment) => assignment.faculty)
    .filter((member) => member.activeStatus)
    .map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      publicToken: member.publicToken
    }));

  return generateQrPacketPdf({
    faculty,
    format,
    includeShortUrl: true
  });
}
