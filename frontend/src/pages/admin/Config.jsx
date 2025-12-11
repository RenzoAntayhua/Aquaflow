import { useState } from 'react'

export default function Config() {
  const [activeSection, setActiveSection] = useState('general')

  const sections = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'seguridad', label: 'Seguridad', icon: '🔒' },
    { id: 'notificaciones', label: 'Notificaciones', icon: '🔔' },
    { id: 'integraciones', label: 'Integraciones', icon: '🔌' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-500 text-sm mt-1">Ajustes del sistema y preferencias</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl border shadow-sm p-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{section.icon}</span>
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          {activeSection === 'general' && <GeneralSettings />}
          {activeSection === 'seguridad' && <SecuritySettings />}
          {activeSection === 'notificaciones' && <NotificationSettings />}
          {activeSection === 'integraciones' && <IntegrationsSettings />}
        </div>
      </div>
    </div>
  )
}

function GeneralSettings() {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-slate-800">Configuración General</h2>
        <p className="text-sm text-slate-500">Ajustes básicos del sistema</p>
      </div>
      <div className="p-6 space-y-6">
        <SettingRow
          title="Nombre del Sistema"
          description="El nombre que aparece en el título y encabezados"
        >
          <input 
            className="h-10 w-64 px-3 rounded-lg border text-sm" 
            defaultValue="AquaFlow"
          />
        </SettingRow>

        <SettingRow
          title="Zona Horaria"
          description="Zona horaria para todas las fechas del sistema"
        >
          <select className="h-10 w-64 px-3 rounded-lg border text-sm">
            <option>America/Lima (UTC-5)</option>
            <option>America/Bogota (UTC-5)</option>
            <option>America/Mexico_City (UTC-6)</option>
          </select>
        </SettingRow>

        <SettingRow
          title="Idioma"
          description="Idioma predeterminado del sistema"
        >
          <select className="h-10 w-64 px-3 rounded-lg border text-sm">
            <option>Español (Perú)</option>
            <option>Español (España)</option>
            <option>English</option>
          </select>
        </SettingRow>

        <SettingRow
          title="Modo Mantenimiento"
          description="Desactiva el acceso temporal al sistema"
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </SettingRow>

        <div className="pt-4 border-t flex justify-end">
          <button className="h-10 px-6 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  )
}

function SecuritySettings() {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-slate-800">Seguridad</h2>
        <p className="text-sm text-slate-500">Configuración de autenticación y accesos</p>
      </div>
      <div className="p-6 space-y-6">
        <SettingRow
          title="Tiempo de Sesión"
          description="Minutos antes de cerrar sesión por inactividad"
        >
          <input 
            className="h-10 w-32 px-3 rounded-lg border text-sm" 
            type="number"
            defaultValue="60"
          />
        </SettingRow>

        <SettingRow
          title="Intentos de Login"
          description="Máximo de intentos antes de bloquear cuenta"
        >
          <input 
            className="h-10 w-32 px-3 rounded-lg border text-sm" 
            type="number"
            defaultValue="5"
          />
        </SettingRow>

        <SettingRow
          title="Requerir Cambio de Contraseña"
          description="Los usuarios deben cambiar su contraseña al primer inicio"
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </SettingRow>

        <SettingRow
          title="Auditoría de Acciones"
          description="Registrar todas las acciones administrativas"
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </SettingRow>

        <div className="pt-4 border-t flex justify-end">
          <button className="h-10 px-6 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-slate-800">Notificaciones</h2>
        <p className="text-sm text-slate-500">Configuración de correos y alertas</p>
      </div>
      <div className="p-6 space-y-6">
        <SettingRow
          title="Servidor SMTP"
          description="Host del servidor de correo"
        >
          <input 
            className="h-10 w-64 px-3 rounded-lg border text-sm" 
            defaultValue="smtp.gmail.com"
          />
        </SettingRow>

        <SettingRow
          title="Puerto SMTP"
          description="Puerto del servidor de correo"
        >
          <input 
            className="h-10 w-32 px-3 rounded-lg border text-sm" 
            type="number"
            defaultValue="587"
          />
        </SettingRow>

        <SettingRow
          title="Email Remitente"
          description="Dirección que aparece como remitente"
        >
          <input 
            className="h-10 w-64 px-3 rounded-lg border text-sm" 
            type="email"
            placeholder="noreply@aquaflow.com"
          />
        </SettingRow>

        <SettingRow
          title="Notificar Nuevos Usuarios"
          description="Enviar email cuando se registra un usuario"
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </SettingRow>

        <div className="pt-4 border-t flex justify-end gap-3">
          <button className="h-10 px-6 rounded-lg border text-slate-600 font-medium hover:bg-slate-50 transition-colors">
            Enviar Email de Prueba
          </button>
          <button className="h-10 px-6 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  )
}

function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-slate-800">Integraciones</h2>
          <p className="text-sm text-slate-500">Conexiones con servicios externos</p>
        </div>
        <div className="p-6 space-y-4">
          <IntegrationCard
            name="IoT Gateway"
            description="Conexión con sensores de consumo de agua"
            status="conectado"
            icon="📡"
          />
          <IntegrationCard
            name="Azure App Service"
            description="Hosting del backend API"
            status="conectado"
            icon="☁️"
          />
          <IntegrationCard
            name="PostgreSQL"
            description="Base de datos principal"
            status="conectado"
            icon="🗄️"
          />
          <IntegrationCard
            name="SendGrid"
            description="Servicio de envío de emails"
            status="desconectado"
            icon="📧"
          />
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔧</span>
          <div>
            <h3 className="font-medium text-amber-800">Configuración avanzada</h3>
            <p className="text-sm text-amber-700 mt-1">
              Para configurar nuevas integraciones o modificar credenciales de conexión, 
              contacta al equipo de desarrollo técnico.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingRow({ title, description, children }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="font-medium text-slate-700">{title}</div>
        <div className="text-sm text-slate-500">{description}</div>
      </div>
      {children}
    </div>
  )
}

function IntegrationCard({ name, description, status, icon }) {
  const isConnected = status === 'conectado'
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl">
          {icon}
        </div>
        <div>
          <div className="font-medium text-slate-700">{name}</div>
          <div className="text-sm text-slate-500">{description}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {isConnected ? '● Conectado' : '○ Desconectado'}
        </span>
        <button className="h-8 px-3 rounded-lg border text-sm text-slate-600 hover:bg-slate-100">
          Configurar
        </button>
      </div>
    </div>
  )
}
