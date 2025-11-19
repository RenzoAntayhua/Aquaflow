import { useToast } from '../context/ToastContext'

export default function ToastContainer() {
  const { toasts } = useToast() || { toasts: [] }
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`px-3 py-2 rounded-md shadow text-sm ${t.type==='error' ? 'bg-red-600 text-white' : t.type==='success' ? 'bg-green-600 text-white' : 'bg-slate-800 text-white'}`}>{t.message}</div>
      ))}
    </div>
  )
}