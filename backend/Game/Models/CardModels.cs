namespace PokemonTCG.API.Game.Models;

public class GameCard
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Supertype { get; set; } = "";
    public List<string> Subtypes { get; set; } = new();
    public int? Hp { get; set; }
    public List<string> Types { get; set; } = new();
    public string? EvolvesFrom { get; set; }
    public List<Attack> Attacks { get; set; } = new();
    public List<Ability> Abilities { get; set; } = new();
    public List<string> Rules { get; set; } = new();
    public List<TypeValue> Weaknesses { get; set; } = new();
    public List<TypeValue> Resistances { get; set; } = new();
    public List<string> RetreatCost { get; set; } = new();
    public List<string> EnergyProvides { get; set; } = new();
    public string? ImageSmall { get; set; }
    public string? ImageLarge { get; set; }
    public string? SetName { get; set; }
    public string? Number { get; set; }

    public bool IsBasic => Subtypes.Contains("Basic");
    public bool IsStage1 => Subtypes.Contains("Stage 1");
    public bool IsStage2 => Subtypes.Contains("Stage 2");
    public bool IsItem => Subtypes.Contains("Item");
    public bool IsSupporter => Subtypes.Contains("Supporter");
    public bool IsStadium => Subtypes.Contains("Stadium");
    public bool IsSpecialEnergy => Subtypes.Contains("Special");
    public bool IsBasicEnergy => Supertype == "Energy" && !IsSpecialEnergy;
}

public class Attack
{
    public string Name { get; set; } = "";
    public List<string> Cost { get; set; } = new();
    public string Damage { get; set; } = "";
    public string Text { get; set; } = "";
}

public class Ability
{
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public string Text { get; set; } = "";
}

public class TypeValue
{
    public string Type { get; set; } = "";
    public string Value { get; set; } = "";
}
