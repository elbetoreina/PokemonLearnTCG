using PokemonTCG.API.Game.Engine;
using PokemonTCG.API.Game.Models;

namespace PokemonTCG.API.Services;

public static class ViewMapper
{
    public static GameView Build(GameState game, string playerId)
    {
        var view = new GameView
        {
            Id = game.Id,
            Phase = game.Phase,
            TurnNumber = game.TurnNumber,
            FirstTurn = game.FirstTurn,
            CurrentTurnPlayerId = game.CurrentTurnPlayerId,
            GoingFirstPlayerId = game.GoingFirstPlayerId,
            WinnerId = game.WinnerId,
            WinnerReason = game.WinnerReason,
            Log = new List<string>(game.Log),
            LastHint = game.LastHint,
            Me = BuildPlayer(game.Player1.PlayerId == playerId ? game.Player1 : game.Player2, true),
            Opponent = BuildPlayer(game.Player1.PlayerId == playerId ? game.Player2 : game.Player1, false),
            LegalMoves = AssistantEngine.LegalMoves(game, playerId),
            Suggestions = AssistantEngine.Suggestions(game, playerId)
        };
        return view;
    }

    private static PlayerView BuildPlayer(PlayerState p, bool isSelf)
    {
        var view = new PlayerView
        {
            PlayerId = p.PlayerId,
            Name = p.Name,
            IsSelf = isSelf,
            DeckCount = p.Deck.Count,
            HandCount = p.Hand.Count,
            Hand = isSelf ? p.Hand.Select(ToView).ToList() : null,
            Active = p.Active == null ? null : ToView(p.Active),
            Bench = p.Bench.Select(b => b == null ? null : ToView(b)).ToList(),
            DiscardCount = p.DiscardPile.Count,
            PrizesCount = p.Prizes.Count,
            Stadium = p.Stadium == null ? null : ToView(p.Stadium),
            EnergyAttachedThisTurn = p.EnergyAttachedThisTurn,
            SupporterPlayedThisTurn = p.SupporterPlayedThisTurn,
            RetreatedThisTurn = p.RetreatedThisTurn,
            AttackedThisTurn = p.AttackedThisTurn
        };
        return view;
    }

    private static CardView ToView(CardInstance c)
    {
        return new CardView
        {
            InstanceId = c.InstanceId,
            Id = c.Card.Id,
            Name = c.Card.Name,
            Supertype = c.Card.Supertype,
            Subtypes = c.Card.Subtypes,
            Hp = c.Card.Hp,
            Types = c.Card.Types,
            EvolvesFrom = c.Card.EvolvesFrom,
            Attacks = c.Card.Attacks,
            Abilities = c.Card.Abilities,
            Rules = c.Card.Rules,
            Weaknesses = c.Card.Weaknesses,
            Resistances = c.Card.Resistances,
            RetreatCost = c.Card.RetreatCost,
            EnergyProvides = c.Card.EnergyProvides,
            ImageSmall = c.Card.ImageSmall,
            ImageLarge = c.Card.ImageLarge,
            SetName = c.Card.SetName,
            Number = c.Card.Number,
            DamageCounters = c.DamageCounters,
            RemainingHp = c.RemainingHp,
            AttachedEnergy = c.AttachedEnergy,
            Conditions = c.Conditions,
            TurnsInPlay = c.TurnsInPlay
        };
    }
}
