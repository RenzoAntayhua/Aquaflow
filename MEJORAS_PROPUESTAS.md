# 🚀 AQUAFLOW - Propuestas de Mejoras

Este documento contiene un análisis completo del sistema y propuestas de mejoras organizadas por prioridad y categoría.

---

## 📊 Resumen Ejecutivo

| Categoría | Críticas | Altas | Medias | Bajas |
|-----------|----------|-------|--------|-------|
| Backend | 3 | 5 | 4 | 2 |
| Frontend | 2 | 6 | 8 | 4 |
| Seguridad | 4 | 3 | 2 | 1 |
| UX/UI | 1 | 4 | 5 | 3 |
| Base de Datos | 1 | 2 | 3 | 2 |

---

## 🔴 CRÍTICAS (Implementar de inmediato)

### 1. Seguridad - Rate Limiting en Login
**Problema:** No hay protección contra ataques de fuerza bruta en el endpoint de login.
**Solución:** Implementar rate limiting similar al de AdminController.

```csharp
// En AuthController.cs
private static readonly Dictionary<string, List<DateTime>> _loginAttempts = new();
private static bool IsLoginLimited(string ip, string email)
{
    // Máximo 5 intentos por minuto por IP, 20 por hora por email
}
```

### 2. Seguridad - Token de Recuperación Expuesto
**Problema:** En `POST /auth/password/reset/solicitar`, el token se devuelve en la respuesta.
**Ubicación:** `AuthController.cs` línea 113
**Solución:** Solo enviar el token por email, nunca en la respuesta HTTP.

```csharp
// Cambiar de:
return Ok(new { mensaje = "Token generado", token });
// A:
return Ok(new { mensaje = "Si el email existe, recibirás instrucciones" });
```

### 3. Frontend - Página de Recuperación de Contraseña Faltante
**Problema:** El login tiene link a `/password-reset` pero la ruta no existe.
**Solución:** Crear `PasswordReset.jsx` y agregar la ruta en `App.jsx`.

### 4. Backend - Falta Endpoint para Obtener AulaId del Profesor
**Problema:** Al hacer login como profesor, no se sabe qué aulaId tiene asignado.
**Solución:** Agregar `aulaId` al response del login o crear endpoint `/api/profesor/mi-aula`.

---

## 🟠 ALTAS (Implementar esta semana)

### 5. Páginas de Estudiante Incompletas
**Problema:** Varias páginas tienen contenido estático o placeholder.

| Página | Estado | Acción |
|--------|--------|--------|
| `Trivias.jsx` | Solo texto informativo | Integrar con sistema de juegos |
| `Progreso.jsx` | Texto estático | Conectar con API de perfil |
| `Insignias.jsx` | Lista hardcoded | Usar API de insignias |
| `Recibos.jsx` | "Próximamente" | Definir funcionalidad o eliminar |
| `Retos.jsx` | Básico | Mejorar UX, agregar interacción |

### 6. RoleNavbar - Rutas de Admin Incorrectas
**Problema:** Las rutas en el navbar de admin no coinciden con las definidas.
**Ubicación:** `RoleNavbar.jsx` líneas 93-98

```javascript
// Rutas actuales (incorrectas):
{ label: 'Plantillas globales', to: '/admin/plantillas' },  // No existe
{ label: 'Sensores y espacios', to: '/admin/sensores' },    // No existe
{ label: 'Catálogo y políticas', to: '/admin/catalogo' },   // No existe

// Deberían ser:
{ label: 'Usuarios', to: '/admin/usuarios' },
{ label: 'Reportes', to: '/admin/reportes' },
{ label: 'Auditoría', to: '/admin/auditoria' },
{ label: 'Configuración', to: '/admin/config' },
```

### 7. HealthController Mejorado
**Problema:** El health check actual no verifica la conexión a la base de datos.
**Solución:**

```csharp
[HttpGet]
public async Task<IActionResult> Get([FromServices] AquaFlowDbContext db)
{
    try
    {
        await db.Database.CanConnectAsync();
        return Ok(new { 
            estado = "ok", 
            ts = DateTime.UtcNow,
            db = "connected",
            version = "1.0.0"
        });
    }
    catch
    {
        return StatusCode(503, new { estado = "degraded", db = "disconnected" });
    }
}
```

### 8. Validación de Contraseñas Seguras
**Problema:** No hay validación de fortaleza de contraseña en backend.
**Solución:** Agregar validación en registro y cambio de contraseña.

```csharp
private static bool ValidarPassword(string password, out string error)
{
    error = "";
    if (password.Length < 8) { error = "Mínimo 8 caracteres"; return false; }
    if (!password.Any(char.IsUpper)) { error = "Debe tener al menos una mayúscula"; return false; }
    if (!password.Any(char.IsDigit)) { error = "Debe tener al menos un número"; return false; }
    return true;
}
```

### 9. Login No Responsivo
**Problema:** En móviles, la página de login muestra dos columnas que se rompen.
**Solución:** Usar clases responsive de Tailwind.

```jsx
// Cambiar:
<div className="flex w-1/2 bg-gradient-to-br...">
// Por:
<div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br...">

// Y cambiar:
<div className="w-1/2 flex items-center justify-center bg-background">
// Por:
<div className="w-full lg:w-1/2 flex items-center justify-center bg-background">
```

### 10. Manejo de Errores Global
**Problema:** No hay un ErrorBoundary para capturar errores de React.
**Solución:** Crear componente ErrorBoundary.

```jsx
// components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorPage error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

---

## 🟡 MEDIAS (Implementar este mes)

### 11. Unificar Rutas de Estudiante
**Problema:** Hay páginas duplicadas o no usadas (`Unirme.jsx` no está en rutas).
**Solución:** Limpiar páginas no usadas y unificar la navegación.

### 12. Sistema de Notificaciones Push
**Problema:** No hay notificaciones en tiempo real.
**Solución:** Implementar SignalR para notificaciones.

```csharp
// Backend
services.AddSignalR();
app.MapHub<NotificacionHub>("/hubs/notificaciones");

// Frontend
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/hubs/notificaciones")
    .build();
```

### 13. Auditoría Completa
**Problema:** Solo se auditan acciones de admin, no de otros roles.
**Solución:** Crear middleware de auditoría.

```csharp
public class AuditMiddleware
{
    public async Task InvokeAsync(HttpContext context, AquaFlowDbContext db)
    {
        // Log todas las acciones de escritura (POST, PUT, DELETE)
    }
}
```

### 14. Soft Delete
**Problema:** Los registros se eliminan permanentemente.
**Solución:** Agregar campo `DeletedAt` y filtrar en consultas.

```csharp
public class BaseEntity
{
    public DateTime? DeletedAt { get; set; }
}

// En DbContext
modelBuilder.Entity<Usuario>().HasQueryFilter(u => u.DeletedAt == null);
```

### 15. Paginación Consistente
**Problema:** Algunos endpoints no tienen paginación.
**Solución:** Crear helper de paginación.

```csharp
public class PagedResult<T>
{
    public List<T> Items { get; set; }
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(Total / (double)PageSize);
}
```

### 16. Tutorial para Nuevos Usuarios
**Problema:** No hay onboarding para nuevos estudiantes.
**Solución:** Crear flujo de bienvenida con tour guiado.

### 17. Loading States Mejorados
**Problema:** Muchas páginas no muestran estado de carga.
**Solución:** Crear componentes de skeleton loading.

```jsx
// components/SkeletonCard.jsx
export default function SkeletonCard() {
  return (
    <div className="animate-pulse bg-slate-200 rounded-xl h-32" />
  );
}
```

### 18. Optimizar Consultas N+1
**Problema:** Algunas consultas hacen múltiples llamadas a la base de datos.
**Solución:** Usar `Include()` para eager loading.

```csharp
// Ejemplo en AulasController
var aulas = await db.Aulas
    .Include(a => a.Inscripciones)
    .ThenInclude(i => i.Estudiante)
    .Where(a => a.ColegioId == colegioId)
    .ToListAsync();
```

---

## 🟢 BAJAS (Backlog)

### 19. Dark Mode
**Problema:** No hay soporte para tema oscuro.
**Solución:** Usar CSS variables y clase `dark`.

### 20. Internacionalización (i18n)
**Problema:** Todo el texto está hardcoded en español.
**Solución:** Usar react-i18next para traducciones.

### 21. PWA (Progressive Web App)
**Problema:** La app no funciona offline.
**Solución:** Agregar service worker y manifest.

### 22. Exportación de Reportes
**Problema:** No se pueden descargar reportes en PDF/Excel.
**Solución:** Integrar librería de generación de reportes.

### 23. Gráficos Interactivos
**Problema:** Los reportes solo muestran tablas.
**Solución:** Agregar charts con Chart.js o Recharts.

### 24. Tests Automatizados
**Problema:** No hay tests unitarios ni de integración.
**Solución:** Implementar xUnit para backend, Vitest para frontend.

---

## 📁 Archivos No Utilizados a Limpiar

```
frontend/src/pages/estudiante/
├── Trivias.jsx      → Integrar en Juegos.jsx o eliminar
├── Progreso.jsx     → Integrar en Perfil.jsx o eliminar
├── Insignias.jsx    → Ya está en Perfil.jsx, eliminar duplicado
├── Unirme.jsx       → No está en rutas, agregar o eliminar
└── Retos.jsx        → Mejorar o integrar en Juegos.jsx
```

---

## 🔧 Mejoras de Código Específicas

### AuthController.cs - Mejorar Login Response

```csharp
// Agregar aulaId al response del login
var aulaId = await db.Aulas
    .Where(a => a.ProfesorId == usuario.Id)
    .Select(a => a.Id)
    .FirstOrDefaultAsync();

return Ok(new { 
    token = jwt, 
    usuario = new { 
        usuario.Id, 
        usuario.Nombre, 
        usuario.Email, 
        rol = usuario.Rol.ToString().ToLowerInvariant(), 
        usuario.ColegioId,
        aulaId = usuario.Rol == RolUsuario.profesor ? aulaId : null,
        Estado = usuario.Estado, 
        requiereCambioPassword = string.Equals(usuario.Estado, "requiere_cambio", StringComparison.OrdinalIgnoreCase) 
    } 
});
```

### api.js - Agregar Retry Logic

```javascript
async function apiFetch(path, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(/*...*/);
      if (!res.ok && res.status >= 500 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      // ... resto del código
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

---

## 📈 Orden de Implementación Sugerido

### Sprint 1 (Esta semana)
1. ✅ Rate limiting en login
2. ✅ Corregir token de recuperación
3. ✅ Crear página PasswordReset
4. ✅ Agregar aulaId al login del profesor
5. ✅ Corregir rutas de admin en navbar

### Sprint 2 (Próxima semana)
1. Completar páginas de estudiante
2. Hacer login responsivo
3. Mejorar HealthController
4. Validación de contraseñas

### Sprint 3 (Semana 3)
1. ErrorBoundary
2. Loading states
3. Limpiar archivos no usados
4. Optimizar consultas N+1

### Sprint 4+ (Backlog)
- Notificaciones push
- Dark mode
- PWA
- Tests automatizados
- Reportes PDF/Excel

---

## 💡 Notas Adicionales

1. **Consistencia de Nomenclatura**: Algunos campos usan PascalCase (`ColegioId`) y otros camelCase (`colegioId`). Unificar a camelCase en el frontend.

2. **Documentación API**: Considerar agregar Swagger/OpenAPI con descripciones detalladas.

3. **Logging**: Implementar logging estructurado con Serilog para mejor debugging.

4. **Métricas**: Agregar métricas de performance con Application Insights o similar.

---

*Documento generado automáticamente - Última actualización: Noviembre 2025*

