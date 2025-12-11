import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { solicitarResetPassword, confirmarResetPassword } from '../lib/api'

export default function PasswordReset() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: solicitar, 2: confirmar
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSolicitar(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await solicitarResetPassword({ email })
      setSuccess('Si el email existe, recibirás instrucciones para recuperar tu contraseña.')
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmar(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setLoading(false)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }
    
    try {
      await confirmarResetPassword({ token, newPassword })
      setSuccess('¡Contraseña actualizada! Redirigiendo al login...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="bg-white text-slate-800 flex flex-col gap-6 rounded-2xl border border-blue-100 w-full max-w-md p-8 shadow-xl mx-4">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-2xl font-bold text-blue-700">
            {step === 1 ? 'Recuperar contraseña' : 'Nueva contraseña'}
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            {step === 1 
              ? 'Ingresa tu email para recibir instrucciones' 
              : 'Ingresa el código que recibiste y tu nueva contraseña'}
          </p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            1
          </div>
          <div className={`w-12 h-1 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            2
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Step 1: Solicitar */}
        {step === 1 && (
          <form onSubmit={handleSolicitar} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="tucorreo@colegio.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar instrucciones'}
            </button>
          </form>
        )}

        {/* Step 2: Confirmar */}
        {step === 2 && (
          <form onSubmit={handleConfirmar} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="token">
                Código de recuperación
              </label>
              <input
                id="token"
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-mono tracking-wider focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="Ingresa el código recibido"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="newPassword">
                Nueva contraseña
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="confirmPassword">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="Repite tu contraseña"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full h-10 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Volver a solicitar código
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="text-center pt-2 border-t">
          <a href="/login" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Volver al login
          </a>
        </div>
      </div>
    </div>
  )
}

