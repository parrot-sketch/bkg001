'use client';

/**
 * Enhanced Examination Tab for Aesthetic Surgery
 * 
 * Structured examination documentation with:
 * - Body area sections (Face, Body, Skin, etc.)
 * - Quick-add templates for common findings
 * - Measurement fields
 * - Photo integration indicators
 * - Standardized assessment scales
 * 
 * Auto-saves via parent context — no per-tab save button needed.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { Stethoscope, Plus, X, Ruler, Camera, Eye, Heart, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ExaminationTabProps {
  initialValue?: string;
  onChange: (value: string) => void;
  isReadOnly?: boolean;
}

interface ExaminationSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: string;
  hasPhotos: boolean;
}

const EXAMINATION_SECTIONS = [
  { id: 'face', title: 'Facial Assessment', icon: Eye },
  { id: 'body', title: 'Body Contour', icon: Heart },
  { id: 'skin', title: 'Skin Quality', icon: Sparkles },
  { id: 'general', title: 'General Findings', icon: Stethoscope },
] as const;

const QUICK_FINDINGS = {
  face: [
    'Symmetry: Normal / Asymmetric',
    'Skin laxity: Mild / Moderate / Severe',
    'Volume loss: Cheeks / Temples / Jawline',
    'Wrinkles: Fine lines / Deep creases',
    'Pigmentation: Even / Uneven / Hyperpigmentation',
    'Texture: Smooth / Rough / Acne scars',
  ],
  body: [
    'Body mass index: Normal / Overweight',
    'Skin elasticity: Good / Moderate / Poor',
    'Fat distribution: Even / Localized deposits',
    'Muscle tone: Good / Moderate / Poor',
    'Asymmetry: None / Mild / Moderate / Severe',
    'Scarring: None / Minimal / Significant',
  ],
  skin: [
    'Fitzpatrick type: I / II / III / IV / V / VI',
    'Skin tone: Even / Uneven',
    'Texture: Smooth / Rough / Textured',
    'Elasticity: Good / Moderate / Poor',
    'Hydration: Well-hydrated / Dry',
    'Sun damage: None / Mild / Moderate / Severe',
  ],
  general: [
    'Vital signs: Normal',
    'General appearance: Well-appearing',
    'Range of motion: Full / Limited',
    'Sensation: Intact / Altered',
    'Circulation: Good / Compromised',
    'Healing potential: Good / Fair / Poor',
  ],
};

const MEASUREMENT_TEMPLATES = [
  { label: 'BMI', unit: 'kg/m²', placeholder: '22.5' },
  { label: 'Waist', unit: 'cm', placeholder: '75' },
  { label: 'Hip', unit: 'cm', placeholder: '95' },
  { label: 'Chest', unit: 'cm', placeholder: '90' },
  { label: 'Thigh', unit: 'cm', placeholder: '55' },
];

/**
 * Convert sections to HTML
 */
function sectionsToHtml(sections: Map<string, ExaminationSection>): string {
  if (sections.size === 0) return '';
  
  const htmlParts: string[] = [];
  EXAMINATION_SECTIONS.forEach((sectionDef) => {
    const section = sections.get(sectionDef.id);
    if (section && section.content.trim()) {
      htmlParts.push(`<h3>${section.title}</h3>\n${section.content}`);
    }
  });
  
  return htmlParts.join('\n\n');
}

export function ExaminationTab({
  initialValue = '',
  onChange,
  isReadOnly = false,
}: ExaminationTabProps) {
  const [examination, setExamination] = useState(initialValue);
  const [sections, setSections] = useState<Map<string, ExaminationSection>>(new Map());
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const lastSentRef = useRef<string>(initialValue);

  // Initialize from initialValue
  useEffect(() => {
    setExamination(initialValue);
    lastSentRef.current = initialValue;
    // Initialize sections map (we'll build it as user adds content)
    setSections(new Map());
  }, [initialValue]);
  
  useEffect(() => {
    if (examination !== initialValue && examination !== lastSentRef.current) {
      lastSentRef.current = examination;
      onChange(examination);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examination]);

  const handleChange = (value: string) => {
    setExamination(value);
    onChange(value);
  };

  const addQuickFinding = useCallback((sectionId: string, finding: string) => {
    const section = sections.get(sectionId) || {
      id: sectionId,
      title: EXAMINATION_SECTIONS.find(s => s.id === sectionId)?.title || 'Section',
      icon: Stethoscope,
      content: '',
      hasPhotos: false,
    };

    const Icon = EXAMINATION_SECTIONS.find(s => s.id === sectionId)?.icon || Stethoscope;
    const newContent = section.content
      ? `${section.content}\n<p>• ${finding}</p>`
      : `<p>• ${finding}</p>`;

    const updatedSection: ExaminationSection = {
      ...section,
      icon: Icon,
      content: newContent,
    };

    const updatedSections = new Map(sections);
    updatedSections.set(sectionId, updatedSection);

    // Convert to HTML and update
    const html = sectionsToHtml(updatedSections);
    setSections(updatedSections);
    setExamination(html);
    onChange(html);
    
    // Auto-expand the section so user can see what was added
    setActiveSection(sectionId);
    
    toast.success(`Added: ${finding}`);
  }, [sections, onChange]);

  const addMeasurement = useCallback((label: string, value: string) => {
    if (!value.trim()) {
      toast.error('Please enter a measurement value');
      return;
    }

    const template = MEASUREMENT_TEMPLATES.find(m => m.label === label);
    const measurementText = `${label}: ${value} ${template?.unit || ''}`;
    
    // Add to general section or create it
    const generalSection = sections.get('general') || {
      id: 'general',
      title: 'General Findings',
      icon: Stethoscope,
      content: '',
      hasPhotos: false,
    };

    const newContent = generalSection.content
      ? `${generalSection.content}\n<p><strong>${measurementText}</strong></p>`
      : `<p><strong>${measurementText}</strong></p>`;

    const updatedSection: ExaminationSection = {
      ...generalSection,
      content: newContent,
    };

    const updatedSections = new Map(sections);
    updatedSections.set('general', updatedSection);

    const html = sectionsToHtml(updatedSections);
    setSections(updatedSections);
    setExamination(html);
    onChange(html);
    
    // Clear measurement input
    setMeasurements(prev => ({ ...prev, [label]: '' }));
    toast.success('Measurement added');
  }, [sections, onChange]);

  const toggleSection = useCallback((sectionId: string) => {
    setActiveSection(prev => prev === sectionId ? null : sectionId);
  }, []);

  return (
    <div className="p-5 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Section header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-slate-900">Physical Examination</h2>
        </div>
        <p className="text-xs text-slate-500 ml-6">
          Document examination findings, measurements, and clinical observations for aesthetic assessment.
        </p>
      </div>

      {/* Read Mode */}
      {isReadOnly ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recorded Physical Findings</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          </div>
          <div className="p-8">
            {examination ? (
              <div
                className="prose prose-slate prose-sm max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-base prose-h3:text-slate-900 prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3"
                dangerouslySetInnerHTML={{ __html: examination }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100 text-slate-300">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-slate-400">No physical examination findings recorded</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Structured Sections */}
          <div className="space-y-4">
            {EXAMINATION_SECTIONS.map((sectionDef) => {
              const Icon = sectionDef.icon;
              const section = sections.get(sectionDef.id);
              const isActive = activeSection === sectionDef.id;
              const hasContent = section && section.content.trim().length > 0;

              return (
                <div
                  key={sectionDef.id}
                  className={cn(
                    'rounded-xl border transition-all',
                    isActive
                      ? 'border-indigo-300 bg-indigo-50/30 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  {/* Section Header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionDef.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        hasContent ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{sectionDef.title}</h3>
                        {hasContent && (
                          <p className="text-xs text-slate-500 mt-0.5">Has findings</p>
                        )}
                      </div>
                    </div>
                    {hasContent && (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    )}
                  </button>

                  {/* Section Content (Collapsible) */}
                  {isActive && (
                    <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                      {/* Quick Findings */}
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                          Quick Add — Common Findings
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {QUICK_FINDINGS[sectionDef.id as keyof typeof QUICK_FINDINGS]?.map((finding) => (
                            <button
                              key={finding}
                              type="button"
                              onClick={() => addQuickFinding(sectionDef.id, finding)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                            >
                              {finding}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Preview of Current Findings */}
                      {section?.content && (
                        <div className="space-y-2 animate-in fade-in duration-300">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Current Findings Preview
                            </p>
                            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {section.content.split('<p>').length - 1} {section.content.split('<p>').length - 1 === 1 ? 'finding' : 'findings'}
                            </span>
                          </div>
                          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 max-h-40 overflow-y-auto custom-scrollbar-light">
                            <div
                              className="prose prose-slate prose-sm max-w-none prose-p:text-slate-700 prose-p:text-sm prose-p:my-1 prose-ul:text-slate-700 prose-ul:text-sm"
                              dangerouslySetInnerHTML={{ __html: section.content }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Rich Text Editor for Section */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {section?.content ? 'Edit Findings' : 'Add Detailed Notes'}
                        </p>
                        <RichTextEditor
                          key={`${sectionDef.id}-${section?.content?.length || 0}`} // Force re-render when content changes
                          content={section?.content || ''}
                          onChange={(value) => {
                            const updatedSection: ExaminationSection = {
                              id: sectionDef.id,
                              title: sectionDef.title,
                              icon: Icon,
                              content: value,
                              hasPhotos: value.includes('[PHOTO]') || value.includes('photo'),
                            };
                            const updatedSections = new Map(sections);
                            updatedSections.set(sectionDef.id, updatedSection);
                            setSections(updatedSections);
                            const html = sectionsToHtml(updatedSections);
                            setExamination(html);
                            onChange(html);
                          }}
                          placeholder={`Add detailed findings for ${sectionDef.title.toLowerCase()}...`}
                          readOnly={false}
                          minHeight="200px"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Measurements Panel */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Ruler className="h-4 w-4 text-slate-500" />
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Measurements
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {MEASUREMENT_TEMPLATES.map((template) => (
                <div key={template.label} className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">{template.label}</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={measurements[template.label] || ''}
                      onChange={(e) => setMeasurements(prev => ({ ...prev, [template.label]: e.target.value }))}
                      placeholder={template.placeholder}
                      className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => addMeasurement(template.label, measurements[template.label] || '')}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4 text-indigo-600" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400">{template.unit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Full Editor (Alternative/Additional) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Additional Notes
            </p>
            <RichTextEditor
              content={examination}
              onChange={handleChange}
              placeholder="Add any additional examination notes, observations, or findings not covered above…"
              readOnly={isReadOnly}
              minHeight="250px"
            />
          </div>
        </>
      )}
    </div>
  );
}
