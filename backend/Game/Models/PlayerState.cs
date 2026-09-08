namespace PokemonTCG.API.Game.Models;

public class PlayerState
{
    public string PlayerId { get; set; } = "";
    public string Name { get; set; } = "";
    public List<CardInstance> Deck { get; set; } = new();
    public List<CardInstance> Hand { get; set; } = new();
    public CardInstance? Active { get; set; }
    public List<CardInstance?> Bench { get; set; } = new();
    public List<CardInstance> DiscardPile { get; set; } = new();
    public List<CardInstance> Prizes { get; set; } = new();
    public CardInstance? Stadium { get; set; }

    public bool EnergyAttachedThisTurn { get; set; }
    public bool SupporterPlayedThisTurn { get; set; }
    public bool RetreatedThisTurn { get; set; }
    public bool AttackedThisTurn { get; set; }
    public bool EvolvedThisTurn { get; set; }
}
