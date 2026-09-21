'use client';

import Link from 'next/link';

export function OperativeNotePrintToolbar({ caseId }: { caseId: string }) {
  const editorHref = `/doctor/surgical-cases/${caseId}/operative-record`;

  return (
    <div
      className="no-print"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 10000,
        display: 'flex',
        gap: 8,
      }}
    >
      <Link
        href={editorHref}
        style={{
          background: '#fff',
          color: '#2c2e4b',
          border: '1px solid #e7d6bf',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(44,46,75,0.12)',
        }}
      >
        ← Back to note
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        style={{
          background: '#2c2e4b',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: 13,
          cursor: 'pointer',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(44,46,75,0.25)',
        }}
      >
        Print
      </button>
      <button
        type="button"
        onClick={() => {
          if (window.opener && !window.opener.closed) {
            window.close();
            return;
          }
          window.location.href = editorHref;
        }}
        style={{
          background: '#fff',
          color: '#64748b',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Close
      </button>
    </div>
  );
}
