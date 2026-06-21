import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { LayoutDashboard, FileText, Settings, BarChart3, Activity } from "lucide-react";

const adminNav = [
  { label: "대시보드", href: "/admin", icon: LayoutDashboard },
  { label: "글 관리", href: "/admin/posts", icon: FileText },
  { label: "발행 모니터", href: "/admin/signal-monitor", icon: Activity },
  { label: "통계", href: "/admin/analytics", icon: BarChart3 },
  { label: "설정", href: "/admin/settings", icon: Settings },
];

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;

  if (!session || !user?.isAdmin) {
    redirect("/admin-login");
  }

  return (
    <div className="mx-auto max-w-container px-4 py-6 md:px-8 md:py-8">
      {/* 모바일: 상단 가로 탭 */}
      <nav className="mb-6 flex gap-1 overflow-x-auto md:hidden">
        {adminNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-meta font-medium text-text-secondary transition-all hover:bg-bg-secondary hover:text-text-primary"
          >
            <item.icon size={14} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex gap-8">
        {/* 데스크톱: 사이드바 */}
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
    </div>
  );
};

export default AdminLayout;
