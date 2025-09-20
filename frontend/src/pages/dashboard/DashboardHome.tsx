export default function DashboardHome() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-neutral-600">Ultra-minimal shell. We’ll add My Files, Shared with Me, and Upload next.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">Card</div>
        <div className="rounded-lg border p-4">Card</div>
        <div className="rounded-lg border p-4">Card</div>
      </div>
    </div>
  );
}
