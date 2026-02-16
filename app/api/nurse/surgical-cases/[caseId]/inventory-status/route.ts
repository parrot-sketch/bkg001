import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { InventoryCategory, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Define the expected payload type for type safety
type SurgicalCaseWithPlan = Prisma.SurgicalCaseGetPayload<{
    include: { case_plan: true };
}>;

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
    try {
        const params = await props.params;
        const { caseId } = params;

        // 1. Fetch the Case Plan to get implant details
        const surgicalCase: SurgicalCaseWithPlan | null = await db.surgicalCase.findUnique({
            where: { id: caseId },
            include: {
                case_plan: true,
            },
        });

        if (!surgicalCase) {
            return NextResponse.json(
                { error: 'Surgical case not found' },
                { status: 404 }
            );
        }

        const casePlan = surgicalCase.case_plan;

        // If no case plan or no implant details, return NOT_REQUIRED
        if (!casePlan || !casePlan.implant_details) {
            return NextResponse.json({
                status: 'NOT_REQUIRED',
                required: null,
                matches: [],
            });
        }

        // We know implant_details is string here due to the check above
        const implantDetailsStr: string = casePlan.implant_details;

        // Try to parse JSON if it looks like JSON
        let implantData: any = null;
        let searchKeywords: string[] = [];
        let requiredDisplay: any = implantDetailsStr;

        try {
            if (implantDetailsStr.trim().startsWith('{') || implantDetailsStr.trim().startsWith('[')) {
                const parsed = JSON.parse(implantDetailsStr);

                // Handle the structure {"items": [...], "freeTextNotes": "..."}
                if (parsed.items && Array.isArray(parsed.items)) {
                    implantData = parsed;
                    requiredDisplay = parsed; // Send the whole object to frontend

                    // Extract keywords from items
                    parsed.items.forEach((item: any) => {
                        if (item.name) searchKeywords.push(item.name);
                        if (item.size) searchKeywords.push(item.size);
                        if (item.manufacturer) searchKeywords.push(item.manufacturer);
                        if (item.serialNumber) searchKeywords.push(item.serialNumber);
                    });
                }
                // Handle simple array of strings or objects? (Just in case)
                else if (Array.isArray(parsed)) {
                    // unexpected structure but lets try to handle
                    requiredDisplay = parsed;
                }
            }
        } catch (e) {
            // Not JSON, treat as plain text
            // console.log('Implant details is not JSON');
        }

        // 2. Keyword extraction
        if (searchKeywords.length === 0) {
            // Fallback to splitting by common delimiters if no JSON keywords found
            searchKeywords = implantDetailsStr.split(/[\s,]+/).filter(k => k.length > 2);
        }

        // We will perform a broad OR search
        const matches = await db.inventoryItem.findMany({
            where: {
                is_active: true,
                category: InventoryCategory.IMPLANT,
                OR: [
                    // Broad match on the whole string (legacy behavior)
                    { name: { contains: implantDetailsStr, mode: Prisma.QueryMode.insensitive } },
                    // Specific keyword matches
                    ...searchKeywords.map(k => ({ name: { contains: k, mode: Prisma.QueryMode.insensitive } })),
                    ...searchKeywords.map(k => ({ description: { contains: k, mode: Prisma.QueryMode.insensitive } })),
                    ...searchKeywords.map(k => ({ manufacturer: { contains: k, mode: Prisma.QueryMode.insensitive } })),
                    ...searchKeywords.map(k => ({ sku: { contains: k, mode: Prisma.QueryMode.insensitive } }))
                ]
            },
            take: 5,
        });

        // Determine status
        let status = 'UNAVAILABLE';
        if (matches.length > 0) {
            const hasStock = matches.some(m => m.quantity_on_hand > 0);
            status = hasStock ? 'AVAILABLE' : 'OUT_OF_STOCK';
        } else {
            // If we found no matches in the database for the text
            status = 'UNKNOWN'; // Item not found in inventory system
        }

        return NextResponse.json({
            status,
            required: requiredDisplay, // This can now be an object or string
            matches: matches.map(m => ({
                id: m.id,
                name: m.name,
                quantity: m.quantity_on_hand,
                sku: m.sku
            }))
        });

    } catch (error) {
        console.error('Error fetching inventory status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
