

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col min-h-screen">
      <div className="">
        <div className="flex flex-col flex-1">
          {children}
        </div>
      </div>
    </main>
  );
}
