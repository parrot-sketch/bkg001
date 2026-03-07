import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { JwtMiddleware } from "@/lib/auth/middleware";
import crypto from "crypto";
import { ConsentType, ConsentStatus, ConsentDocumentType } from "@prisma/client";

export const maxDuration = 60; // Allow more time for large file uploads

/**
 * POST /api/doctor/surgical-cases/[caseId]/consents/upload-signed
 * 
 * Simple upload for signed consent forms. Replaces the complex template logic.
 * Expects a multipart form data with a 'file' (PDF or Image) and 'consentType'.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const authResult = await JwtMiddleware.authenticate(req);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = authResult.user;

    const { caseId } = await context.params;

    // Verify surgical case and get CasePlan
    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: caseId },
      include: { case_plan: true },
    });

    if (!surgicalCase) {
      return NextResponse.json({ error: "Surgical case not found" }, { status: 404 });
    }

    if (!surgicalCase.case_plan) {
      return NextResponse.json({ error: "Case plan not found for this surgery" }, { status: 404 });
    }

    const casePlanId = surgicalCase.case_plan.id;

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("consentType") as ConsentType | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: "Consent type not provided" }, { status: 400 });
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/tiff', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Must be PDF or Image." }, { status: 400 });
    }

    // 15MB limit
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 15 MB limit." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Compute simple checksum
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // Secure local storage path: storage/consents/[caseId]/[filename]
    const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.jpg');
    // Sanitize filename to prevent directory traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${crypto.randomUUID()}-${safeName}`;
    const storageDir = path.join(process.cwd(), "storage", "consents", caseId);
    
    // Ensure directory exists
    await mkdir(storageDir, { recursive: true });
    
    const filePath = path.join(storageDir, filename);
    await writeFile(filePath, buffer);

    // Document Type Logic
    const docType = ConsentDocumentType.SIGNED_PDF; // Storing images as PDF type in the DB for now since SIGNED_IMAGE is not in the schema.

    // Database transaction to create ConsentForm and Document
    const result = await db.$transaction(async (tx) => {
      // Create ConsentForm record
      const consentForm = await tx.consentForm.create({
        data: {
          case_plan_id: casePlanId,
          title: `Signed ${type} - ${safeName}`,
          type: type,
          content_snapshot: "Pre-signed document upload", // Placeholder as content isn't parsed
          status: ConsentStatus.SIGNED, 
          signed_at: new Date(),
        },
      });

      // Create Document record
      await tx.consentFormDocument.create({
        data: {
          consent_form_id: consentForm.id,
          file_url: `/api/files/consents/${caseId}/${filename}`, // Relative API URL to fetch it
          checksum_sha256: checksum,
          uploaded_by_user_id: user.userId,
          document_type: docType,
          file_size: file.size,
          file_name: safeName,
        },
      });

      return consentForm;
    });

    return NextResponse.json({ 
      success: true, 
      message: "Consent uploaded successfully",
      data: result
    });

  } catch (error: any) {
    console.error("Error uploading signed consent:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload signed consent" },
      { status: 500 }
    );
  }
}
