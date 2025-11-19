using Microsoft.EntityFrameworkCore;
using AquaFlow.Api.Models;

namespace AquaFlow.Api.Data
{
    public class AquaFlowDbContext : DbContext
    {
        public AquaFlowDbContext(DbContextOptions<AquaFlowDbContext> options) : base(options)
        {
        }

        public DbSet<Colegio> Colegios => Set<Colegio>();
        public DbSet<Usuario> Usuarios => Set<Usuario>();
        public DbSet<Aula> Aulas => Set<Aula>();
        public DbSet<Inscripcion> Inscripciones => Set<Inscripcion>();
        public DbSet<Espacio> Espacios => Set<Espacio>();
        public DbSet<Dispositivo> Dispositivos => Set<Dispositivo>();
        public DbSet<PlantillaReto> PlantillasRetos => Set<PlantillaReto>();
        public DbSet<RetoAula> RetosAula => Set<RetoAula>();
        public DbSet<Insignia> Insignias => Set<Insignia>();
        public DbSet<InsigniaUsuario> InsigniasUsuario => Set<InsigniaUsuario>();
        public DbSet<Puntos> Puntos => Set<Puntos>();
        public DbSet<Evento> Eventos => Set<Evento>();
        public DbSet<ConsumoAgregado> ConsumosAgregados => Set<ConsumoAgregado>();
        public DbSet<RecuperacionToken> RecuperacionTokens => Set<RecuperacionToken>();
        public DbSet<Departamento> Departamentos => Set<Departamento>();
        public DbSet<Provincia> Provincias => Set<Provincia>();
        public DbSet<Distrito> Distritos => Set<Distrito>();
        public DbSet<PerfilEstudianteAgg> PerfilEstudianteAggs => Set<PerfilEstudianteAgg>();
        public DbSet<Pregunta> Preguntas => Set<Pregunta>();
        public DbSet<BancoPreguntas> BancosPreguntas => Set<BancoPreguntas>();
        public DbSet<BancoPregunta> BancosPreguntasPreguntas => Set<BancoPregunta>();
        

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Colegio>(entity =>
            {
                entity.ToTable("colegios");
                entity.Property(c => c.Id).HasColumnName("id_colegio");
                entity.Property(c => c.Nombre).HasColumnName("nombre_ie").HasMaxLength(160).IsRequired();
                entity.Property(c => c.Ciudad).HasColumnName("distrito").HasMaxLength(80);
                entity.Property(c => c.EmailContacto).HasColumnName("email_institucional").HasMaxLength(256);
                entity.Property(c => c.CreadoEn).HasColumnName("fecha_registro").HasDefaultValueSql("NOW()");

                entity.Property(c => c.CodigoLocal).HasColumnName("codigo_local").HasMaxLength(12);
                entity.HasIndex(c => c.CodigoLocal).IsUnique();

                entity.Property(c => c.Nivel)
                      .HasColumnName("nivel")
                      .HasConversion<string>()
                      .HasMaxLength(20)
                      .IsRequired();

                entity.Property(c => c.Direccion).HasColumnName("direccion").HasMaxLength(180);
                entity.Property(c => c.DireccionExacta).HasColumnName("direccion_exacta").HasMaxLength(240);
                entity.Property(c => c.Telefono).HasColumnName("telefono").HasMaxLength(20);
                entity.Property(c => c.Estado)
                      .HasColumnName("estado")
                      .HasConversion<string>()
                      .HasMaxLength(20)
                      .HasDefaultValue(EstadoColegio.activo);

                entity.Property(c => c.DistritoId).HasColumnName("distrito_id");
                entity.HasIndex(c => c.DistritoId);
                entity.HasOne<Distrito>()
                      .WithMany()
                      .HasForeignKey(c => c.DistritoId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.ToTable("colegios", t =>
                {
                    t.HasCheckConstraint("CK_colegios_nivel", "nivel IN ('primaria','secundaria','primaria_secundaria')");
                });
                entity.ToTable("colegios", t =>
                {
                    t.HasCheckConstraint("CK_colegios_estado", "estado IN ('activo','inactivo')");
                });
                entity.HasIndex(c => c.Ciudad).HasDatabaseName("IX_colegios_distrito");
            });

            modelBuilder.Entity<Departamento>(entity =>
            {
                entity.ToTable("departamentos", t =>
                {
                    t.HasCheckConstraint("CK_departamentos_estado", "estado IN ('activo','inactivo')");
                });
                entity.Property(d => d.Id).HasColumnName("id_departamento");
                entity.Property(d => d.Nombre).HasColumnName("nombre").HasMaxLength(80).IsRequired();
                entity.Property(d => d.CodigoUbigeo).HasColumnName("codigo_ubigeo").HasMaxLength(2).IsRequired();
                entity.Property(d => d.Estado).HasColumnName("estado").HasMaxLength(20).HasDefaultValue("activo").IsRequired();
                entity.HasIndex(d => d.CodigoUbigeo).IsUnique();
                entity.HasIndex(d => d.Nombre).IsUnique();
            });

            modelBuilder.Entity<Provincia>(entity =>
            {
                entity.ToTable("provincias", t =>
                {
                    t.HasCheckConstraint("CK_provincias_estado", "estado IN ('activo','inactivo')");
                });
                entity.Property(p => p.Id).HasColumnName("id_provincia");
                entity.Property(p => p.DepartamentoId).HasColumnName("departamento_id");
                entity.Property(p => p.Nombre).HasColumnName("nombre").HasMaxLength(80).IsRequired();
                entity.Property(p => p.CodigoUbigeo).HasColumnName("codigo_ubigeo").HasMaxLength(4).IsRequired();
                entity.Property(p => p.Estado).HasColumnName("estado").HasMaxLength(20).HasDefaultValue("activo").IsRequired();
                entity.HasOne<Departamento>()
                      .WithMany()
                      .HasForeignKey(p => p.DepartamentoId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(p => new { p.DepartamentoId, p.Nombre }).IsUnique();
                entity.HasIndex(p => p.CodigoUbigeo).IsUnique();
            });

            modelBuilder.Entity<Distrito>(entity =>
            {
                entity.ToTable("distritos", t =>
                {
                    t.HasCheckConstraint("CK_distritos_estado", "estado IN ('activo','inactivo')");
                });
                entity.Property(d => d.Id).HasColumnName("id_distrito");
                entity.Property(d => d.ProvinciaId).HasColumnName("provincia_id");
                entity.Property(d => d.Nombre).HasColumnName("nombre").HasMaxLength(80).IsRequired();
                entity.Property(d => d.CodigoUbigeo).HasColumnName("codigo_ubigeo").HasMaxLength(6).IsRequired();
                entity.Property(d => d.Estado).HasColumnName("estado").HasMaxLength(20).HasDefaultValue("activo").IsRequired();
                entity.HasOne<Provincia>()
                      .WithMany()
                      .HasForeignKey(d => d.ProvinciaId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(d => new { d.ProvinciaId, d.Nombre }).IsUnique();
                entity.HasIndex(d => d.CodigoUbigeo).IsUnique();
            });
            modelBuilder.Entity<Usuario>().ToTable("usuarios");
            modelBuilder.Entity<Aula>().ToTable("aulas");
            modelBuilder.Entity<Inscripcion>().ToTable("inscripciones");
            modelBuilder.Entity<Espacio>().ToTable("espacios");
            modelBuilder.Entity<Dispositivo>().ToTable("dispositivos");
            modelBuilder.Entity<PlantillaReto>().ToTable("plantillas_retos");
            modelBuilder.Entity<RetoAula>().ToTable("retos_aula");
            modelBuilder.Entity<Insignia>().ToTable("insignias");
            modelBuilder.Entity<InsigniaUsuario>().ToTable("insignias_usuario");
            modelBuilder.Entity<Puntos>().ToTable("puntos");
            modelBuilder.Entity<Evento>().ToTable("eventos");
            modelBuilder.Entity<ConsumoAgregado>().ToTable("consumos_agregados");
            modelBuilder.Entity<RecuperacionToken>().ToTable("recuperacion_tokens");
            modelBuilder.Entity<PerfilEstudianteAgg>().ToTable("perfil_estudiante_aggs");
            modelBuilder.Entity<Pregunta>().ToTable("preguntas");
            modelBuilder.Entity<BancoPreguntas>().ToTable("bancos_preguntas");
            modelBuilder.Entity<BancoPregunta>().ToTable("bancos_preguntas_items");
            

            modelBuilder.Entity<Usuario>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<PerfilEstudianteAgg>()
                .HasIndex(a => a.UsuarioId)
                .IsUnique();

            modelBuilder.Entity<Evento>()
                .HasIndex(e => new { e.UsuarioId, e.Tipo, e.CreadoEn });

            modelBuilder.Entity<Puntos>()
                .HasIndex(p => new { p.UsuarioId, p.CreadoEn });

            modelBuilder.Entity<Pregunta>()
                .HasIndex(p => new { p.Tipo, p.Categoria, p.Dificultad, p.Activa });

            modelBuilder.Entity<BancoPregunta>()
                .HasIndex(bp => new { bp.BancoId, bp.PreguntaId })
                .IsUnique();

            
        }
    }
}