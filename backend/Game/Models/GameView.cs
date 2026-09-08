namespace PokemonTCG.API.Game.Models;

public class PlayerView
{
    public string PlayerId { get; set; } = "";
    public string Name { get; set; } = "";
    public bool IsSelf { get; set; }
    public int DeckCount { get; set; }
    public int HandCount { get; set; }
    public List<CardView>? Hand { get; set; }
    public CardView? Active { get; set; }
    public List<CardView?> Bench { get; set; } = new();
    public int DiscardCount { get; set; }
    public int PrizesCount { get; set; }
    public CardView? Stadium { get; set; }
    public bool EnergyAttachedThisTurn { get; set; }
    public bool SupporterPlayedThisTurn { get; set; }
    public bool RetreatedThisTurn { get; set; }
    public bool AttackedThisTurn { get; set; }
}

public class CardView
{
    public string InstanceId { get; set; } = "";
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

    public int DamageCounters { get; set; }
    public int RemainingHp { get; set; }
    public List<string> AttachedEnergy { get; set; } = new();
    public List<StatusCondition> Conditions { get; set; } = new();
    public int TurnsInPlay { get; set; }
}

public class GameView
{
    public string Id { get; set; } = "";
    public string Phase { get; set; } = "";
    public int TurnNumber { get; set; }
    public bool FirstTurn { get; set; }
    public string CurrentTurnPlayerId { get; set; } = "";
    public string GoingFirstPlayerId { get; set; } = "";
    public string? WinnerId { get; set; }
    public string? WinnerReason { get; set; }
    public List<string> Log { get; set; } = new();
    public string? LastHint { get; set; }
    public PlayerView? Me { get; set; }
    public PlayerView? Opponent { get; set; }
    public List<LegalMove> LegalMoves { get; set; } = new();
    public List<string> Suggestions { get; set; } = new();
}
