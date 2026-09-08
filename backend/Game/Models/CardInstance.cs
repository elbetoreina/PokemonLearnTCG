namespace PokemonTCG.API.Game.Models;

public enum StatusCondition
{
    Poisoned,
    Burned,
    Asleep,
    Confused,
    Paralyzed
}

public class CardInstance
{
    public string InstanceId { get; set; } = Guid.NewGuid().ToString("N");
    public GameCard Card { get; set; } = null!;
    public int DamageCounters { get; set; }
    public List<string> AttachedEnergy { get; set; } = new();
    public List<StatusCondition> Conditions { get; set; } = new();
    public int TurnsInPlay { get; set; }
    public string? EvolvedFromInstanceId { get; set; }
    public List<string> EvolvedToInstanceIds { get; set; } = new();

    public int RemainingHp => (Card.Hp ?? 0) - DamageCounters;
    public bool IsKnockedOut => Card.Supertype == "Pokémon" && RemainingHp <= 0;
}
