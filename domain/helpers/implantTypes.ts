/**
 * Domain Types: Implant/Device Tracking
 *
 * Structured types for surgical implant and device traceability.
 * Stored as JSON in CasePlan.implant_details field.
 *
 * This approach avoids a migration for a separate table while still
 * providing typed, structured data for the UI.
 */

export interface ImplantDevice {
    /** Unique ID within this plan (UUID or nanoid) */
    id: string;
    /** Device/implant name */
    name: string;
    /** Manufacturer */
    manufacturer: string;
    /** Lot number */
    lotNumber: string;
    /** Serial number (if applicable) */
    serialNumber?: string;
    /** Expiry date ISO string (if applicable) */
    expiryDate?: string;
    /** Size or model specification */
    size?: string;
    /** Additional notes */
    notes?: string;
}

/**
 * Wrapper for the implant_details JSON field.
 * Contains an array of structured implant items plus optional free-text notes.
 */
export interface ImplantData {
    items: ImplantDevice[];
    /** Legacy free-text notes (preserved from earlier data) */
    freeTextNotes?: string;
}

/**
 * Parse the implant_details field into structured ImplantData.
 * Handles both new JSON format and legacy free-text format gracefully.
 */
export function parseImplantData(raw: string | null | undefined): ImplantData {
    if (!raw || raw.trim().length === 0) {
        return { items: [], freeTextNotes: '' };
    }

    try {
        const parsed = JSON.parse(raw);
        // New format: { items: [...], freeTextNotes?: string }
        if (parsed && Array.isArray(parsed.items)) {
            return parsed as ImplantData;
        }
        // Possibly an array directly
        if (Array.isArray(parsed)) {
            return { items: parsed };
        }
    } catch {
        // Not JSON — treat as legacy free-text
    }

    return { items: [], freeTextNotes: raw };
}

/**
 * Serialize ImplantData back to the JSON string for storage.
 */
export function serializeImplantData(data: ImplantData): string {
    return JSON.stringify(data);
}
