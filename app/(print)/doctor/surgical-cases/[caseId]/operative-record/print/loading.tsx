export default function OperativeNotePrintLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7f4ef',
        fontFamily: 'system-ui, sans-serif',
        color: '#2c2e4b',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid #e7d6bf',
            borderTopColor: '#2c2e4b',
            borderRadius: '50%',
            margin: '0 auto 12px',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <p style={{ fontSize: 13, fontWeight: 600 }}>Preparing operative note…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
