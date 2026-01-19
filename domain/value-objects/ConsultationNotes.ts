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
   * Convert to full text format
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
