using PokemonTCG.API.Game.Models;

namespace PokemonTCG.API.Services;

public class CardSearchResult
{
    public List<GameCard> Cards { get; set; } = new();
    public int TotalCount { get; set; }
}

public interface ICardService
{
    Task<CardSearchResult> SearchAsync(string? query, int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<GameCard?> GetAsync(string id, CancellationToken ct = default);
    List<GameCard> GetFallback();
    Task<List<GameCard>> GetStarterDeckAsync(CancellationToken ct = default);
}
