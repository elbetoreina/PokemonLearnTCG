using System.Text.RegularExpressions;
using PokemonTCG.API.Game.Models;

namespace PokemonTCG.API.Game.Engine;

public static class TrainerEffect
{
    public static string Apply(GameEngine engine, PlayerState player, GameCard card)
    {
        string name = (card.Name ?? "").Trim();
        string text = (card.Name ?? "") + " "
            + string.Join(" ", card.Rules) + " "
            + string.Join(" ", card.Attacks.Select(a => a.Text)) + " "
            + string.Join(" ", card.Abilities.Select(a => a.Text));

        // 1. Energy Loto
        if (card.Id.StartsWith("imp-energy-loto") || text.Contains("Energy Loto", StringComparison.OrdinalIgnoreCase))
        {
            if (engine.SearchAndDrawCard(player, c => c.Card.Supertype == "Energy", out var foundEnergy))
            {
                return $"Encontraste y tomaste {foundEnergy} a tu mano.";
            }
            return "No se encontraron cartas de Energía en el mazo.";
        }

        // 2. Poké Ball / Great Ball / Ultra Ball
        if (card.Id.StartsWith("cur-pokeball") || text.Contains("Poké Ball", StringComparison.OrdinalIgnoreCase) || text.Contains("Poke Ball", StringComparison.OrdinalIgnoreCase))
        {
            if (engine.SearchAndDrawCard(player, c => c.Card.Supertype == "Pokémon", out var foundPokemon))
            {
                return $"Buscaste en el mazo y encontraste a {foundPokemon}.";
            }
            return "No se encontraron cartas de Pokémon en el mazo.";
        }

        // 3. Professor's Research / Discard hand and draw 7
        if (text.Contains("Professor's Research", StringComparison.OrdinalIgnoreCase) || text.Contains("Discard your hand and draw 7", StringComparison.OrdinalIgnoreCase))
        {
            engine.DiscardHandAndDraw(player, 7);
            return "Descartas tu mano y robas 7 cartas nuevas.";
        }

        // 4. Switch
        if (text.Contains("switch", StringComparison.OrdinalIgnoreCase))
        {
            int benchIdx = -1;
            for (int i = 0; i < player.Bench.Count; i++)
            {
                if (player.Bench[i] != null) { benchIdx = i; break; }
            }
            if (benchIdx >= 0 && player.Bench[benchIdx] != null)
            {
                engine.SwapActiveWithBench(player, benchIdx);
                return "Intercambias tu Pokémon Activo con tu banca.";
            }
            return "No tienes Pokémon en la banca para intercambiar.";
        }

        // 5. Potion / Heal
        var healMatch = Regex.Match(text, @"heal\s+(\d+)", RegexOptions.IgnoreCase);
        if (healMatch.Success && player.Active != null)
        {
            int n = int.Parse(healMatch.Groups[1].Value);
            engine.Heal(player.Active, n / 10);
            return $"Curas {n} de daño a {player.Active.Card.Name}.";
        }

        // 6. Generic draw
        var drawMatch = Regex.Match(text, @"draw\s+(\d+)", RegexOptions.IgnoreCase);
        if (drawMatch.Success)
        {
            int n = int.Parse(drawMatch.Groups[1].Value);
            engine.DrawForPlayer(player, n);
            return $"Robas {n} carta(s).";
        }

        return "Efecto de entrenador aplicado.";
    }
}
