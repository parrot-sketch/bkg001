'use client';
import { useEffect } from 'react';

export function AutoPrint() {
    useEffect(() => {
        window.print();
    }, []);
    return null;
}

export function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            style={{
                position: 'fixed', bottom: 24, right: 24,
                background: '#1e40af', color: 'white', border: 'none',
                borderRadius: 8, padding: '10px 20px', fontSize: 13,
                cursor: 'pointer', fontWeight: 600,
                boxShadow: '0 4px 12px rgba(30,64,175,0.4)',
            }}
            className="no-print"
        >
            🖨 Print
        </button>
    );
}
