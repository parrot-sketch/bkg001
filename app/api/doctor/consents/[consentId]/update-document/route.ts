import { NextRequest, NextResponse } from "next/server";
import { uploadStream } from "@/lib/cloudinary";
import { db } from "@/lib/db";
import { JwtMiddleware } from "@/lib/auth/middleware";
import crypto from "crypto";
import { ConsentDocumentType } from "@prisma/client";

export const maxDuration = 60;

/**
 * PATCH /api/doctor/consents/[consentFormId]/update-document
 * 
 * Uploads a new version of a signed document for an existing consent form.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ consentId: string }> }
) {
  try {
    const authResult = await JwtMiddleware.authenticate(req);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = authResult.user;

    const { consentId } = await context.params;

    // Verify the consent form exists
    const consentForm = await db.consentForm.findUnique({
      where: { id: consentId },
      include: { 
        case_plan: {
          include: { 
            surgical_case: true 
          }
        },
        documents: {
          orderBy: { version: 'desc' },
          take: 1
        }
      },
    });

    if (!consentForm) {
      return NextResponse.json({ error: "Consent form not found" }, { status: 404 });
    }

    const caseId = consentForm.case_plan?.surgical_case?.id;
    if (!caseId) {
        return NextResponse.json({ error: "Associated surgical case not found" }, { status: 404 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${crypto.randomUUID()}-${safeName}`;
    
    // Upload to Cloudinary
    await uploadStream(buffer, {
      folder: `consents/${caseId}`,
      public_id: filename,
      resource_type: file.type === 'application/pdf' ? 'raw' : 'image',
    });

    // Versioning logic
    const latestDoc = consentForm.documents[0];
    const newVersion = latestDoc ? latestDoc.version + 1 : 1;

    // Create new Document record within transaction
    const result = await db.consentFormDocument.create({
      data: {
        consent_form_id: consentId,
        file_url: `/api/files/consents/${caseId}/${filename}`,
        checksum_sha256: checksum,
        uploaded_by_user_id: user.userId,
        document_type: ConsentDocumentType.SIGNED_PDF, // Consistent with upload-signed
        file_size: file.size,
        file_name: safeName,
        version: newVersion,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Document updated successfully",
      data: result
    });

  } catch (error: any) {
    console.error("Error updating consent document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update consent document" },
      { status: 500 }
    );
  }
}
