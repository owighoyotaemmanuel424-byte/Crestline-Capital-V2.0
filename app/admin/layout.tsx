import BankingShell from "@/components/BankingShell";
export default function AdminLayout({ children }: { children: React.ReactNode }) { return <BankingShell admin>{children}</BankingShell>; }
