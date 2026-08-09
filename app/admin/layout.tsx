import "./admin-theme.css";
import BankingShell from "@/components/BankingShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <BankingShell admin>
      <span id="crestline-admin-marker" hidden aria-hidden="true" />
      <label className="admin-locale" aria-label="Language selector">
        <span aria-hidden="true">🇺🇸</span>
        <select defaultValue="EN" aria-label="Language">
          <option>EN</option>
        </select>
      </label>
      {children}
    </BankingShell>
  );
}
