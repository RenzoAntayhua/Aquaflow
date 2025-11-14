using AquaFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AquaFlow.Api.Data
{
    public static class DataSeeder
    {
        public static async Task SeedAsync(AquaFlowDbContext db)
        {
            // Plantillas de reto por reducción porcentual
            if (!await db.PlantillasRetos.AnyAsync())
            {
                db.PlantillasRetos.Add(new PlantillaReto
                {
                    Alcance = "aula",
                    Codigo = "reduccion_semana",
                    Nombre = "Reducción semanal",
                    Descripcion = "Reducir el consumo semanal respecto a la línea base",
                    TipoObjetivo = "reduccion_porcentual",
                    ParametrosDefault = "{\"reduccion_porcentual\":15}",
                    ParametrosRango = "{\"reduccion_porcentual\":{\"min\":10,\"max\":30}}",
                    PuntosRecompensa = 100,
                    Activa = true
                });
            }

            if (!await db.PlantillasRetos.AnyAsync(p => p.Codigo == "trivia_quiz"))
            {
                db.PlantillasRetos.Add(new PlantillaReto
                {
                    Alcance = "aula",
                    Codigo = "trivia_quiz",
                    Nombre = "Trivia de Agua",
                    Descripcion = "Preguntas con tiempo, puntos por rapidez y rachas",
                    TipoObjetivo = "trivia_quiz",
                    ParametrosDefault = "{\"question_count\":10,\"time_per_question\":30}",
                    ParametrosRango = "{\"question_count\":{\"min\":5,\"max\":20},\"time_per_question\":{\"min\":10,\"max\":60}}",
                    PuntosRecompensa = 50,
                    Activa = true
                });
            }

            if (!await db.PlantillasRetos.AnyAsync(p => p.Codigo == "verdadero_falso"))
            {
                db.PlantillasRetos.Add(new PlantillaReto
                {
                    Alcance = "aula",
                    Codigo = "verdadero_falso",
                    Nombre = "Verdadero o Falso",
                    Descripcion = "Puntos por respuestas correctas y explicación educativa",
                    TipoObjetivo = "verdadero_falso",
                    ParametrosDefault = "{\"question_count\":10}",
                    ParametrosRango = "{\"question_count\":{\"min\":5,\"max\":20}}",
                    PuntosRecompensa = 40,
                    Activa = true
                });
            }

            if (!await db.PlantillasRetos.AnyAsync(p => p.Codigo == "memory_pairs"))
            {
                db.PlantillasRetos.Add(new PlantillaReto
                {
                    Alcance = "aula",
                    Codigo = "memory_pairs",
                    Nombre = "Memory de Agua",
                    Descripcion = "Formar parejas con imágenes relacionadas al agua",
                    TipoObjetivo = "memory_pairs",
                    ParametrosDefault = "{\"pairs_count\":8}",
                    ParametrosRango = "{\"pairs_count\":{\"min\":6,\"max\":12}}",
                    PuntosRecompensa = 60,
                    Activa = true
                });
            }

            await db.SaveChangesAsync();
        }
    }
}