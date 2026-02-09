/**
 * Value Object: ConsultationNotes
 * 
 * Immutable value object representing consultation notes.
 * Supports both structured (chief complaint, examination, assessment, plan) and raw text formats.
 */
export class ConsultationNotes {
  private constructor(
    private readonly chiefComplaint: string | undefined,
    private readonly examination: string | undefined,
    private readonly assessment: string | undefined,
    private readonly plan: string | undefined,
    private readonly rawText: string | undefined, // Full text if not structured
  ) {}

  /**
   * Creates structured consultation notes
   */
  static createStructured(params: {
    chiefComplaint?: string;
    examination?: string;
    assessment?: string;
    plan?: string;
  }): ConsultationNotes {
    return new ConsultationNotes(
      params.chiefComplaint?.trim(),
      params.examination?.trim(),
      params.assessment?.trim(),
      params.plan?.trim(),
      undefined,
    );
  }

  /**
   * Creates raw text consultation notes
   */
  static createRaw(text: string): ConsultationNotes {
    return new ConsultationNotes(
      undefined,
      undefined,
      undefined,
      undefined,
      text.trim(),
    );
  }

  /**
   * Creates empty consultation notes
   */
  static createEmpty(): ConsultationNotes {
    return new ConsultationNotes(undefined, undefined, undefined, undefined, undefined);
  }

  // Getters
  getChiefComplaint(): string | undefined {
    return this.chiefComplaint;
  }

  getExamination(): string | undefined {
    return this.examination;
  }

  getAssessment(): string | undefined {
    return this.assessment;
  }

  getPlan(): string | undefined {
    return this.plan;
  }

  getRawText(): string | undefined {
    return this.rawText;
  }

  /**
   * Check if notes are empty
   */
  isEmpty(): boolean {
    return (
      !this.chiefComplaint &&
      !this.examination &&
      !this.assessment &&
      !this.plan &&
      !this.rawText
    );
  }

  /**
   * Convert to full text format (preserves HTML)
   */
  toFullText(): string {
    if (this.rawText) {
      return this.rawText;
    }
    const parts: string[] = [];
    if (this.chiefComplaint) {
      parts.push(`Chief Complaint: ${this.chiefComplaint}`);
    }
    if (this.examination) {
      parts.push(`Examination: ${this.examination}`);
    }
    if (this.assessment) {
      parts.push(`Assessment: ${this.assessment}`);
    }
    if (this.plan) {
      parts.push(`Plan: ${this.plan}`);
    }
    return parts.join('\n\n');
  }

  /**
   * Convert to plain text summary (HTML stripped).
   * Suitable for preview cards, timelines, and search indexing.
   */
  toPlainText(): string {
    if (this.rawText) {
      return ConsultationNotes.stripHtml(this.rawText);
    }
    const parts: string[] = [];
    if (this.chiefComplaint) {
      parts.push(`Chief Complaint: ${ConsultationNotes.stripHtml(this.chiefComplaint)}`);
    }
    if (this.examination) {
      parts.push(`Examination: ${ConsultationNotes.stripHtml(this.examination)}`);
    }
    if (this.assessment) {
      parts.push(`Assessment: ${ConsultationNotes.stripHtml(this.assessment)}`);
    }
    if (this.plan) {
      parts.push(`Plan: ${ConsultationNotes.stripHtml(this.plan)}`);
    }
    return parts.join(' · ');
  }

  /**
   * Strip HTML tags and normalize whitespace.
   * Handles Tiptap output (p, ul, ol, li, br, strong, em, etc.)
   */
  private static stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, ' ')          // <br> → space
      .replace(/<\/?(p|div|li|h[1-6])>/gi, ' ') // block-level closers → space
      .replace(/<[^>]*>/g, '')                 // strip remaining tags
      .replace(/&nbsp;/gi, ' ')               // HTML entities
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')                   // collapse whitespace
      .trim();
  }

  /**
   * Check if notes are structured
   */
  isStructured(): boolean {
    return this.rawText === undefined;
  }

  /**
   * Equality check
   */
  equals(other: ConsultationNotes | null | undefined): boolean {
    if (!other) {
      return false;
    }
    return (
      this.chiefComplaint === other.chiefComplaint &&
      this.examination === other.examination &&
      this.assessment === other.assessment &&
      this.plan === other.plan &&
      this.rawText === other.rawText
    );
  }
}
