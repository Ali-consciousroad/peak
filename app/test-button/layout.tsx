export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {children}
    </div>
  );
} 