import { parse } from "csv-parse/sync";
import { createFaculty, updateFaculty } from "@/services/faculty-service";
import { prisma } from "@/lib/db/prisma";

type FacultyCsvRow = {
  first_name: string;
  last_name: string;
  primary_email: string;
  secondary_email?: string;
};

export type ImportResult = {
  created: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export async function importFacultyCsv(csvContent: string): Promise<ImportResult> {
  const records = parse(csvContent, {
    columns: (headers: string[]) => headers.map(normalizeHeader),
    skip_empty_lines: true,
    trim: true
  }) as FacultyCsvRow[];

  let created = 0;
  let updated = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < records.length; i += 1) {
    const rowNumber = i + 2;
    const row = records[i];

    if (!row.first_name || !row.last_name || !row.primary_email) {
      errors.push({ row: rowNumber, message: "first_name, last_name, and primary_email are required" });
      continue;
    }

    try {
      const existing = await prisma.faculty.findUnique({
        where: { primaryEmail: row.primary_email.toLowerCase() }
      });

      if (existing) {
        await updateFaculty(existing.id, {
          firstName: row.first_name,
          lastName: row.last_name,
          secondaryEmail: row.secondary_email || null,
          activeStatus: true
        });
        updated += 1;
      } else {
        await createFaculty({
          firstName: row.first_name,
          lastName: row.last_name,
          primaryEmail: row.primary_email,
          secondaryEmail: row.secondary_email || null,
          activeStatus: true
        });
        created += 1;
      }
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return { created, updated, errors };
}
