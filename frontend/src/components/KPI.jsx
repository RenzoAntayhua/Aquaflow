export default function KPI({ title, value, suffix }) {
  return (
    <div className="bg-card rounded-xl border p-5 shadow">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-semibold">{value}{suffix ? ` ${suffix}` : ''}</div>
    </div>
  )
}