import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const categories = await prisma.serviceCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { services: { where: { enabled: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true, icon: true, lastStatus: true } } } });
  const serviceCrumbs = categories.flatMap((category) => category.services.map((service) => ({ name: service.name, slug: service.slug, category: category.name })));
  return <div className="min-h-screen"><Sidebar categories={categories} email={session.user.email} /><div className="lg:pl-60"><TopBar services={serviceCrumbs} />{children}</div></div>;
}
