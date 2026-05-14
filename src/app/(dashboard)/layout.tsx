export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1>This is dashboard layout</h1>
      <main>{children}</main>
    </div>
  );
}
