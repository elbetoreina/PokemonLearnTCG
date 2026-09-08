namespace PokemonTCG.API.Game.Models;

public class LegalMove
{
    public string Type { get; set; } = "";
    public string Label { get; set; } = "";
    public string Detail { get; set; } = "";
    public string? HandInstanceId { get; set; }
    public string? TargetInstanceId { get; set; }
    public int? BenchIndex { get; set; }
    public int? AttackIndex { get; set; }
    public int? AbilityIndex { get; set; }
}

public class GameActionRequest
{
    public string Type { get; set; } = "";
    public string? HandInstanceId { get; set; }
    public string? TargetInstanceId { get; set; }
    public int? BenchIndex { get; set; }
    public int? AttackIndex { get; set; }
    public int? AbilityIndex { get; set; }
}
