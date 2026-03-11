import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { LayoutDashboard, FileText, Settings, BarChart3 } from "lucide-react";

const adminNav = [
  { label: "대시보드", href: "/admin", icon: LayoutDashboard },
  { label: "글 관리", href: "/admin/posts", icon: FileText },
  { label: "통계", href: "/admin/analytics", icon: BarChart3 },
  { label: "설정", href: "/admin/settings", icon: Settings },
];

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;

  if (!session || !user?.isAdmin) {
    redirect("/admin/login");
  }

  return (
    <div className="mx-auto flex max-w-container gap-8 px-8 py-8">
      <aside className="hidden w-[200px] flex-shrink-0 md:block">
        <nav className="sticky top-[80px] space-y-1">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-card-desc font-medium text-text-secondary transition-all duration-base hover:bg-bg-secondary hover:text-text-primary"
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
};

export default AdminLayout;
