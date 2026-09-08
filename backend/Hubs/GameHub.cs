using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using PokemonTCG.API.Game.Engine;
using PokemonTCG.API.Game.Models;
using PokemonTCG.API.Services;

namespace PokemonTCG.API.Hubs;

public class GameHub : Hub
{
    private readonly GameStore _store;
    private readonly ICardService _cards;
    private readonly IHubContext<GameHub> _hubContext;
    private readonly ILogger<GameHub> _logger;
    private static readonly ConcurrentQueue<(string ConnectionId, string Name)> _queue = new();

    private static readonly (string Id, string Name)[] _professors = new[]
    {
        ("bot-oak", "Profesor Oak"),
        ("bot-elm", "Profesor Elm"),
        ("bot-birch", "Profesor Birch"),
        ("bot-rowan", "Profesor Rowan"),
        ("bot-juniper", "Profesora Juniper"),
        ("bot-sycamore", "Profesor Sycamore"),
        ("bot-kukui", "Profesor Kukui"),
        ("bot-magnolia", "Profesora Magnolia"),
        ("bot-sada", "Profesora Sada"),
        ("bot-turo", "Profesor Turo"),
        ("bot-sonia", "Profesora Sonia"),
        ("bot-laventon", "Profesor Laventon")
    };

    public GameHub(GameStore store, ICardService cards, IHubContext<GameHub> hubContext, ILogger<GameHub> logger)
    {
        _store = store;
        _cards = cards;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task CreateGame(string playerName)
    {
        var engine = _store.Create();
        _logger.LogInformation("CreateGame: New room '{GameId}' created by '{PlayerName}' ({ConnId})",
            engine.Game.Id, playerName, Context.ConnectionId);
        await JoinAsPlayer(engine, playerName);
        await Broadcast(engine);
    }

    public async Task JoinGame(string gameId, string playerName)
    {
        if (string.IsNullOrWhiteSpace(gameId))
        {
            await Clients.Caller.SendAsync("Error", "Por favor ingresa un código de sala válido.");
            return;
        }

        var cleanId = gameId.Trim();
        if (cleanId.StartsWith("sala", StringComparison.OrdinalIgnoreCase))
        {
            cleanId = cleanId.Substring(4).TrimStart(':', ' ', '#', '-');
        }
        cleanId = cleanId.Trim().ToLowerInvariant();

        var engine = _store.Get(cleanId);
        if (engine == null)
        {
            _logger.LogWarning("JoinGame failed: Room '{GameId}' not found. Active rooms in store: [{ActiveRooms}]",
                cleanId, string.Join(", ", _store.GetAllActiveRoomIds()));
            await Clients.Caller.SendAsync("Error", $"No se encontró la sala '{cleanId}'. Verifica que el código sea idéntico al que tiene el anfitrión en pantalla.");
            return;
        }

        _logger.LogInformation("JoinGame: '{PlayerName}' ({ConnId}) joining room '{GameId}'",
            playerName, Context.ConnectionId, cleanId);
        await JoinAsPlayer(engine, playerName);
        await Broadcast(engine);
    }

    public async Task QuickMatch(string playerName)
    {
        while (_queue.TryDequeue(out var other))
        {
            // Avoid pairing connection with itself
            if (other.ConnectionId == Context.ConnectionId) continue;

            var engine = _store.Create();
            await AddPlayerToGroupAndMap(engine, other.ConnectionId, other.Name);
            await AddPlayerToGroupAndMap(engine, Context.ConnectionId, playerName);
            await Broadcast(engine);
            return;
        }

        _queue.Enqueue((Context.ConnectionId, playerName));
        await Clients.Caller.SendAsync("Waiting", "Buscando rival...");
    }

    public async Task PracticeGame(string playerName)
    {
        var engine = _store.Create();
        var userDeck = await _cards.GetStarterDeckAsync();
        var botDeck = await _cards.GetStarterDeckAsync();

        await Groups.AddToGroupAsync(Context.ConnectionId, engine.Game.Id);
        _store.MapPlayer(Context.ConnectionId, engine.Game.Id);

        engine.AddPlayer(Context.ConnectionId, playerName, userDeck);
        var prof = _professors[Random.Shared.Next(_professors.Length)];
        engine.AddPlayer(prof.Id, prof.Name, botDeck);
        engine.TryStartSetup();

        await Broadcast(engine);
    }

    private async Task JoinAsPlayer(GameEngine engine, string playerName)
    {
        var deck = await _cards.GetStarterDeckAsync();
        await AddPlayerToGroupAndMap(engine, Context.ConnectionId, playerName, deck);
    }

    private async Task AddPlayerToGroupAndMap(GameEngine engine, string connectionId, string playerName, List<GameCard>? deck = null)
    {
        await Groups.AddToGroupAsync(connectionId, engine.Game.Id);
        _store.MapPlayer(connectionId, engine.Game.Id);
        if (deck == null) deck = await _cards.GetStarterDeckAsync();
        engine.AddPlayer(connectionId, playerName, deck);
        engine.TryStartSetup();
    }

    public async Task Action(GameActionRequest req)
    {
        var gameId = _store.GetGameIdForPlayer(Context.ConnectionId);
        var engine = gameId == null ? null : _store.Get(gameId);
        if (engine == null)
        {
            await Clients.Caller.SendAsync("Error", "No estás en una partida.");
            return;
        }

        var outcome = Execute(engine, Context.ConnectionId, req);
        if (!outcome.Success)
        {
            await Clients.Caller.SendAsync("ActionRejected", outcome.Message);
            await Clients.Caller.SendAsync("GameState", ViewMapper.Build(engine.Game, Context.ConnectionId));
            return;
        }

        await Broadcast(engine);
        if (engine.Game.Phase == GamePhase.GameOver)
            await _hubContext.Clients.Group(engine.Game.Id).SendAsync("GameOver", engine.Game.WinnerId, engine.Game.WinnerReason);
    }

    public async Task GetState()
    {
        var gameId = _store.GetGameIdForPlayer(Context.ConnectionId);
        var engine = gameId == null ? null : _store.Get(gameId);
        if (engine == null) return;

        // If game is already over, clean it up and don't resurrect it
        if (engine.Game.Phase == GamePhase.GameOver)
        {
            if (gameId != null) _store.Remove(gameId);
            return;
        }

        await Clients.Caller.SendAsync("GameState", ViewMapper.Build(engine.Game, Context.ConnectionId));
    }

    public async Task LeaveGame()
    {
        var gameId = _store.GetGameIdForPlayer(Context.ConnectionId);
        var engine = gameId == null ? null : _store.Get(gameId);
        if (engine != null && gameId != null)
        {
            if (engine.Game.Phase != GamePhase.GameOver && engine.Game.Phase != GamePhase.WaitingForOpponent)
            {
                var opponent = engine.GetOpponent(Context.ConnectionId);
                if (opponent != null && !opponent.PlayerId.StartsWith("bot-"))
                {
                    engine.Game.WinnerId = opponent.PlayerId;
                    engine.Game.WinnerReason = "disconnect";
                    engine.Game.Phase = GamePhase.GameOver;
                    await Broadcast(engine);
                }
            }
            _store.Remove(gameId);
        }
    }

    public async Task Logout()
    {
        var gameId = _store.GetGameIdForPlayer(Context.ConnectionId);
        if (!string.IsNullOrEmpty(gameId))
        {
            var engine = _store.Get(gameId);
            if (engine != null && engine.Game.Phase != GamePhase.GameOver && engine.Game.Phase != GamePhase.WaitingForOpponent)
            {
                var opponent = engine.GetOpponent(Context.ConnectionId);
                if (opponent != null && !opponent.PlayerId.StartsWith("bot-"))
                {
                    engine.Game.WinnerId = opponent.PlayerId;
                    engine.Game.WinnerReason = "disconnect";
                    engine.Game.Phase = GamePhase.GameOver;
                    await Broadcast(engine);
                }
            }
            _store.Remove(gameId);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Clean from waiting queue if disconnected
        var remaining = _queue.Where(q => q.ConnectionId != Context.ConnectionId).ToList();
        while (_queue.TryDequeue(out _)) { }
        foreach (var item in remaining) _queue.Enqueue(item);

        var gameId = _store.GetGameIdForPlayer(Context.ConnectionId);
        var engine = gameId == null ? null : _store.Get(gameId);
        if (engine != null && gameId != null)
        {
            var opponent = engine.GetOpponent(Context.ConnectionId);
            if (opponent == null || opponent.PlayerId.StartsWith("bot-"))
            {
                _store.Remove(gameId);
            }
            else if (engine.Game.Phase == GamePhase.ActiveTurn || engine.Game.Phase == GamePhase.BetweenTurns)
            {
                engine.Game.WinnerId = opponent.PlayerId;
                engine.Game.WinnerReason = "disconnect";
                engine.Game.Phase = GamePhase.GameOver;
                await Broadcast(engine);
                _store.Remove(gameId);
            }
            else if (engine.Game.Phase == GamePhase.GameOver)
            {
                _store.Remove(gameId);
            }
        }
        await base.OnDisconnectedAsync(exception);
    }

    private ActionOutcome Execute(GameEngine engine, string playerId, GameActionRequest req)
    {
        var type = (req.Type ?? "").Trim().ToLowerInvariant();
        return type switch
        {
            "play" or "playbasictobench" => engine.PlayBasicToBench(playerId, req.HandInstanceId ?? ""),
            "evolve" => engine.Evolve(playerId, req.HandInstanceId ?? "", req.TargetInstanceId ?? ""),
            "attach" or "attachenergy" => engine.AttachEnergy(playerId, req.HandInstanceId ?? "", req.TargetInstanceId ?? ""),
            "retreat" => engine.Retreat(playerId, req.BenchIndex ?? -1),
            "attack" => engine.Attack(playerId, req.AttackIndex ?? -1),
            "trainer" or "playitem" or "playsupporter" => engine.PlayTrainer(playerId, req.HandInstanceId ?? ""),
            "ability" => engine.UseAbility(playerId, req.TargetInstanceId ?? "", req.AbilityIndex ?? -1),
            "pass" or "endturn" => engine.Pass(playerId),
            _ => ActionOutcome.Fail($"Acción desconocida ({req.Type}).")
        };
    }

    private async Task Broadcast(GameEngine engine)
    {
        var game = engine.Game;
        var conns = new[] { game.Player1.PlayerId, game.Player2.PlayerId };
        foreach (var c in conns)
        {
            if (string.IsNullOrEmpty(c) || c.StartsWith("bot-")) continue;
            try
            {
                await _hubContext.Clients.Client(c).SendAsync("GameState", ViewMapper.Build(game, c));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error enviando GameState al cliente {Client}", c);
            }
        }

        if (game.Phase == GamePhase.ActiveTurn && game.CurrentTurnPlayerId.StartsWith("bot-"))
        {
            _ = Task.Run(async () => await RunBotTurn(engine));
        }
    }

    private async Task RunBotTurn(GameEngine engine)
    {
        try
        {
            await Task.Delay(1200);
            string botId = engine.Game.CurrentTurnPlayerId;
            if (!botId.StartsWith("bot-") || engine.Game.Phase != GamePhase.ActiveTurn) return;

            var bot = engine.GetPlayer(botId);
            if (bot == null) return;

            // 1. Play basic pokemon to bench
            var basics = bot.Hand.Where(c => c.Card.Supertype == "Pokémon" && c.Card.IsBasic).ToList();
            foreach (var b in basics)
            {
                if (bot.Bench.Count(x => x != null) >= 5) break;
                engine.PlayBasicToBench(botId, b.InstanceId);
            }

            // 2. Evolve if possible
            var evolutions = bot.Hand.Where(c => c.Card.Supertype == "Pokémon" && (c.Card.IsStage1 || c.Card.IsStage2)).ToList();
            foreach (var evo in evolutions)
            {
                if (engine.Game.FirstTurn || bot.EvolvedThisTurn) break;
                var target = engine.PlayerPokemon(bot).FirstOrDefault(p =>
                    p.TurnsInPlay >= 1 && string.Equals(p.Card.Name, evo.Card.EvolvesFrom, StringComparison.OrdinalIgnoreCase));
                if (target != null)
                {
                    engine.Evolve(botId, evo.InstanceId, target.InstanceId);
                }
            }

            // 3. Play items / supporters if possible
            var trainers = bot.Hand.Where(c => c.Card.Supertype == "Trainer").ToList();
            foreach (var tr in trainers)
            {
                if (tr.Card.IsSupporter && bot.SupporterPlayedThisTurn) continue;
                engine.PlayTrainer(botId, tr.InstanceId);
            }

            // 4. Attach energy if possible (prefer active, then bench)
            var energy = bot.Hand.FirstOrDefault(c => c.Card.Supertype == "Energy");
            if (energy != null && !bot.EnergyAttachedThisTurn)
            {
                var target = bot.Active ?? bot.Bench.FirstOrDefault(b => b != null);
                if (target != null)
                {
                    engine.AttachEnergy(botId, energy.InstanceId, target.InstanceId);
                }
            }

            // 5. Attack or pass
            bool attacked = false;
            if (bot.Active != null && !bot.Active.Conditions.Contains(StatusCondition.Asleep) && !bot.Active.Conditions.Contains(StatusCondition.Paralyzed))
            {
                // Try attacks in descending order
                for (int i = bot.Active.Card.Attacks.Count - 1; i >= 0; i--)
                {
                    var atk = bot.Active.Card.Attacks[i];
                    if (EnergyEngine.CanPayCost(atk.Cost, bot.Active.AttachedEnergy))
                    {
                        var res = engine.Attack(botId, i);
                        if (res.Success)
                        {
                            attacked = true;
                            break;
                        }
                    }
                }
            }

            if (!attacked)
            {
                engine.Pass(botId);
            }

            await Broadcast(engine);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Excepción controlada en RunBotTurn");
            try
            {
                if (engine.Game.CurrentTurnPlayerId.StartsWith("bot-") && engine.Game.Phase == GamePhase.ActiveTurn)
                {
                    engine.Pass(engine.Game.CurrentTurnPlayerId);
                    await Broadcast(engine);
                }
            }
            catch { }
        }
    }
}
