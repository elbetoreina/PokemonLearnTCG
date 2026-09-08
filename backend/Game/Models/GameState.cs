namespace PokemonTCG.API.Game.Models;

public class GameState
{
    public string Id { get; set; } = "";
    public PlayerState Player1 { get; set; } = new();
    public PlayerState Player2 { get; set; } = new();
    public string CurrentTurnPlayerId { get; set; } = "";
    public string GoingFirstPlayerId { get; set; } = "";
    public int TurnNumber { get; set; }
    public string Phase { get; set; } = GamePhase.WaitingForOpponent;
    public bool FirstTurn { get; set; }
    public string? WinnerId { get; set; }
    public string? WinnerReason { get; set; }
    public List<string> Log { get; set; } = new();
    public string? LastHint { get; set; }
    public Dictionary<string, int> PendingExtraDraws { get; set; } = new();
}

public static class GamePhase
{
    public const string WaitingForOpponent = "WaitingForOpponent";
    public const string Setup = "Setup";
    public const string ActiveTurn = "ActiveTurn";
    public const string BetweenTurns = "BetweenTurns";
    public const string GameOver = "GameOver";
}
