using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Cryptography;
using Microsoft.OpenApi.Models;

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
var corsOrigin = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGIN") ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendCors", policy =>
        policy.WithOrigins(corsOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// Base de datos PostgreSQL
var pgConn = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING")
             ?? "Host=localhost;Port=5432;Database=appdb;Username=admin;Password=admin123";

builder.Services.AddDbContext<AquaFlowDbContext>(opts =>
    opts.UseNpgsql(pgConn));

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
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/api/salud", () => new { estado = "ok", ts = DateTime.UtcNow });

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

// Endpoints mínimos de gestión escolar
app.MapGet("/api/colegios", async (AquaFlowDbContext db) =>
{
    var colegios = await db.Colegios.OrderBy(c => c.Nombre).ToListAsync();
    return Results.Ok(colegios);
});

// Ciudades disponibles según colegios registrados
app.MapGet("/api/ciudades", async (AquaFlowDbContext db) =>
{
    var ciudades = await db.Colegios
        .Where(c => c.Ciudad != null && c.Ciudad != "")
        .Select(c => c.Ciudad!)
        .Distinct()
        .OrderBy(c => c)
        .ToListAsync();
    return Results.Ok(ciudades);
});

// --- Catálogo UBIGEO ---
app.MapGet("/api/ubigeo/departamentos", async (AquaFlowDbContext db) =>
{
    var deps = await db.Departamentos
        .OrderBy(d => d.Nombre)
        .Select(d => new { id = d.Id, nombre = d.Nombre, codigo_ubigeo = d.CodigoUbigeo })
        .ToListAsync();
    return Results.Ok(deps);
});

app.MapGet("/api/ubigeo/provincias", async (AquaFlowDbContext db, int departamentoId) =>
{
    var provs = await db.Provincias
        .Where(p => p.DepartamentoId == departamentoId)
        .OrderBy(p => p.Nombre)
        .Select(p => new { id = p.Id, nombre = p.Nombre, codigo_ubigeo = p.CodigoUbigeo, departamento_id = p.DepartamentoId })
        .ToListAsync();
    return Results.Ok(provs);
});

app.MapGet("/api/ubigeo/distritos", async (AquaFlowDbContext db, int provinciaId) =>
{
    var dists = await db.Distritos
        .Where(d => d.ProvinciaId == provinciaId)
        .OrderBy(d => d.Nombre)
        .Select(d => new { id = d.Id, nombre = d.Nombre, codigo_ubigeo = d.CodigoUbigeo, provincia_id = d.ProvinciaId })
        .ToListAsync();
    return Results.Ok(dists);
});

app.MapPost("/api/colegios", async (AquaFlowDbContext db, Colegio nuevo) =>
{
    // Validaciones mínimas
    if (string.IsNullOrWhiteSpace(nuevo.Nombre))
        return Results.BadRequest(new { error = "El nombre del colegio es obligatorio" });
    // Nivel es enum; el DbContext aplica constraint y conversión a string.

    // Si viene distrito_id, validar que exista y opcionalmente rellenar Ciudad para compatibilidad
    if (nuevo.DistritoId.HasValue)
    {
        var distrito = await db.Distritos.FindAsync(nuevo.DistritoId.Value);
        if (distrito == null)
            return Results.BadRequest(new { error = "Distrito no encontrado", distrito_id = nuevo.DistritoId });

        if (string.IsNullOrWhiteSpace(nuevo.Ciudad))
            nuevo.Ciudad = distrito.Nombre; // compatibilidad temporal con /api/ciudades
    }

    db.Colegios.Add(nuevo);
    await db.SaveChangesAsync();
    return Results.Created($"/api/colegios/{nuevo.Id}", nuevo);
});

// Alta de colegio con director y envío de credenciales
app.MapPost("/api/colegios/alta-completa", async (AquaFlowDbContext db, AltaColegioConDirectorRequest req) =>
{
    if (string.IsNullOrWhiteSpace(req.nombre))
        return Results.BadRequest(new { error = "El nombre del colegio es obligatorio" });
    if (string.IsNullOrWhiteSpace(req.directorNombre) || string.IsNullOrWhiteSpace(req.directorEmail))
        return Results.BadRequest(new { error = "Datos del director incompletos" });
    // Validaciones adicionales: todos los campos obligatorios y formato de teléfono
    if (!req.distritoId.HasValue)
        return Results.BadRequest(new { error = "Debe seleccionar un distrito" });
    if (string.IsNullOrWhiteSpace(req.codigoLocal))
        return Results.BadRequest(new { error = "El código local es obligatorio" });
    if (string.IsNullOrWhiteSpace(req.nivel))
        return Results.BadRequest(new { error = "El nivel es obligatorio" });
    if (string.IsNullOrWhiteSpace(req.direccion))
        return Results.BadRequest(new { error = "La dirección es obligatoria" });
    if (string.IsNullOrWhiteSpace(req.direccionExacta))
        return Results.BadRequest(new { error = "La dirección exacta es obligatoria" });
    if (string.IsNullOrWhiteSpace(req.telefono))
        return Results.BadRequest(new { error = "El teléfono es obligatorio" });
    if (string.IsNullOrWhiteSpace(req.estado))
        return Results.BadRequest(new { error = "El estado es obligatorio" });
    if (string.IsNullOrWhiteSpace(req.emailContacto))
        return Results.BadRequest(new { error = "El email de contacto es obligatorio" });

    var existeDirector = await db.Usuarios.AnyAsync(u => u.Email == req.directorEmail);
    if (existeDirector) return Results.Conflict(new { mensaje = "El email del director ya está registrado." });

    string? ciudadFinal = req.ciudad;
    if (req.distritoId.HasValue)
    {
        var distrito = await db.Distritos.FindAsync(req.distritoId.Value);
        if (distrito is null)
            return Results.BadRequest(new { error = "Distrito no encontrado", distrito_id = req.distritoId });
        if (string.IsNullOrWhiteSpace(ciudadFinal)) ciudadFinal = distrito.Nombre;
    }

    // Validar teléfono (+ dígitos, espacios o guiones, 7-15 caracteres)
    var telefonoValido = System.Text.RegularExpressions.Regex.IsMatch(req.telefono!, @"^\+?[\d\s-]{7,15}$");
    if (!telefonoValido)
        return Results.BadRequest(new { error = "Formato de teléfono inválido" });

    var colegio = new Colegio
    {
        Nombre = req.nombre,
        Ciudad = ciudadFinal,
        EmailContacto = req.emailContacto,
        DistritoId = req.distritoId,
        CodigoLocal = req.codigoLocal,
        Direccion = req.direccion,
        DireccionExacta = req.direccionExacta,
        Telefono = req.telefono
    };

    // Mapear nivel y estado si vienen como texto
    // Nivel es obligatorio; si no se puede convertir, devolver error
    var nivelStr = req.nivel!.Replace('-', '_');
    if (Enum.TryParse<NivelEducativo>(nivelStr, true, out var nivelEnum))
    {
        colegio.Nivel = nivelEnum;
    }
    else
    {
        return Results.BadRequest(new { error = "Nivel inválido" });
    }
    if (!string.IsNullOrWhiteSpace(req.estado) && Enum.TryParse<EstadoColegio>(req.estado, true, out var estadoEnum))
    {
        colegio.Estado = estadoEnum;
    }

    db.Colegios.Add(colegio);
    await db.SaveChangesAsync();

    string GenerarPassword()
    {
        var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        var bytes = new byte[12];
        rng.GetBytes(bytes);
        var base64 = System.Convert.ToBase64String(bytes);
        return new string(base64.Where(char.IsLetterOrDigit).Take(12).ToArray());
    }

    var passwordPlano = GenerarPassword();
    var hash = BCrypt.Net.BCrypt.HashPassword(passwordPlano);
    var director = new Usuario
    {
        ColegioId = colegio.Id,
        Rol = RolUsuario.director,
        Nombre = req.directorNombre,
        Email = req.directorEmail,
        PasswordHash = hash,
        Estado = "requiere_cambio"
    };

    db.Usuarios.Add(director);
    await db.SaveChangesAsync();

    bool emailEnviado = false;
    try
    {
        var host = Environment.GetEnvironmentVariable("SMTP_HOST");
        var portStr = Environment.GetEnvironmentVariable("SMTP_PORT");
        var user = Environment.GetEnvironmentVariable("SMTP_USER");
        var pass = Environment.GetEnvironmentVariable("SMTP_PASS");
        var from = Environment.GetEnvironmentVariable("SMTP_FROM") ?? req.emailContacto ?? "no-reply@aquaflow";

        if (!string.IsNullOrWhiteSpace(host) && int.TryParse(portStr, out var port))
        {
            using var client = new System.Net.Mail.SmtpClient(host, port);
            client.EnableSsl = true;
            if (!string.IsNullOrWhiteSpace(user) && !string.IsNullOrWhiteSpace(pass))
                client.Credentials = new System.Net.NetworkCredential(user, pass);

            var mail = new System.Net.Mail.MailMessage(from, req.directorEmail)
            {
                Subject = "Credenciales de Director - AquaFlow",
                Body = $"Hola {req.directorNombre},\n\nSe ha creado el colegio '{req.nombre}'.\nTus credenciales de acceso:\nEmail: {req.directorEmail}\nPassword temporal: {passwordPlano}\n\nPor favor inicia sesión y cambia tu contraseña.",
            };
            await client.SendMailAsync(mail);
            emailEnviado = true;
        }
    }
    catch
    {
        emailEnviado = false;
    }

    var resp = new AltaColegioConDirectorResponse(
        colegio.Id,
        colegio.Nombre,
        colegio.Ciudad,
        director.Id,
        director.Nombre,
        director.Email,
        emailEnviado,
        emailEnviado ? null : passwordPlano
    );

    return Results.Created($"/api/colegios/{colegio.Id}", resp);
});

app.MapGet("/api/aulas", async (AquaFlowDbContext db, int? colegioId) =>
{
    var query = db.Aulas.AsQueryable();
    if (colegioId.HasValue) query = query.Where(a => a.ColegioId == colegioId.Value);
    var aulas = await query.OrderBy(a => a.Nombre).ToListAsync();
    return Results.Ok(aulas);
});

app.MapPost("/api/aulas", async (AquaFlowDbContext db, Aula nueva) =>
{
    db.Aulas.Add(nueva);
    await db.SaveChangesAsync();
    return Results.Created($"/api/aulas/{nueva.Id}", nueva);
});

app.MapPut("/api/aulas/{id:int}", async (AquaFlowDbContext db, int id, Aula cambios) =>
{
    var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == id);
    if (aula is null) return Results.NotFound();
    aula.Nombre = string.IsNullOrWhiteSpace(cambios.Nombre) ? aula.Nombre : cambios.Nombre;
    aula.Grado = cambios.Grado ?? aula.Grado;
    aula.ProfesorId = cambios.ProfesorId ?? aula.ProfesorId;
    await db.SaveChangesAsync();
    return Results.Ok(aula);
});

app.MapDelete("/api/aulas/{id:int}", async (AquaFlowDbContext db, int id) =>
{
    var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == id);
    if (aula is null) return Results.NotFound();
    db.Aulas.Remove(aula);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// Perfil del Estudiante
app.MapGet("/api/usuarios/{usuarioId:int}/perfil", async (AquaFlowDbContext db, int usuarioId) =>
{
    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId && u.Rol == RolUsuario.estudiante);
    if (usuario is null) return Results.NotFound(new { mensaje = "Usuario no encontrado" });

    var agg = await db.PerfilEstudianteAggs.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
    var stale = agg is null || (DateTime.UtcNow - agg.UltimaActualizacion).TotalSeconds > 60;
    if (stale)
    {
        var monedas = await db.Puntos
            .Where(p => p.UsuarioId == usuarioId)
            .Select(p => p.Valor)
            .DefaultIfEmpty(0)
            .SumAsync();

        var juegosCompletados = await db.Eventos
            .CountAsync(e => e.UsuarioId == usuarioId && (e.Tipo == TipoEvento.reto_completado || e.Tipo == TipoEvento.trivia_completada));

        var payloads = await db.Eventos
            .Where(e => e.UsuarioId == usuarioId && (e.Tipo == TipoEvento.reto_completado || e.Tipo == TipoEvento.trivia_completada))
            .Select(e => e.Payload)
            .ToListAsync();
        double litrosAhorrados = 0.0;
        foreach (var pl in payloads)
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(pl ?? "{}");
                var root = doc.RootElement;
                if (root.TryGetProperty("litrosAhorrados", out var la) && la.ValueKind == System.Text.Json.JsonValueKind.Number)
                    litrosAhorrados += la.GetDouble();
                else if (root.TryGetProperty("litros", out var l) && l.ValueKind == System.Text.Json.JsonValueKind.Number)
                    litrosAhorrados += l.GetDouble();
                else if (root.TryGetProperty("ahorroLitros", out var al) && al.ValueKind == System.Text.Json.JsonValueKind.Number)
                    litrosAhorrados += al.GetDouble();
            }
            catch { }
        }

        string nivelActual = monedas >= 1000 ? "Héroe del Agua" :
                             monedas >= 500 ? "Guardían del Agua" :
                             monedas >= 200 ? "Aprendiz del Agua" :
                             "Explorador";

        int siguienteUmbral = monedas >= 1000 ? 1000 : monedas >= 500 ? 1000 : monedas >= 200 ? 500 : 200;
        int progresoMonedas = Math.Min(100, (int)Math.Round((monedas * 100.0) / Math.Max(1, siguienteUmbral)));

        if (agg is null)
        {
            agg = new PerfilEstudianteAgg
            {
                UsuarioId = usuarioId,
                MonedasTotal = monedas,
                LitrosAhorradosTotal = litrosAhorrados,
                JuegosCompletados = juegosCompletados,
                NivelActual = nivelActual,
                SiguienteUmbral = siguienteUmbral,
                ProgresoMonedas = progresoMonedas,
                UltimaActualizacion = DateTime.UtcNow
            };
            db.PerfilEstudianteAggs.Add(agg);
        }
        else
        {
            agg.MonedasTotal = monedas;
            agg.LitrosAhorradosTotal = litrosAhorrados;
            agg.JuegosCompletados = juegosCompletados;
            agg.NivelActual = nivelActual;
            agg.SiguienteUmbral = siguienteUmbral;
            agg.ProgresoMonedas = progresoMonedas;
            agg.UltimaActualizacion = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
    }

    var insignias = await db.InsigniasUsuario
        .Where(iu => iu.UsuarioId == usuarioId && iu.Estado == "aprobada")
        .Join(db.Insignias, iu => iu.InsigniaId, i => i.Id, (iu, i) => new { i.Id, i.Nombre, i.Descripcion, i.IconoUrl, iu.OtorgadaEn })
        .OrderBy(i => i.Nombre)
        .ToListAsync();

    return Results.Ok(new {
        usuario = new { usuario.Id, usuario.Nombre, usuario.Email, usuario.ColegioId },
        monedas = agg!.MonedasTotal,
        nivelActual = agg.NivelActual,
        progresoMonedas = agg.ProgresoMonedas,
        siguienteUmbral = agg.SiguienteUmbral,
        juegosCompletados = agg.JuegosCompletados,
        litrosAhorrados = agg.LitrosAhorradosTotal,
        insignias
    });
}).RequireAuthorization();

app.MapPost("/api/usuarios/{usuarioId:int}/perfil/recalcular", async (AquaFlowDbContext db, int usuarioId) =>
{
    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId && u.Rol == RolUsuario.estudiante);
    if (usuario is null) return Results.NotFound(new { mensaje = "Usuario no encontrado" });

    var monedas = await db.Puntos
        .Where(p => p.UsuarioId == usuarioId)
        .Select(p => p.Valor)
        .DefaultIfEmpty(0)
        .SumAsync();

    var juegosCompletados = await db.Eventos
        .CountAsync(e => e.UsuarioId == usuarioId && (e.Tipo == TipoEvento.reto_completado || e.Tipo == TipoEvento.trivia_completada));

    var payloads = await db.Eventos
        .Where(e => e.UsuarioId == usuarioId && (e.Tipo == TipoEvento.reto_completado || e.Tipo == TipoEvento.trivia_completada))
        .Select(e => e.Payload)
        .ToListAsync();
    double litrosAhorrados = 0.0;
    foreach (var pl in payloads)
    {
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(pl ?? "{}");
            var root = doc.RootElement;
            if (root.TryGetProperty("litrosAhorrados", out var la) && la.ValueKind == System.Text.Json.JsonValueKind.Number)
                litrosAhorrados += la.GetDouble();
            else if (root.TryGetProperty("litros", out var l) && l.ValueKind == System.Text.Json.JsonValueKind.Number)
                litrosAhorrados += l.GetDouble();
            else if (root.TryGetProperty("ahorroLitros", out var al) && al.ValueKind == System.Text.Json.JsonValueKind.Number)
                litrosAhorrados += al.GetDouble();
        }
        catch { }
    }

    string nivelActual = monedas >= 1000 ? "Héroe del Agua" :
                         monedas >= 500 ? "Guardían del Agua" :
                         monedas >= 200 ? "Aprendiz del Agua" :
                         "Explorador";

    int siguienteUmbral = monedas >= 1000 ? 1000 : monedas >= 500 ? 1000 : monedas >= 200 ? 500 : 200;
    int progresoMonedas = Math.Min(100, (int)Math.Round((monedas * 100.0) / Math.Max(1, siguienteUmbral)));

    var agg = await db.PerfilEstudianteAggs.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
    if (agg is null)
    {
        agg = new PerfilEstudianteAgg
        {
            UsuarioId = usuarioId,
            MonedasTotal = monedas,
            LitrosAhorradosTotal = litrosAhorrados,
            JuegosCompletados = juegosCompletados,
            NivelActual = nivelActual,
            SiguienteUmbral = siguienteUmbral,
            ProgresoMonedas = progresoMonedas,
            UltimaActualizacion = DateTime.UtcNow
        };
        db.PerfilEstudianteAggs.Add(agg);
    }
    else
    {
        agg.MonedasTotal = monedas;
        agg.LitrosAhorradosTotal = litrosAhorrados;
        agg.JuegosCompletados = juegosCompletados;
        agg.NivelActual = nivelActual;
        agg.SiguienteUmbral = siguienteUmbral;
        agg.ProgresoMonedas = progresoMonedas;
        agg.UltimaActualizacion = DateTime.UtcNow;
    }
    await db.SaveChangesAsync();
    return Results.Ok(new { mensaje = "Perfil recalculado" });
}).RequireAuthorization();

app.MapPost("/api/usuarios/{usuarioId:int}/juegos/resultado", async (AquaFlowDbContext db, int usuarioId, System.Text.Json.JsonElement req) =>
{
    var tipoStr = req.TryGetProperty("tipo", out var tProp) ? tProp.GetString() : null;
    var litros = req.TryGetProperty("litrosAhorrados", out var lProp) && lProp.ValueKind == System.Text.Json.JsonValueKind.Number ? lProp.GetDouble() : 0.0;
    var juegoId = req.TryGetProperty("juegoId", out var jProp) ? jProp.GetString() : null;
    var aulaId = req.TryGetProperty("aulaId", out var aProp) && aProp.ValueKind == System.Text.Json.JsonValueKind.Number ? aProp.GetInt32() : (int?)null;

    if (string.IsNullOrWhiteSpace(tipoStr)) return Results.BadRequest(new { mensaje = "tipo requerido: reto|trivia" });
    if (!Enum.TryParse<TipoEvento>(tipoStr == "reto" ? "reto_completado" : "trivia_completada", ignoreCase: true, out var tipo))
        return Results.BadRequest(new { mensaje = "tipo inválido" });

    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId && u.Rol == RolUsuario.estudiante);
    if (usuario is null) return Results.NotFound(new { mensaje = "Usuario no encontrado" });

    if (!string.IsNullOrWhiteSpace(juegoId))
    {
        var existe = await db.Eventos.AnyAsync(e => e.UsuarioId == usuarioId && e.Tipo == tipo && e.Payload.Contains("\"juegoId\":\"" + juegoId + "\""));
        if (existe) return Results.Ok(new { mensaje = "Resultado ya registrado" });
    }
    var payload = System.Text.Json.JsonSerializer.Serialize(new { litrosAhorrados = litros, juegoId });
    db.Eventos.Add(new Evento { Tipo = tipo, ColegioId = usuario.ColegioId ?? 0, AulaId = aulaId, UsuarioId = usuarioId, Payload = payload });
    await db.SaveChangesAsync();

    var recompensa = (int)Math.Floor(litros / 10.0);
    if (recompensa > 0)
    {
        db.Puntos.Add(new Puntos { ColegioId = usuario.ColegioId ?? 0, AulaId = aulaId ?? 0, UsuarioId = usuarioId, Valor = recompensa, Motivo = "recompensa_juego", EventoOrigenId = null });
        await db.SaveChangesAsync();
    }

    var agg = await db.PerfilEstudianteAggs.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
    if (agg is null)
    {
        var monedas = recompensa;
        string nivelActual = monedas >= 1000 ? "Héroe del Agua" : monedas >= 500 ? "Guardían del Agua" : monedas >= 200 ? "Aprendiz del Agua" : "Explorador";
        int siguienteUmbral = monedas >= 1000 ? 1000 : monedas >= 500 ? 1000 : monedas >= 200 ? 500 : 200;
        int progresoMonedas = Math.Min(100, (int)Math.Round((monedas * 100.0) / Math.Max(1, siguienteUmbral)));
        agg = new PerfilEstudianteAgg { UsuarioId = usuarioId, MonedasTotal = monedas, LitrosAhorradosTotal = litros, JuegosCompletados = 1, NivelActual = nivelActual, SiguienteUmbral = siguienteUmbral, ProgresoMonedas = progresoMonedas, UltimaActualizacion = DateTime.UtcNow };
        db.PerfilEstudianteAggs.Add(agg);
    }
    else
    {
        agg.LitrosAhorradosTotal += litros;
        agg.JuegosCompletados += 1;
        if (recompensa > 0)
        {
            agg.MonedasTotal += recompensa;
            string nivelActual = agg.MonedasTotal >= 1000 ? "Héroe del Agua" : agg.MonedasTotal >= 500 ? "Guardían del Agua" : agg.MonedasTotal >= 200 ? "Aprendiz del Agua" : "Explorador";
            int siguienteUmbral = agg.MonedasTotal >= 1000 ? 1000 : agg.MonedasTotal >= 500 ? 1000 : agg.MonedasTotal >= 200 ? 500 : 200;
            int progresoMonedas = Math.Min(100, (int)Math.Round((agg.MonedasTotal * 100.0) / Math.Max(1, siguienteUmbral)));
            agg.NivelActual = nivelActual;
            agg.SiguienteUmbral = siguienteUmbral;
            agg.ProgresoMonedas = progresoMonedas;
        }
        agg.UltimaActualizacion = DateTime.UtcNow;
    }
    await db.SaveChangesAsync();
    return Results.Created($"/api/usuarios/{usuarioId}/juegos/resultado", new { mensaje = "Registro de juego creado" });
}).RequireAuthorization();

app.MapGet("/api/usuarios/{usuarioId:int}/retos/{retoId:int}/jugado", async (AquaFlowDbContext db, int usuarioId, int retoId) =>
{
    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId && u.Rol == RolUsuario.estudiante);
    if (usuario is null) return Results.NotFound(new { mensaje = "Usuario no encontrado" });
    var jugado = await db.Eventos.AnyAsync(e => e.UsuarioId == usuarioId && e.Tipo == TipoEvento.trivia_completada && e.Payload.Contains("\"juegoId\":\"reto:" + retoId + "\""));
    return Results.Ok(new { jugado });
}).RequireAuthorization();

app.MapPost("/api/usuarios/{usuarioId:int}/puntos", async (AquaFlowDbContext db, int usuarioId, System.Text.Json.JsonElement req) =>
{
    var valor = req.TryGetProperty("valor", out var vProp) && vProp.ValueKind == System.Text.Json.JsonValueKind.Number ? vProp.GetInt32() : 0;
    var motivo = req.TryGetProperty("motivo", out var mProp) ? mProp.GetString() : string.Empty;
    var aulaId = req.TryGetProperty("aulaId", out var aProp) && aProp.ValueKind == System.Text.Json.JsonValueKind.Number ? aProp.GetInt32() : 0;
    if (valor == 0) return Results.BadRequest(new { mensaje = "valor requerido" });

    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId && u.Rol == RolUsuario.estudiante);
    if (usuario is null) return Results.NotFound(new { mensaje = "Usuario no encontrado" });

    db.Puntos.Add(new Puntos { ColegioId = usuario.ColegioId ?? 0, AulaId = aulaId, UsuarioId = usuarioId, Valor = valor, Motivo = motivo, EventoOrigenId = null });
    await db.SaveChangesAsync();

    var agg = await db.PerfilEstudianteAggs.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
    var monedas = (agg?.MonedasTotal ?? 0) + valor;
    string nivelActual = monedas >= 1000 ? "Héroe del Agua" : monedas >= 500 ? "Guardían del Agua" : monedas >= 200 ? "Aprendiz del Agua" : "Explorador";
    int siguienteUmbral = monedas >= 1000 ? 1000 : monedas >= 500 ? 1000 : monedas >= 200 ? 500 : 200;
    int progresoMonedas = Math.Min(100, (int)Math.Round((monedas * 100.0) / Math.Max(1, siguienteUmbral)));

    if (agg is null)
    {
        agg = new PerfilEstudianteAgg { UsuarioId = usuarioId, MonedasTotal = monedas, LitrosAhorradosTotal = 0.0, JuegosCompletados = 0, NivelActual = nivelActual, SiguienteUmbral = siguienteUmbral, ProgresoMonedas = progresoMonedas, UltimaActualizacion = DateTime.UtcNow };
        db.PerfilEstudianteAggs.Add(agg);
    }
    else
    {
        agg.MonedasTotal = monedas;
        agg.NivelActual = nivelActual;
        agg.SiguienteUmbral = siguienteUmbral;
        agg.ProgresoMonedas = progresoMonedas;
        agg.UltimaActualizacion = DateTime.UtcNow;
    }
    await db.SaveChangesAsync();
    return Results.Created($"/api/usuarios/{usuarioId}/puntos", new { mensaje = "Puntos agregados" });
}).RequireAuthorization();

// Profesores
app.MapGet("/api/profesores", async (AquaFlowDbContext db, int? colegioId) =>
{
    var query = db.Usuarios.Where(u => u.Rol == RolUsuario.profesor);
    if (colegioId.HasValue) query = query.Where(u => u.ColegioId == colegioId.Value);
    var profesores = await query.OrderBy(u => u.Nombre).Select(u => new { u.Id, u.Nombre, u.Email, u.ColegioId }).ToListAsync();
    return Results.Ok(profesores);
});

app.MapPost("/api/profesores", async (AquaFlowDbContext db, System.Text.Json.JsonElement req) =>
{
    var nombre = req.TryGetProperty("nombre", out var nProp) ? nProp.GetString() : null;
    var email = req.TryGetProperty("email", out var eProp) ? eProp.GetString() : null;
    var colegioId = req.TryGetProperty("colegioId", out var cProp) ? cProp.GetInt32() : 0;
    if (string.IsNullOrWhiteSpace(nombre) || string.IsNullOrWhiteSpace(email) || colegioId <= 0)
        return Results.BadRequest(new { mensaje = "Datos incompletos: nombre, email y colegioId son requeridos" });

    var existe = await db.Usuarios.AnyAsync(u => u.Email == email);
    if (existe) return Results.Conflict(new { mensaje = "El email ya está registrado" });

    var passwordPlano = Guid.NewGuid().ToString("N").Substring(0, 10);
    var hash = BCrypt.Net.BCrypt.HashPassword(passwordPlano);
    var profesor = new Usuario
    {
        ColegioId = colegioId,
        Rol = RolUsuario.profesor,
        Nombre = nombre!,
        Email = email!,
        PasswordHash = hash,
        Estado = "requiere_cambio"
    };
    db.Usuarios.Add(profesor);
    await db.SaveChangesAsync();

    bool emailEnviado = false;
    try
    {
        var host = Environment.GetEnvironmentVariable("SMTP_HOST");
        var portStr = Environment.GetEnvironmentVariable("SMTP_PORT");
        var userS = Environment.GetEnvironmentVariable("SMTP_USER");
        var passS = Environment.GetEnvironmentVariable("SMTP_PASS");
        var from = Environment.GetEnvironmentVariable("SMTP_FROM") ?? "no-reply@aquaflow";

        if (!string.IsNullOrWhiteSpace(host) && int.TryParse(portStr, out var port))
        {
            using var client = new System.Net.Mail.SmtpClient(host, port);
            client.EnableSsl = true;
            if (!string.IsNullOrWhiteSpace(userS) && !string.IsNullOrWhiteSpace(passS))
                client.Credentials = new System.Net.NetworkCredential(userS, passS);

            var mail = new System.Net.Mail.MailMessage(from, profesor.Email)
            {
                Subject = "Credenciales de Profesor - AquaFlow",
                Body = $"Hola {profesor.Nombre},\n\nSe ha creado tu cuenta de profesor en AquaFlow.\nTus credenciales de acceso:\nEmail: {profesor.Email}\nPassword temporal: {passwordPlano}\n\nPor favor inicia sesión y cambia tu contraseña.",
            };
            await client.SendMailAsync(mail);
            emailEnviado = true;
        }
    }
    catch { emailEnviado = false; }

    return Results.Created($"/api/profesores/{profesor.Id}", new { profesor.Id, profesor.Nombre, profesor.Email, profesor.ColegioId, passwordTemporal = passwordPlano, emailEnviado });
});

// Espacios
app.MapGet("/api/espacios", async (AquaFlowDbContext db, int? colegioId) =>
{
    var query = db.Espacios.AsQueryable();
    if (colegioId.HasValue) query = query.Where(e => e.ColegioId == colegioId.Value);
    var espacios = await query.OrderBy(e => e.Etiqueta).ToListAsync();
    return Results.Ok(espacios);
});

app.MapPost("/api/espacios", async (AquaFlowDbContext db, Espacio nuevo) =>
{
    db.Espacios.Add(nuevo);
    await db.SaveChangesAsync();
    return Results.Created($"/api/espacios/{nuevo.Id}", nuevo);
});

// Estudiantes por Aula (inscripciones)
app.MapGet("/api/aulas/{aulaId:int}/estudiantes", async (AquaFlowDbContext db, int aulaId) =>
{
    var lista = await db.Inscripciones
        .Where(i => i.AulaId == aulaId)
        .Join(db.Usuarios, i => i.EstudianteId, u => u.Id, (i, u) => new { u.Id, u.Nombre, u.Email, i.AulaId })
        .OrderBy(u => u.Nombre)
        .ToListAsync();
    return Results.Ok(lista);
});

app.MapPost("/api/aulas/{aulaId:int}/estudiantes", async (AquaFlowDbContext db, int aulaId, System.Text.Json.JsonElement req) =>
{
    var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
    if (aula is null) return Results.NotFound(new { mensaje = "Aula no encontrada" });

    return Results.BadRequest(new { mensaje = "Flujo actualizado: las inscripciones se realizan por solicitud y aprobación del profesor. No se permite agregar estudiantes directamente al aula." });
});

app.MapDelete("/api/aulas/{aulaId:int}/estudiantes/{estudianteId:int}", async (AquaFlowDbContext db, int aulaId, int estudianteId) =>
{
    var ins = await db.Inscripciones.FirstOrDefaultAsync(i => i.AulaId == aulaId && i.EstudianteId == estudianteId);
    if (ins is null) return Results.NotFound();
    db.Inscripciones.Remove(ins);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// Código de Aula (MVP: derivado del ID)
app.MapGet("/api/aulas/{aulaId:int}/codigo", async (AquaFlowDbContext db, int aulaId) =>
{
    var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
    if (aula is null) return Results.NotFound();
    string code = $"AF-{aula.ColegioId}-{aula.Id}";
    return Results.Ok(new { code });
});

// Solicitar ingreso al Aula por código o id
app.MapPost("/api/aulas/solicitar-ingreso", async (AquaFlowDbContext db, System.Text.Json.JsonElement req) =>
{
    var code = req.TryGetProperty("codigo", out var cProp) ? cProp.GetString() : null;
    var aulaId = req.TryGetProperty("aulaId", out var aProp) && aProp.TryGetInt32(out var aid) ? aid : 0;
    var usuarioId = req.TryGetProperty("usuarioId", out var uProp) && uProp.TryGetInt32(out var uid) ? uid : 0;
    if (usuarioId <= 0) return Results.BadRequest(new { mensaje = "usuarioId requerido" });

    if (aulaId <= 0 && !string.IsNullOrWhiteSpace(code))
    {
        // Formato AF-<colegioId>-<aulaId>
        var parts = code.Split('-');
        if (parts.Length == 3 && int.TryParse(parts[2], out var parsedAula)) aulaId = parsedAula;
    }
    var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
    if (aula is null) return Results.NotFound(new { mensaje = "Aula no encontrada" });

    var yaInscrito = await db.Inscripciones.AnyAsync(i => i.AulaId == aulaId && i.EstudianteId == usuarioId);
    if (yaInscrito) return Results.Conflict(new { mensaje = "Ya inscrito" });

    var yaSolicitado = await db.Eventos.AnyAsync(e => e.AulaId == aulaId && e.UsuarioId == usuarioId && e.Tipo == TipoEvento.inscripcion_solicitada);
    if (yaSolicitado) return Results.Conflict(new { mensaje = "Solicitud ya registrada" });

    var payload = System.Text.Json.JsonSerializer.Serialize(new { estado = "pendiente" });
    db.Eventos.Add(new Evento { Tipo = TipoEvento.inscripcion_solicitada, ColegioId = aula.ColegioId, AulaId = aula.Id, UsuarioId = usuarioId, Payload = payload });
    await db.SaveChangesAsync();
    return Results.Created($"/api/aulas/{aulaId}/solicitudes/{usuarioId}", new { mensaje = "Solicitud registrada" });
});

// Listar solicitudes pendientes del aula
app.MapGet("/api/aulas/{aulaId:int}/solicitudes", async (AquaFlowDbContext db, int aulaId) =>
{
    var items = await db.Eventos
        .Where(e => e.AulaId == aulaId && e.Tipo == TipoEvento.inscripcion_solicitada && e.Payload.Contains("\"estado\":\"pendiente\""))
        .Join(db.Usuarios, e => e.UsuarioId, u => u.Id, (e, u) => new { u.Id, u.Nombre, u.Email, e.Payload, e.CreadoEn })
        .OrderBy(e => e.CreadoEn)
        .ToListAsync();
    return Results.Ok(items);
});

// Aprobar/Rechazar solicitud
app.MapPost("/api/aulas/{aulaId:int}/solicitudes/{usuarioId:int}/aprobar", async (AquaFlowDbContext db, int aulaId, int usuarioId) =>
{
    var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
    if (aula is null) return Results.NotFound();
    var ins = await db.Inscripciones.FirstOrDefaultAsync(i => i.AulaId == aulaId && i.EstudianteId == usuarioId);
    if (ins is null)
    {
        db.Inscripciones.Add(new Inscripcion { AulaId = aulaId, EstudianteId = usuarioId });
        await db.SaveChangesAsync();
    }
    var eventos = await db.Eventos.Where(e => e.AulaId == aulaId && e.UsuarioId == usuarioId && e.Tipo == TipoEvento.inscripcion_solicitada).ToListAsync();
    foreach (var ev in eventos) ev.Payload = System.Text.Json.JsonSerializer.Serialize(new { estado = "aprobada" });
    await db.SaveChangesAsync();
    return Results.Ok(new { mensaje = "Inscripción aprobada" });
});

app.MapPost("/api/aulas/{aulaId:int}/solicitudes/{usuarioId:int}/rechazar", async (AquaFlowDbContext db, int aulaId, int usuarioId) =>
{
    var eventos = await db.Eventos.Where(e => e.AulaId == aulaId && e.UsuarioId == usuarioId && e.Tipo == TipoEvento.inscripcion_solicitada).ToListAsync();
    if (eventos.Count == 0) return Results.NotFound();
    foreach (var ev in eventos) ev.Payload = System.Text.Json.JsonSerializer.Serialize(new { estado = "rechazada" });
    await db.SaveChangesAsync();
    return Results.Ok(new { mensaje = "Solicitud rechazada" });
});

// Endpoints de plantillas y retos de reducción (MVP)
app.MapGet("/api/plantillas-retos", async (AquaFlowDbContext db) =>
{
    var plantillas = await db.PlantillasRetos.Where(p => p.Activa).ToListAsync();
    return Results.Ok(plantillas);
});

app.MapPost("/api/aulas/{aulaId:int}/retos", async (AquaFlowDbContext db, int aulaId, RetoAula reto) =>
{
    if (reto.AulaId != aulaId) reto.AulaId = aulaId;
    if (reto.FechaInicio.Kind == DateTimeKind.Unspecified) reto.FechaInicio = DateTime.SpecifyKind(reto.FechaInicio, DateTimeKind.Utc);
    if (reto.FechaFin.Kind == DateTimeKind.Unspecified) reto.FechaFin = DateTime.SpecifyKind(reto.FechaFin, DateTimeKind.Utc);
    db.RetosAula.Add(reto);
    await db.SaveChangesAsync();
    return Results.Created($"/api/retos/{reto.Id}", reto);
});

app.MapGet("/api/aulas/{aulaId:int}/retos", async (AquaFlowDbContext db, int aulaId) =>
{
    var lista = await db.RetosAula.Where(r => r.AulaId == aulaId).OrderByDescending(r => r.FechaInicio).ToListAsync();
    return Results.Ok(lista);
});

app.MapPut("/api/retos/{retoId:int}/estado", async (AquaFlowDbContext db, int retoId, System.Text.Json.JsonElement req) =>
{
    var reto = await db.RetosAula.FirstOrDefaultAsync(r => r.Id == retoId);
    if (reto is null) return Results.NotFound();
    var estadoStr = req.TryGetProperty("estado", out var eProp) ? eProp.GetString() : null;
    if (string.IsNullOrWhiteSpace(estadoStr)) return Results.BadRequest(new { mensaje = "Estado requerido" });
    if (!Enum.TryParse<EstadoReto>(estadoStr, ignoreCase: true, out var estado)) return Results.BadRequest(new { mensaje = "Estado inválido" });
    var prevEstado = reto.Estado;
    reto.Estado = estado;
    await db.SaveChangesAsync();

    if (prevEstado != EstadoReto.completado && estado == EstadoReto.completado)
    {
        var plantilla = await db.PlantillasRetos.FirstOrDefaultAsync(p => p.Id == reto.PlantillaId);
        var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == reto.AulaId);
        var estudiantes = await db.Inscripciones.Where(i => i.AulaId == reto.AulaId).Select(i => i.EstudianteId).ToListAsync();
        foreach (var uid in estudiantes)
        {
            var puntos = plantilla?.PuntosRecompensa ?? 0;
            if (puntos > 0)
            {
                db.Puntos.Add(new Puntos { ColegioId = aula?.ColegioId ?? 0, AulaId = reto.AulaId, UsuarioId = uid, Valor = puntos, Motivo = "recompensa_reto", EventoOrigenId = reto.Id });
            }
            if (plantilla?.InsigniaId is int insId)
            {
                var ins = await db.Insignias.FirstOrDefaultAsync(i => i.Id == insId);
                if (ins is not null)
                {
                    var estadoIns = ins.RequiereValidacion ? "pendiente" : "aprobada";
                    db.InsigniasUsuario.Add(new InsigniaUsuario { UsuarioId = uid, InsigniaId = ins.Id, OtorgadaEn = DateTime.UtcNow, Estado = estadoIns });
                }
            }
            db.Eventos.Add(new Evento { Tipo = TipoEvento.reto_completado, ColegioId = aula?.ColegioId ?? 0, AulaId = reto.AulaId, UsuarioId = uid, Payload = System.Text.Json.JsonSerializer.Serialize(new { retoId = reto.Id, puntosOtorgados = puntos }) });

            var agg = await db.PerfilEstudianteAggs.FirstOrDefaultAsync(a => a.UsuarioId == uid);
            if (agg is null)
            {
                var monedas = puntos;
                string nivelActual = monedas >= 1000 ? "Héroe del Agua" : monedas >= 500 ? "Guardían del Agua" : monedas >= 200 ? "Aprendiz del Agua" : "Explorador";
                int siguienteUmbral = monedas >= 1000 ? 1000 : monedas >= 500 ? 1000 : monedas >= 200 ? 500 : 200;
                int progresoMonedas = Math.Min(100, (int)Math.Round((monedas * 100.0) / Math.Max(1, siguienteUmbral)));
                agg = new PerfilEstudianteAgg { UsuarioId = uid, MonedasTotal = monedas, LitrosAhorradosTotal = 0.0, JuegosCompletados = 1, NivelActual = nivelActual, SiguienteUmbral = siguienteUmbral, ProgresoMonedas = progresoMonedas, UltimaActualizacion = DateTime.UtcNow };
                db.PerfilEstudianteAggs.Add(agg);
            }
            else
            {
                agg.JuegosCompletados += 1;
                if (puntos > 0)
                {
                    agg.MonedasTotal += puntos;
                    string nivelActual = agg.MonedasTotal >= 1000 ? "Héroe del Agua" : agg.MonedasTotal >= 500 ? "Guardían del Agua" : agg.MonedasTotal >= 200 ? "Aprendiz del Agua" : "Explorador";
                    int siguienteUmbral = agg.MonedasTotal >= 1000 ? 1000 : agg.MonedasTotal >= 500 ? 1000 : agg.MonedasTotal >= 200 ? 500 : 200;
                    int progresoMonedas = Math.Min(100, (int)Math.Round((agg.MonedasTotal * 100.0) / Math.Max(1, siguienteUmbral)));
                    agg.NivelActual = nivelActual;
                    agg.SiguienteUmbral = siguienteUmbral;
                    agg.ProgresoMonedas = progresoMonedas;
                }
                agg.UltimaActualizacion = DateTime.UtcNow;
            }
        }
        await db.SaveChangesAsync();
    }
    return Results.Ok(reto);
});

app.MapPost("/api/preguntas", async (AquaFlowDbContext db, System.Text.Json.JsonElement req) =>
{
    var texto = req.TryGetProperty("texto", out var tProp) ? tProp.GetString() : null;
    var tipoStr = req.TryGetProperty("tipo", out var tpProp) ? tpProp.GetString() : null;
    var opciones = req.TryGetProperty("opciones", out var oProp) ? oProp.GetRawText() : "[]";
    var correcta = req.TryGetProperty("respuestaCorrecta", out var rProp) ? rProp.GetString() : null;
    var categoria = req.TryGetProperty("categoria", out var cProp) ? cProp.GetString() : null;
    var dificultad = req.TryGetProperty("dificultad", out var dProp) ? dProp.GetString() : null;
    var creadorId = req.TryGetProperty("creadorId", out var crProp) && crProp.ValueKind == System.Text.Json.JsonValueKind.Number ? crProp.GetInt32() : (int?)null;
    var colegioId = req.TryGetProperty("colegioId", out var coProp) && coProp.ValueKind == System.Text.Json.JsonValueKind.Number ? coProp.GetInt32() : (int?)null;
    if (string.IsNullOrWhiteSpace(texto) || string.IsNullOrWhiteSpace(tipoStr) || string.IsNullOrWhiteSpace(correcta))
        return Results.BadRequest(new { mensaje = "texto, tipo y respuestaCorrecta requeridos" });
    if (!Enum.TryParse<TipoPregunta>(tipoStr, ignoreCase: true, out var tipo))
        return Results.BadRequest(new { mensaje = "tipo inválido" });
    var p = new Pregunta { Texto = texto!, Tipo = tipo, Opciones = opciones, RespuestaCorrecta = correcta!, Categoria = categoria, Dificultad = dificultad, CreadorId = creadorId, ColegioId = colegioId };
    db.Preguntas.Add(p);
    await db.SaveChangesAsync();
    return Results.Created($"/api/preguntas/{p.Id}", p);
}).RequireAuthorization();

app.MapGet("/api/preguntas", async (AquaFlowDbContext db, string? tipo, string? categoria, string? dificultad, bool? activa) =>
{
    var q = db.Preguntas.AsQueryable();
    if (!string.IsNullOrWhiteSpace(tipo) && Enum.TryParse<TipoPregunta>(tipo, ignoreCase: true, out var tp)) q = q.Where(p => p.Tipo == tp);
    if (!string.IsNullOrWhiteSpace(categoria)) q = q.Where(p => p.Categoria == categoria);
    if (!string.IsNullOrWhiteSpace(dificultad)) q = q.Where(p => p.Dificultad == dificultad);
    if (activa.HasValue) q = q.Where(p => p.Activa == activa.Value);
    var lista = await q.OrderByDescending(p => p.CreadoEn).Take(200).ToListAsync();
    return Results.Ok(lista);
}).RequireAuthorization();

app.MapPost("/api/bancos", async (AquaFlowDbContext db, System.Text.Json.JsonElement req) =>
{
    var nombre = req.TryGetProperty("nombre", out var nProp) ? nProp.GetString() : null;
    var alcance = req.TryGetProperty("alcance", out var aProp) ? aProp.GetString() : "aula";
    var colegioId = req.TryGetProperty("colegioId", out var coProp) && coProp.ValueKind == System.Text.Json.JsonValueKind.Number ? coProp.GetInt32() : (int?)null;
    var creadorId = req.TryGetProperty("creadorId", out var crProp) && crProp.ValueKind == System.Text.Json.JsonValueKind.Number ? crProp.GetInt32() : (int?)null;
    if (string.IsNullOrWhiteSpace(nombre)) return Results.BadRequest(new { mensaje = "nombre requerido" });
    var b = new BancoPreguntas { Nombre = nombre!, Alcance = alcance!, ColegioId = colegioId, CreadorId = creadorId, Activo = true };
    db.BancosPreguntas.Add(b);
    await db.SaveChangesAsync();
    return Results.Created($"/api/bancos/{b.Id}", b);
}).RequireAuthorization();

app.MapPost("/api/bancos/{bancoId:int}/preguntas", async (AquaFlowDbContext db, int bancoId, System.Text.Json.JsonElement req) =>
{
    var banco = await db.BancosPreguntas.FirstOrDefaultAsync(b => b.Id == bancoId);
    if (banco is null) return Results.NotFound();
    var ids = req.TryGetProperty("preguntaIds", out var listProp) && listProp.ValueKind == System.Text.Json.JsonValueKind.Array ? listProp.EnumerateArray().Where(e => e.ValueKind == System.Text.Json.JsonValueKind.Number).Select(e => e.GetInt32()).ToList() : new List<int>();
    if (ids.Count == 0) return Results.BadRequest(new { mensaje = "preguntaIds requeridos" });
    foreach (var pid in ids)
    {
        var exists = await db.BancosPreguntasPreguntas.AnyAsync(x => x.BancoId == bancoId && x.PreguntaId == pid);
        if (!exists) db.BancosPreguntasPreguntas.Add(new BancoPregunta { BancoId = bancoId, PreguntaId = pid });
    }
    await db.SaveChangesAsync();
    return Results.Ok(new { mensaje = "asociadas" });
}).RequireAuthorization();

app.MapPost("/api/aulas/{aulaId:int}/trivia/sesiones", async (AquaFlowDbContext db, int aulaId, System.Text.Json.JsonElement req) =>
{
    var creadorId = req.TryGetProperty("creadorId", out var crProp) && crProp.ValueKind == System.Text.Json.JsonValueKind.Number ? crProp.GetInt32() : 0;
    var bancoId = req.TryGetProperty("bancoId", out var bProp) && bProp.ValueKind == System.Text.Json.JsonValueKind.Number ? bProp.GetInt32() : 0;
    var cantidad = req.TryGetProperty("cantidad", out var cProp) && cProp.ValueKind == System.Text.Json.JsonValueKind.Number ? cProp.GetInt32() : 10;
    var categoria = req.TryGetProperty("categoria", out var catProp) ? catProp.GetString() : null;
    var dificultad = req.TryGetProperty("dificultad", out var dProp) ? dProp.GetString() : null;
    var q = db.Preguntas.Where(p => p.Activa);
    if (bancoId > 0)
    {
        var qids = await db.BancosPreguntasPreguntas.Where(x => x.BancoId == bancoId).Select(x => x.PreguntaId).ToListAsync();
        q = q.Where(p => qids.Contains(p.Id));
    }
    if (!string.IsNullOrWhiteSpace(categoria)) q = q.Where(p => p.Categoria == categoria);
    if (!string.IsNullOrWhiteSpace(dificultad)) q = q.Where(p => p.Dificultad == dificultad);
    var lista = await q.OrderBy(p => Guid.NewGuid()).Take(cantidad).ToListAsync();
    if (lista.Count == 0) return Results.BadRequest(new { mensaje = "Sin preguntas para la sesión" });
    var sesion = new SesionTrivia { AulaId = aulaId, CreadorId = creadorId, Estado = "activa", Config = req.GetRawText() };
    db.SesionesTrivia.Add(sesion);
    await db.SaveChangesAsync();
    int orden = 1;
    foreach (var p in lista)
    {
        db.SesionesPreguntas.Add(new SesionPregunta { SesionId = sesion.Id, PreguntaId = p.Id, Orden = orden++ });
    }
    await db.SaveChangesAsync();
    return Results.Created($"/api/trivia/sesiones/{sesion.Id}", new { sesion.Id, cantidad = lista.Count });
}).RequireAuthorization();

app.MapGet("/api/aulas/{aulaId:int}/trivia/sesiones", async (AquaFlowDbContext db, int aulaId) =>
{
    var sesiones = await db.SesionesTrivia
        .Where(s => s.AulaId == aulaId && s.Estado == "activa")
        .OrderByDescending(s => s.CreadoEn)
        .Select(s => new { s.Id, s.Estado, s.CreadoEn })
        .ToListAsync();
    var ids = sesiones.Select(s => s.Id).ToList();
    var counts = await db.SesionesPreguntas
        .Where(sp => ids.Contains(sp.SesionId))
        .GroupBy(sp => sp.SesionId)
        .Select(g => new { SesionId = g.Key, Cantidad = g.Count() })
        .ToListAsync();
    var mapa = counts.ToDictionary(x => x.SesionId, x => x.Cantidad);
    var resp = sesiones.Select(s => new { s.Id, s.Estado, s.CreadoEn, cantidad = mapa.ContainsKey(s.Id) ? mapa[s.Id] : 0 });
    return Results.Ok(resp);
}).RequireAuthorization();

app.MapGet("/api/trivia/sesiones/{sesionId:int}/preguntas", async (AquaFlowDbContext db, int sesionId) =>
{
    var items = await db.SesionesPreguntas.Where(sp => sp.SesionId == sesionId).OrderBy(sp => sp.Orden).Join(db.Preguntas, sp => sp.PreguntaId, p => p.Id, (sp, p) => new { p.Id, p.Texto, p.Tipo, p.Opciones, p.Categoria, p.Dificultad, sp.Orden }).ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization();

app.MapPost("/api/trivia/sesiones/{sesionId:int}/respuesta", async (AquaFlowDbContext db, int sesionId, System.Text.Json.JsonElement req) =>
{
    var usuarioId = req.TryGetProperty("usuarioId", out var uProp) && uProp.ValueKind == System.Text.Json.JsonValueKind.Number ? uProp.GetInt32() : 0;
    var preguntaId = req.TryGetProperty("preguntaId", out var pProp) && pProp.ValueKind == System.Text.Json.JsonValueKind.Number ? pProp.GetInt32() : 0;
    var respuesta = req.TryGetProperty("respuesta", out var rProp) ? rProp.GetString() : null;
    if (usuarioId <= 0 || preguntaId <= 0 || string.IsNullOrWhiteSpace(respuesta)) return Results.BadRequest(new { mensaje = "usuarioId, preguntaId y respuesta requeridos" });
    var preg = await db.Preguntas.FirstOrDefaultAsync(p => p.Id == preguntaId);
    if (preg is null) return Results.NotFound(new { mensaje = "Pregunta no encontrada" });
    var correcta = string.Equals(preg.RespuestaCorrecta.Trim(), respuesta.Trim(), StringComparison.OrdinalIgnoreCase);
    var puntos = correcta ? 10 : 0;
    db.IntentosRespuestas.Add(new IntentoRespuesta { SesionId = sesionId, UsuarioId = usuarioId, PreguntaId = preguntaId, Respuesta = respuesta!, Correcta = correcta, Puntos = puntos });
    if (puntos > 0)
    {
        var sesion = await db.SesionesTrivia.FirstOrDefaultAsync(s => s.Id == sesionId);
        var aula = sesion is null ? null : await db.Aulas.FirstOrDefaultAsync(a => a.Id == sesion.AulaId);
        db.Puntos.Add(new Puntos { ColegioId = aula?.ColegioId ?? 0, AulaId = sesion?.AulaId ?? 0, UsuarioId = usuarioId, Valor = puntos, Motivo = "trivia_correcta" });
        var agg = await db.PerfilEstudianteAggs.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
        if (agg is null)
        {
            var monedas = puntos;
            string nivelActual = monedas >= 1000 ? "Héroe del Agua" : monedas >= 500 ? "Guardían del Agua" : monedas >= 200 ? "Aprendiz del Agua" : "Explorador";
            int siguienteUmbral = monedas >= 1000 ? 1000 : monedas >= 500 ? 1000 : monedas >= 200 ? 500 : 200;
            int progresoMonedas = Math.Min(100, (int)Math.Round((monedas * 100.0) / Math.Max(1, siguienteUmbral)));
            agg = new PerfilEstudianteAgg { UsuarioId = usuarioId, MonedasTotal = monedas, LitrosAhorradosTotal = 0.0, JuegosCompletados = 0, NivelActual = nivelActual, SiguienteUmbral = siguienteUmbral, ProgresoMonedas = progresoMonedas, UltimaActualizacion = DateTime.UtcNow };
            db.PerfilEstudianteAggs.Add(agg);
        }
        else
        {
            agg.MonedasTotal += puntos;
            string nivelActual = agg.MonedasTotal >= 1000 ? "Héroe del Agua" : agg.MonedasTotal >= 500 ? "Guardían del Agua" : agg.MonedasTotal >= 200 ? "Aprendiz del Agua" : "Explorador";
            int siguienteUmbral = agg.MonedasTotal >= 1000 ? 1000 : agg.MonedasTotal >= 500 ? 1000 : agg.MonedasTotal >= 200 ? 500 : 200;
            int progresoMonedas = Math.Min(100, (int)Math.Round((agg.MonedasTotal * 100.0) / Math.Max(1, siguienteUmbral)));
            agg.NivelActual = nivelActual;
            agg.SiguienteUmbral = siguienteUmbral;
            agg.ProgresoMonedas = progresoMonedas;
            agg.UltimaActualizacion = DateTime.UtcNow;
        }
    }
    await db.SaveChangesAsync();
    return Results.Created($"/api/trivia/sesiones/{sesionId}/respuesta", new { correcta, puntos });
}).RequireAuthorization();

app.MapPost("/api/trivia/sesiones/{sesionId:int}/finalizar", async (AquaFlowDbContext db, int sesionId, System.Text.Json.JsonElement req) =>
{
    var usuarioId = req.TryGetProperty("usuarioId", out var uProp) && uProp.ValueKind == System.Text.Json.JsonValueKind.Number ? uProp.GetInt32() : 0;
    if (usuarioId <= 0) return Results.BadRequest(new { mensaje = "usuarioId requerido" });
    var total = await db.SesionesPreguntas.CountAsync(sp => sp.SesionId == sesionId);
    var correctas = await db.IntentosRespuestas.CountAsync(ir => ir.SesionId == sesionId && ir.UsuarioId == usuarioId && ir.Correcta);
    var sesion = await db.SesionesTrivia.FirstOrDefaultAsync(s => s.Id == sesionId);
    var aula = sesion is null ? null : await db.Aulas.FirstOrDefaultAsync(a => a.Id == sesion.AulaId);
    db.Eventos.Add(new Evento { Tipo = TipoEvento.trivia_completada, ColegioId = aula?.ColegioId ?? 0, AulaId = sesion?.AulaId, UsuarioId = usuarioId, Payload = System.Text.Json.JsonSerializer.Serialize(new { sesionId, correctas, total }) });
    var agg = await db.PerfilEstudianteAggs.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
    if (agg is null)
    {
        agg = new PerfilEstudianteAgg { UsuarioId = usuarioId, MonedasTotal = 0, LitrosAhorradosTotal = 0.0, JuegosCompletados = 1, NivelActual = "Explorador", SiguienteUmbral = 200, ProgresoMonedas = 0, UltimaActualizacion = DateTime.UtcNow };
        db.PerfilEstudianteAggs.Add(agg);
    }
    else
    {
        agg.JuegosCompletados += 1;
        agg.UltimaActualizacion = DateTime.UtcNow;
    }
    await db.SaveChangesAsync();
    return Results.Ok(new { correctas, total });
}).RequireAuthorization();

// Consumo agregado (simulado mientras se integra InfluxDB)
app.MapGet("/api/consumo/agregado", (int aulaId, string periodo) =>
{
    var ahora = DateTime.UtcNow.Date;
    var puntos = Enumerable.Range(0, 7).Select(i => new
    {
        fecha = ahora.AddDays(-i),
        litros = (double)(120 - i * 5)
    }).OrderBy(p => p.fecha);

    double total = puntos.Sum(p => p.litros);
    double lineaBase = 140.0; // valor simulado
    double reduccionPct = lineaBase > 0.0 ? Math.Round((1.0 - (total / (lineaBase * 7.0))) * 100.0, 2) : 0.0;

    return Results.Ok(new
    {
        aulaId,
        periodo,
        totalLitros = total,
        lineaBase,
        reduccionPct,
        serie = puntos
    });
});

// ------ AUTH ------
// DTOs definidos en Models/AuthDtos.cs

// Registro
app.MapPost("/auth/registrar", async (AquaFlowDbContext db, RegistroRequest req) =>
{
    var existe = await db.Usuarios.AnyAsync(u => u.Email == req.email);
    if (existe) return Results.Conflict(new { mensaje = "El email ya está registrado." });

    // Validar rol
    if (!Enum.TryParse<RolUsuario>(req.rol, ignoreCase: true, out var rol))
    {
        return Results.BadRequest(new { mensaje = "Rol inválido." });
    }

    // Sólo permitir registro de estudiantes
    if (rol != RolUsuario.estudiante)
    {
        return Results.BadRequest(new { mensaje = "Sólo estudiantes pueden registrarse. Profesores y directores reciben credenciales por invitación." });
    }

    // Requerir colegio para estudiantes
    if (req.colegioId is null)
    {
        return Results.BadRequest(new { mensaje = "Debe seleccionar un colegio al registrarse como estudiante." });
    }

    var hash = BCrypt.Net.BCrypt.HashPassword(req.password);
    var usuario = new Usuario
    {
        ColegioId = req.colegioId,
        Rol = rol,
        Nombre = req.nombre,
        Email = req.email,
        PasswordHash = hash,
        Estado = "activo"
    };

    db.Usuarios.Add(usuario);
    await db.SaveChangesAsync();
    return Results.Created($"/api/usuarios/{usuario.Id}", new { usuario.Id, usuario.Nombre, usuario.Email, rol = usuario.Rol.ToString().ToLowerInvariant() });
});

// Login
app.MapPost("/auth/login", async (AquaFlowDbContext db, LoginRequest req) =>
{
    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Email == req.email);
    if (usuario is null) return Results.Unauthorized();
    var ok = BCrypt.Net.BCrypt.Verify(req.password, usuario.PasswordHash);
    if (!ok) return Results.Unauthorized();

    var claims = new[]
    {
        new System.Security.Claims.Claim("userId", usuario.Id.ToString()),
        new System.Security.Claims.Claim("rol", usuario.Rol.ToString()),
        new System.Security.Claims.Claim("colegioId", usuario.ColegioId?.ToString() ?? "")
    };

    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
        issuer: jwtIssuer,
        audience: jwtAudience,
        claims: claims,
        expires: DateTime.UtcNow.AddHours(8),
        signingCredentials: creds
    );

    var jwt = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
    return Results.Ok(new { token = jwt, usuario = new { usuario.Id, usuario.Nombre, usuario.Email, rol = usuario.Rol.ToString().ToLowerInvariant(), usuario.ColegioId, Estado = usuario.Estado, requiereCambioPassword = string.Equals(usuario.Estado, "requiere_cambio", StringComparison.OrdinalIgnoreCase) } });
});

// Recuperación: solicitar token
app.MapPost("/auth/password/reset/solicitar", async (AquaFlowDbContext db, ResetRequest req) =>
{
    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Email == req.email);
    // Siempre responder OK para evitar enumeración, pero sólo crear token si existe
    if (usuario is not null)
    {
        var token = Guid.NewGuid().ToString("N");
        var rec = new RecuperacionToken
        {
            UsuarioId = usuario.Id,
            Token = token,
            ExpiraEn = DateTime.UtcNow.AddHours(1),
            Usado = false
        };
        db.RecuperacionTokens.Add(rec);
        await db.SaveChangesAsync();
        // En MVP devolvemos el token para facilitar pruebas (en producción se envía por email)
        return Results.Ok(new { mensaje = "Token generado", token });
    }
    return Results.Ok(new { mensaje = "Si el email existe, se generó un token." });
});

// Recuperación: confirmar
app.MapPost("/auth/password/reset/confirmar", async (AquaFlowDbContext db, ResetConfirmRequest req) =>
{
    var rec = await db.RecuperacionTokens.FirstOrDefaultAsync(r => r.Token == req.token && !r.Usado && r.ExpiraEn > DateTime.UtcNow);
    if (rec is null) return Results.BadRequest(new { mensaje = "Token inválido o expirado." });

    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == rec.UsuarioId);
    if (usuario is null) return Results.BadRequest(new { mensaje = "Usuario no encontrado." });

    usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.newPassword);
    rec.Usado = true;
    await db.SaveChangesAsync();
    return Results.Ok(new { mensaje = "Contraseña actualizada." });
});

// Cambio de contraseña autenticado
app.MapPost("/auth/password/cambiar", async (AquaFlowDbContext db, HttpContext ctx, ChangePasswordRequest req) =>
{
    var userIdClaim = ctx.User?.FindFirst("userId")?.Value;
    if (string.IsNullOrWhiteSpace(userIdClaim)) return Results.Unauthorized();
    if (!int.TryParse(userIdClaim, out var userId)) return Results.Unauthorized();

    var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == userId);
    if (usuario is null) return Results.Unauthorized();

    var ok = BCrypt.Net.BCrypt.Verify(req.actual, usuario.PasswordHash);
    if (!ok) return Results.BadRequest(new { mensaje = "Contraseña actual incorrecta." });

    usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.nueva);
    if (string.Equals(usuario.Estado, "requiere_cambio", StringComparison.OrdinalIgnoreCase))
        usuario.Estado = "activo";
    await db.SaveChangesAsync();
    return Results.Ok(new { mensaje = "Contraseña actualizada." });
}).RequireAuthorization();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AquaFlowDbContext>();
    var seedAppData = Environment.GetEnvironmentVariable("SEED_APP_DATA");
    if (string.Equals(seedAppData, "true", StringComparison.OrdinalIgnoreCase))
    {
        await DataSeeder.SeedAsync(db);
    }
}

app.Run();