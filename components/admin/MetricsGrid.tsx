import DashboardCard from './DashboardCard';

function Icon({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true" className="text-lg">{children}</span>;
}

type Metrics = {
  totalDeposits: number;
  pendingDeposits: number;
  totalTransfers: number;
  pendingTransfers: number;
};

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MetricsGrid({ metrics }: { metrics: Metrics }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardCard label="Total deposits" value={money(metrics.totalDeposits)} icon={<Icon>↓</Icon>} helper="Successful customer credits" />
      <DashboardCard label="Pending deposits" value={money(metrics.pendingDeposits)} icon={<Icon>◷</Icon>} helper="Awaiting review" />
      <DashboardCard label="Total transfers" value={money(metrics.totalTransfers)} icon={<Icon>↔</Icon>} helper="Successful transfer volume" />
      <DashboardCard label="Pending transfers" value={money(metrics.pendingTransfers)} icon={<Icon>!</Icon>} helper="Needs attention" />
    </section>
  );
}
