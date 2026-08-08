import DashboardResponsive from "@/components/DashboardResponsive";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardResponsive>{children}</DashboardResponsive>;
}
