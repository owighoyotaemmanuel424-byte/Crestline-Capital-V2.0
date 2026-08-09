import "./admin-theme.css";
import BankingShell from "@/components/BankingShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <BankingShell admin>
      <span id="crestline-admin-marker" hidden aria-hidden="true" />
      {children}
    </BankingShell>
  );
}
