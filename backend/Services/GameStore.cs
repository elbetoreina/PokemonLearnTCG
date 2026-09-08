using System.Collections.Concurrent;
using PokemonTCG.API.Game.Engine;
using PokemonTCG.API.Game.Models;

namespace PokemonTCG.API.Services;

public class GameStore
{
    private readonly ConcurrentDictionary<string, GameEngine> _games = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, string> _playerGame = new(StringComparer.OrdinalIgnoreCase);

    public GameEngine Create()
    {
        var id = Guid.NewGuid().ToString("N").Substring(0, 8).ToLowerInvariant();
        var game = new GameEngine(new GameState { Id = id });
        _games[id] = game;
        return game;
    }

    public GameEngine? Get(string gameId)
    {
        if (string.IsNullOrWhiteSpace(gameId)) return null;
        return _games.GetValueOrDefault(gameId.Trim());
    }

    public IEnumerable<string> GetAllActiveRoomIds() => _games.Keys;

    public void MapPlayer(string playerId, string gameId) => _playerGame[playerId] = gameId.Trim();

    public string? GetGameIdForPlayer(string playerId) => _playerGame.GetValueOrDefault(playerId);

    public void Remove(string gameId)
    {
        if (string.IsNullOrWhiteSpace(gameId)) return;
        var clean = gameId.Trim();
        _games.TryRemove(clean, out _);
        foreach (var kv in _playerGame.Where(k => string.Equals(k.Value, clean, StringComparison.OrdinalIgnoreCase)).ToList())
            _playerGame.TryRemove(kv.Key, out _);
    }
}
