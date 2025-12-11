using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Cryptography;
using Microsoft.OpenApi.Models;
using System.Data.Common;
using Microsoft.AspNetCore.ResponseCompression;
using System.IO.Compression;
using AquaFlow.Api.Services;

var envPath = Path.Combine(AppContext.BaseDirectory, ".env");
if (File.Exists(envPath))
{
    Env.Load(envPath);
}
else
{
    Env.TraversePath().Load();
}

var builder = WebApplication.CreateBuilder(args);

// Configuración de CORS basándose en variables de entorno
var corsAllowAll = string.Equals(Environment.GetEnvironmentVariable("CORS_ALLOW_ALL"), "true", StringComparison.OrdinalIgnoreCase);
var corsOriginsRaw = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGIN") ?? "http://localhost:5173,https://aquaflow-chi.vercel.app";
var corsOrigins = corsOriginsRaw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendCors", policy =>
    {
        if (corsAllowAll)
        {
            policy.SetIsOriginAllowed(_ => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(corsOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

// Base de datos PostgreSQL con optimizaciones
var pgConn = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING")
             ?? "Host=localhost;Port=5432;Database=appdb;Username=admin;Password=admin123";

builder.Services.AddDbContext<AquaFlowDbContext>(opts =>
{
    opts.UseNpgsql(pgConn, npgsqlOpts =>
    {
        npgsqlOpts.CommandTimeout(30);
        npgsqlOpts.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null);
    });
    // Deshabilitar tracking por defecto para mejor rendimiento en lecturas
    opts.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
});

// Memory Cache para datos que no cambian frecuentemente
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ICacheService, CacheService>();

// InfluxDB Service para datos de sensores IoT
builder.Services.AddSingleton<IInfluxDbService, InfluxDbService>();

// Response Compression para reducir tamaño de respuestas
builder.Services.AddResponseCompression(opts =>
{
    opts.EnableForHttps = true;
    opts.Providers.Add<BrotliCompressionProvider>();
    opts.Providers.Add<GzipCompressionProvider>();
    opts.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[] { "application/json" });
});
builder.Services.Configure<BrotliCompressionProviderOptions>(opts => opts.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(opts => opts.Level = CompressionLevel.Fastest);

// Response Caching para endpoints con [ResponseCache]
builder.Services.AddResponseCaching();


// JWT Auth
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "dev-secret-please-change";
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "aquaflow";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "aquaflow-frontend";

// Asegurar tamaño de clave >= 256 bits para HS256
byte[] keyBytes = Encoding.UTF8.GetBytes(jwtSecret);

if (keyBytes.Length < 32)
{
    using var sha = SHA256.Create();
    keyBytes = sha.ComputeHash(keyBytes); // deriva a 256 bits
}

var key = new SymmetricSecurityKey(keyBytes);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = key
    };
});

builder.Services.AddAuthorization();

builder.Services.AddControllers().AddJsonOptions(opts =>
{
    opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    opts.JsonSerializerOptions.DictionaryKeyPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "AquaFlow API", Version = "v1" });
});

var app = builder.Build();

// Swagger solo en entorno de desarrollo
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "AquaFlow API v1");
        c.RoutePrefix = "swagger"; // disponible en /swagger
    });
}

app.UseCors("FrontendCors");
app.UseResponseCompression();
app.UseResponseCaching();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();


/*
// Seed UBIGEO desde CSV si está habilitado por variable de entorno
async Task SeedUbigeoIfEnabledAsync(WebApplication app)
{
    var flag = Environment.GetEnvironmentVariable("SEED_UBIGEO");
    if (!string.Equals(flag, "true", StringComparison.OrdinalIgnoreCase)) return;

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AquaFlowDbContext>();

    var deptUrl = Environment.GetEnvironmentVariable("SEED_UBIGEO_DEPARTAMENTOS_URL");
    var provUrl = Environment.GetEnvironmentVariable("SEED_UBIGEO_PROVINCIAS_URL");
    var distUrl = Environment.GetEnvironmentVariable("SEED_UBIGEO_DISTRITOS_URL");

    var basePath = Path.Combine(app.Environment.ContentRootPath, "Data", "Ubigeo");
    var deptFile = Path.Combine(basePath, "departamentos.csv");
    var provFile = Path.Combine(basePath, "provincias.csv");
    var distFile = Path.Combine(basePath, "distritos.csv");

    async Task<string[]?> GetLinesAsync(string? url, string fallbackFile)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(url))
            {
                using var http = new HttpClient();
                http.Timeout = TimeSpan.FromSeconds(30);
                var text = await http.GetStringAsync(url);
                return text.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SEED UBIGEO] Error al descargar {url}: {ex.Message}. Usando archivo local.");
        }
        if (!File.Exists(fallbackFile)) return null;
        return await File.ReadAllLinesAsync(fallbackFile);
    }

    var deptLines = await GetLinesAsync(deptUrl, deptFile);
    var provLines = await GetLinesAsync(provUrl, provFile);
    var distLines = await GetLinesAsync(distUrl, distFile);

    if (deptLines == null || provLines == null || distLines == null)
    {
        Console.WriteLine("[SEED UBIGEO] No hay fuentes de datos disponibles para seed.");
        return;
    }

    // Departamentos
    int addedDep = 0;
    foreach (var raw in deptLines)
    {
        var line = raw.Trim();
        if (string.IsNullOrWhiteSpace(line)) continue;
        var delimiter = line.Contains(';') ? ';' : ',';
        var parts = line.Split(delimiter);
        if (parts.Length < 2) continue;
        string code;
        string name;
        if (parts[0].Trim().Equals("codigo_ubigeo_2", StringComparison.OrdinalIgnoreCase) || parts[0].Trim().Equals("inei", StringComparison.OrdinalIgnoreCase))
            continue; // cabecera
        if (parts.Length >= 2 && parts[0].Trim().Length == 2 && !char.IsLetter(parts[0].Trim()[0]))
        {
            code = parts[0].Trim();
            name = parts[1].Trim();
        }
        else
        {
            // Formato alternativo con cabeceras (inei, departamento,...)
            // Tomar solo los 2 primeros dígitos del código INEI (ej: 010000 -> 01)
            var ineiCode = parts[0].Trim();
            code = ineiCode.Length >= 2 ? ineiCode.Substring(0, 2) : ineiCode;
            name = parts.Length > 2 ? parts[2].Trim() : parts[1].Trim();
        }
        name = name.ToUpperInvariant().Trim();
        if (name.Length > 80) name = name.Substring(0, 80);
        if (await db.Departamentos.AnyAsync(d => d.CodigoUbigeo == code)) continue;
        db.Departamentos.Add(new Departamento { CodigoUbigeo = code, Nombre = name, Estado = "activo" });
        addedDep++;
    }
    await db.SaveChangesAsync();

    // Provincias
    int addedProv = 0;
    foreach (var raw in provLines)
    {
        var line = raw.Trim();
        if (string.IsNullOrWhiteSpace(line)) continue;
        var delimiter = line.Contains(';') ? ';' : ',';
        var parts = line.Split(delimiter);
        if (parts[0].Trim().StartsWith("codigo_ubigeo_4") || parts[0].Trim().Equals("inei", StringComparison.OrdinalIgnoreCase)) continue; // cabecera
        string code4; string name; string dep2;
        if (parts.Length >= 3 && parts[0].Trim().Length == 4 && !char.IsLetter(parts[0].Trim()[0]))
        {
            code4 = parts[0].Trim();
            name = parts[1].Trim();
            dep2 = parts[2].Trim();
        }
        else
        {
            // Formato alternativo: (inei, reniec, departamento, provincia, ...)
            // Tomar 4 primeros dígitos del código INEI (ej: 150100 -> 1501)
            var ineiCode = parts[0].Trim();
            code4 = ineiCode.Length >= 4 ? ineiCode.Substring(0, 4) : ineiCode;
            name = parts.Length > 3 ? parts[3].Trim() : parts[1].Trim();
            dep2 = code4.Substring(0, 2);
        }
        name = name.ToUpperInvariant().Trim();
        if (name.Length > 80) name = name.Substring(0, 80);
        if (await db.Provincias.AnyAsync(p => p.CodigoUbigeo == code4)) continue;
        var dep = await db.Departamentos.FirstOrDefaultAsync(d => d.CodigoUbigeo == dep2);
        if (dep == null) continue;
        db.Provincias.Add(new Provincia { CodigoUbigeo = code4, Nombre = name, DepartamentoId = dep.Id, Estado = "activo" });
        addedProv++;
    }
    await db.SaveChangesAsync();

    // Distritos
    int addedDist = 0;
    foreach (var raw in distLines)
    {
        var line = raw.Trim();
        if (string.IsNullOrWhiteSpace(line)) continue;
        var delimiter = line.Contains(';') ? ';' : ',';
        var parts = line.Split(delimiter);
        if (parts[0].Trim().StartsWith("codigo_ubigeo_6") || parts[0].Trim().Equals("inei", StringComparison.OrdinalIgnoreCase)) continue; // cabecera
        if (parts.Length < 2) continue;
        string code6; string name; string prov4;
        if (parts.Length >= 5 && parts[0].Trim().Length == 6 && !char.IsLetter(parts[0].Trim()[0]))
        {
            // Formato JM Castagnetto: inei, reniec, departamento, provincia, distrito, ...
            code6 = parts[0].Trim();
            name = parts[4].Trim();
            prov4 = code6.Substring(0, 4);
        }
        else
        {
            // Formato alternativo: (inei, reniec, departamento, provincia, distrito, ...)
            code6 = parts[0].Trim();
            name = parts.Length > 4 ? parts[4].Trim() : parts[1].Trim();
            prov4 = code6.Length >= 4 ? code6.Substring(0, 4) : code6;
        }
        name = name.ToUpperInvariant().Trim();
        if (name.Length > 80) name = name.Substring(0, 80);
        if (await db.Distritos.AnyAsync(d => d.CodigoUbigeo == code6)) continue;
        var prov = await db.Provincias.FirstOrDefaultAsync(p => p.CodigoUbigeo == prov4);
        if (prov == null)
        {
            // Fallback: buscar por nombres (departamento/provincia) cuando el código no coincide
            var depNombre = parts.Length > 2 ? parts[2].Trim().ToUpperInvariant() : string.Empty;
            var provNombre = parts.Length > 3 ? parts[3].Trim().ToUpperInvariant() : string.Empty;
            if (depNombre.Length > 80) depNombre = depNombre.Substring(0, 80);
            if (provNombre.Length > 80) provNombre = provNombre.Substring(0, 80);
            var dep = await db.Departamentos.FirstOrDefaultAsync(d => d.Nombre == depNombre);
            if (dep != null)
            {
                prov = await db.Provincias.FirstOrDefaultAsync(p => p.DepartamentoId == dep.Id && p.Nombre == provNombre);
            }
            if (prov == null) continue;
        }
        db.Distritos.Add(new Distrito { CodigoUbigeo = code6, Nombre = name, ProvinciaId = prov.Id, Estado = "activo" });
        addedDist++;
    }
    await db.SaveChangesAsync();

    var deps = await db.Departamentos.CountAsync();
    var provs = await db.Provincias.CountAsync();
    var dists = await db.Distritos.CountAsync();
    Console.WriteLine($"[SEED UBIGEO] OK -> Departamentos: {deps} (+{addedDep}), Provincias: {provs} (+{addedProv}), Distritos: {dists} (+{addedDist})");
}

await SeedUbigeoIfEnabledAsync(app);

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AquaFlowDbContext>();
    var seedAppData = Environment.GetEnvironmentVariable("SEED_APP_DATA");
    if (string.Equals(seedAppData, "true", StringComparison.OrdinalIgnoreCase))
    {
        await DataSeeder.SeedAsync(db);
    }
}
*/
