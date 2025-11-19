import { createContext, useContext, useState, useCallback } from 'react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [resolver, setResolver] = useState(null)

  const confirm = useCallback((msg) => {
    setMessage(String(msg || '¿Confirmar acción?'))
    setOpen(true)
    return new Promise(resolve => setResolver(() => resolve))
  }, [])

  function onCancel() {
    setOpen(false)
    if (resolver) resolver(false)
    setResolver(null)
  }
  function onOk() {
    setOpen(false)
    if (resolver) resolver(true)
    setResolver(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border rounded-md shadow w-[92vw] max-w-sm">
            <div className="px-4 py-3 text-sm text-slate-800">{message}</div>
            <div className="px-4 py-3 flex justify-end gap-2">
              <button className="h-9 px-4 rounded-md border" onClick={onCancel}>Cancelar</button>
              <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground" onClick={onOk}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmContext)
}