import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

export type QrRenderableFaculty = {
  id: string;
  firstName: string;
  lastName: string;
  publicToken: string;
};

const PDF_FONT_CANDIDATES = [
  path.join(process.cwd(), "node_modules/next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf"),
  path.join(process.cwd(), "node_modules/playwright-core/lib/vite/traceViewer/codicon.DCmgc-ay.ttf"),
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/Library/Fonts/Arial.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
];

const PDF_FONT_PATH = PDF_FONT_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null;

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

export async function generateFacultyQrPngBuffer(publicToken: string): Promise<Buffer> {
  return QRCode.toBuffer(facultyFeedbackUrl(publicToken), {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 1,
    width: 512
  });
}

function addCard(
  doc: PDFKit.PDFDocument,
  faculty: QrRenderableFaculty,
  qrPng: Buffer,
  x: number,
  y: number,
  cardWidth: number,
  cardHeight: number,
  includeUrl: boolean
) {
  if (!PDF_FONT_PATH) {
    throw new Error("No TTF font available for PDF rendering");
  }

  const setFont = (size: number) => {
    doc.font(PDF_FONT_PATH);
    doc.fontSize(size);
  };

  doc.roundedRect(x, y, cardWidth, cardHeight, 8).stroke("#1f2937");

  setFont(14);
  doc.fillColor("#111827").text(`${faculty.firstName} ${faculty.lastName}`, x + 12, y + 12, {
    width: cardWidth - 24
  });

  doc.image(qrPng, x + 12, y + 36, { fit: [cardWidth - 24, cardHeight - 96], align: "center" });

  setFont(11);
  doc
    .fillColor("#374151")
    .text("Scan to provide anonymous feedback", x + 12, y + cardHeight - 48, {
      width: cardWidth - 24,
      align: "center"
    });

  if (includeUrl) {
    setFont(9);
    doc
      .fillColor("#6b7280")
      .text(facultyFeedbackUrl(faculty.publicToken), x + 12, y + cardHeight - 30, {
        width: cardWidth - 24,
        align: "center"
      });
  }
}

export async function generateQrPacketPdf(options: {
  faculty: QrRenderableFaculty[];
  format: "single" | "grid";
  includeShortUrl?: boolean;
}): Promise<Buffer> {
  // Set `font: null` so PDFKit does not attempt to load built-in Helvetica AFM from bundled paths.
  const doc = new PDFDocument({ size: "A4", margin: 24, font: null as unknown as string });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  const qrCache = new Map<string, Buffer>();
  for (const f of options.faculty) {
    qrCache.set(f.id, await generateFacultyQrPngBuffer(f.publicToken));
  }

  if (options.format === "single") {
    for (let i = 0; i < options.faculty.length; i += 1) {
      if (i > 0) {
        doc.addPage();
      }

      const f = options.faculty[i];
      addCard(doc, f, qrCache.get(f.id)!, 70, 120, 450, 620, options.includeShortUrl ?? true);
    }
  } else {
    const cols = 2;
    const rows = 3;
    const gap = 14;
    const cardWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - gap) / cols;
    const cardHeight = (doc.page.height - doc.page.margins.top - doc.page.margins.bottom - gap * (rows - 1)) / rows;

    for (let i = 0; i < options.faculty.length; i += 1) {
      const pagePosition = i % (cols * rows);
      const row = Math.floor(pagePosition / cols);
      const col = pagePosition % cols;

      if (i > 0 && pagePosition === 0) {
        doc.addPage();
      }

      const x = doc.page.margins.left + col * (cardWidth + gap);
      const y = doc.page.margins.top + row * (cardHeight + gap);
      const f = options.faculty[i];
      addCard(doc, f, qrCache.get(f.id)!, x, y, cardWidth, cardHeight, options.includeShortUrl ?? true);
    }
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
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
