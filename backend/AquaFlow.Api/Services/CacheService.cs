using Microsoft.Extensions.Caching.Memory;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AquaFlow.Api.Services
{
    public interface ICacheService
    {
        Task<List<Departamento>> GetDepartamentosAsync(AquaFlowDbContext db);
        Task<List<Provincia>> GetProvinciasAsync(AquaFlowDbContext db, int departamentoId);
        Task<List<Distrito>> GetDistritosAsync(AquaFlowDbContext db, int provinciaId);
        Task<List<PlantillaReto>> GetPlantillasRetosAsync(AquaFlowDbContext db);
        Task<object?> GetAdminStatsAsync(AquaFlowDbContext db);
        void InvalidateUbigeo();
        void InvalidatePlantillas();
        void InvalidateAdminStats();
    }

    public class CacheService : ICacheService
    {
        private readonly IMemoryCache _cache;
        private static readonly TimeSpan UbigeoCacheDuration = TimeSpan.FromHours(24);
        private static readonly TimeSpan PlantillasCacheDuration = TimeSpan.FromMinutes(30);
        private static readonly TimeSpan StatsCacheDuration = TimeSpan.FromMinutes(5);

        public CacheService(IMemoryCache cache)
        {
            _cache = cache;
        }

        public async Task<List<Departamento>> GetDepartamentosAsync(AquaFlowDbContext db)
        {
            return await _cache.GetOrCreateAsync("ubigeo:departamentos", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = UbigeoCacheDuration;
                return await db.Departamentos
                    .Where(d => d.Estado == "activo")
                    .OrderBy(d => d.Nombre)
                    .ToListAsync();
            }) ?? new List<Departamento>();
        }

        public async Task<List<Provincia>> GetProvinciasAsync(AquaFlowDbContext db, int departamentoId)
        {
            var key = $"ubigeo:provincias:{departamentoId}";
            return await _cache.GetOrCreateAsync(key, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = UbigeoCacheDuration;
                return await db.Provincias
                    .Where(p => p.DepartamentoId == departamentoId && p.Estado == "activo")
                    .OrderBy(p => p.Nombre)
                    .ToListAsync();
            }) ?? new List<Provincia>();
        }

        public async Task<List<Distrito>> GetDistritosAsync(AquaFlowDbContext db, int provinciaId)
        {
            var key = $"ubigeo:distritos:{provinciaId}";
            return await _cache.GetOrCreateAsync(key, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = UbigeoCacheDuration;
                return await db.Distritos
                    .Where(d => d.ProvinciaId == provinciaId && d.Estado == "activo")
                    .OrderBy(d => d.Nombre)
                    .ToListAsync();
            }) ?? new List<Distrito>();
        }

        public async Task<List<PlantillaReto>> GetPlantillasRetosAsync(AquaFlowDbContext db)
        {
            return await _cache.GetOrCreateAsync("plantillas:activas", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = PlantillasCacheDuration;
                return await db.PlantillasRetos
                    .Where(p => p.Activa)
                    .OrderBy(p => p.Nombre)
                    .ToListAsync();
            }) ?? new List<PlantillaReto>();
        }

        public async Task<object?> GetAdminStatsAsync(AquaFlowDbContext db)
        {
            return await _cache.GetOrCreateAsync("admin:stats", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = StatsCacheDuration;
                
                // Ejecutar consultas en paralelo para mejor rendimiento
                var colegiosTask = db.Colegios.CountAsync();
                var aulasTask = db.Aulas.CountAsync();
                var usuariosTask = db.Usuarios.CountAsync();
                var espaciosTask = db.Espacios.CountAsync();
                var estudiantesTask = db.Usuarios.CountAsync(u => u.Rol == RolUsuario.estudiante);
                var profesoresTask = db.Usuarios.CountAsync(u => u.Rol == RolUsuario.profesor);
                var directoresTask = db.Usuarios.CountAsync(u => u.Rol == RolUsuario.director);
                var adminsTask = db.Usuarios.CountAsync(u => u.Rol == RolUsuario.admin);
                var dispositivosTask = db.Dispositivos.CountAsync();
                var insigniasTask = db.Insignias.CountAsync();
                var plantillasTask = db.PlantillasRetos.CountAsync();
                var preguntasTask = db.Preguntas.CountAsync();
                var departamentosTask = db.Departamentos.CountAsync();
                var provinciasTask = db.Provincias.CountAsync();
                var distritosTask = db.Distritos.CountAsync();

                await Task.WhenAll(
                    colegiosTask, aulasTask, usuariosTask, espaciosTask,
                    estudiantesTask, profesoresTask, directoresTask, adminsTask,
                    dispositivosTask, insigniasTask, plantillasTask, preguntasTask,
                    departamentosTask, provinciasTask, distritosTask
                );

                return new
                {
                    colegios = await colegiosTask,
                    aulas = await aulasTask,
                    usuarios = await usuariosTask,
                    espacios = await espaciosTask,
                    estudiantes = await estudiantesTask,
                    profesores = await profesoresTask,
                    directores = await directoresTask,
                    admins = await adminsTask,
                    dispositivos = await dispositivosTask,
                    insignias = await insigniasTask,
                    plantillasRetos = await plantillasTask,
                    preguntas = await preguntasTask,
                    ubigeo = new
                    {
                        departamentos = await departamentosTask,
                        provincias = await provinciasTask,
                        distritos = await distritosTask
                    }
                };
            });
        }

        public void InvalidateUbigeo()
        {
            _cache.Remove("ubigeo:departamentos");
            // Las provincias y distritos se invalidan individualmente si es necesario
        }

        public void InvalidatePlantillas()
        {
            _cache.Remove("plantillas:activas");
        }

        public void InvalidateAdminStats()
        {
            _cache.Remove("admin:stats");
        }
    }
}

