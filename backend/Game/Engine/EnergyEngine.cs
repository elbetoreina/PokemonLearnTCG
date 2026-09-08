using System.Text.RegularExpressions;
using PokemonTCG.API.Game.Models;

namespace PokemonTCG.API.Game.Engine;

public static class EnergyEngine
{
    private static readonly string[] Types =
        { "Fire", "Water", "Grass", "Lightning", "Psychic", "Fighting", "Darkness", "Metal", "Fairy", "Colorless", "Dragon" };

    public static List<string> EnergyProvides(GameCard card)
    {
        if (card.EnergyProvides.Count > 0) return card.EnergyProvides;
        if (card.Supertype != "Energy") return new List<string>();
        foreach (var t in Types)
        {
            if (card.Name.Contains(t, StringComparison.OrdinalIgnoreCase))
                return new List<string> { t };
        }
        return new List<string> { "Colorless" };
    }

    public static bool CanPayCost(List<string> cost, List<string> attached)
    {
        if (cost == null || cost.Count == 0) return true;
        var pool = new List<string>(attached ?? new List<string>());

        // 1. Pay specific typed costs first (Fire, Water, Lightning, etc.)
        foreach (var c in cost.Where(x => !string.Equals(x, "Colorless", StringComparison.OrdinalIgnoreCase)))
        {
            int idx = pool.FindIndex(e => string.Equals(e, c, StringComparison.OrdinalIgnoreCase));
            if (idx < 0) return false;
            pool.RemoveAt(idx);
        }

        // 2. Pay Colorless / Any-energy costs with the remaining energy
        int colorlessCount = cost.Count(x => string.Equals(x, "Colorless", StringComparison.OrdinalIgnoreCase));
        if (pool.Count < colorlessCount) return false;

        return true;
    }

    public static int ParseDamage(string damage)
    {
        if (string.IsNullOrWhiteSpace(damage)) return 0;
        var m = Regex.Match(damage, @"\d+");
        return m.Success ? int.Parse(m.Value) : 0;
    }
}
