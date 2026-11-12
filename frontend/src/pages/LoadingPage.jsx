export default function LoadingPage() {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 40px' }}>
      <div className="dcc-spinner" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E5E5EA', borderTopColor: '#0071E3', marginBottom: 24 }} />
      <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 500, color: '#1D1D1F', textAlign: 'center' }}>동의서를 분석하고 있어요</p>
      <p style={{ margin: 0, fontSize: 14, color: '#86868B', textAlign: 'center' }}>필수항목 · 표현 · 과도수집 · 동의절차를 확인하는 중</p>
    </div>
  );
}
