export const dynamic = "force-dynamic";
export const revalidate = 0;

import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />

      <main className="min-h-screen lg:ml-64">
        {children}
      </main>
    </div>
  );
}