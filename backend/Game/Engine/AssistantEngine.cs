using PokemonTCG.API.Game.Models;

namespace PokemonTCG.API.Game.Engine;

public static class AssistantEngine
{
    public static List<LegalMove> LegalMoves(GameState game, string playerId)
    {
        var moves = new List<LegalMove>();
        if (game.Phase != GamePhase.ActiveTurn || game.CurrentTurnPlayerId != playerId) return moves;

        var player = playerId == game.Player1.PlayerId ? game.Player1 : game.Player2;
        var pokemon = PlayerPokemon(player).ToList();
        bool benchFull = player.Bench.Count(b => b != null) >= 5;

        foreach (var c in player.Hand)
        {
            if (c.Card.Supertype == "Pokémon" && c.Card.IsBasic && !benchFull)
            {
                moves.Add(new LegalMove
                {
                    Type = "play",
                    Label = $"Jugar {c.Card.Name} al banco",
                    Detail = "Pokémon Básico al banco",
                    HandInstanceId = c.InstanceId
                });
            }

            if (c.Card.Supertype == "Pokémon" && (c.Card.IsStage1 || c.Card.IsStage2) && !game.FirstTurn && !player.EvolvedThisTurn)
            {
                foreach (var target in pokemon)
                {
                    if (target.TurnsInPlay >= 1 &&
                        string.Equals(target.Card.Name, c.Card.EvolvesFrom, StringComparison.OrdinalIgnoreCase))
                    {
                        moves.Add(new LegalMove
                        {
                            Type = "evolve",
                            Label = $"Evolucionar {target.Card.Name} → {c.Card.Name}",
                            Detail = c.Card.IsStage2 ? "Evolución Etapa 2" : "Evolución Etapa 1",
                            HandInstanceId = c.InstanceId,
                            TargetInstanceId = target.InstanceId
                        });
                    }
                }
            }

            if (c.Card.Supertype == "Energy" && !player.EnergyAttachedThisTurn)
            {
                foreach (var target in pokemon)
                {
                    moves.Add(new LegalMove
                    {
                        Type = "attach",
                        Label = $"Adjuntar energía a {target.Card.Name}",
                        Detail = string.Join(", ", EnergyEngine.EnergyProvides(c.Card)),
                        HandInstanceId = c.InstanceId,
                        TargetInstanceId = target.InstanceId
                    });
                }
            }

            if (c.Card.Supertype == "Trainer")
            {
                if (c.Card.IsSupporter && player.SupporterPlayedThisTurn) continue;
                moves.Add(new LegalMove
                {
                    Type = "trainer",
                    Label = $"Jugar {c.Card.Name}",
                    Detail = c.Card.Subtypes.Count > 0 ? string.Join("/", c.Card.Subtypes) : "Entrenador",
                    HandInstanceId = c.InstanceId
                });
            }
        }

        // retreat
        if (!player.RetreatedThisTurn && player.Active != null &&
            !player.Active.Conditions.Contains(StatusCondition.Asleep) &&
            !player.Active.Conditions.Contains(StatusCondition.Paralyzed))
        {
            int cost = player.Active.Card.RetreatCost.Count;
            bool canPay = player.Active.AttachedEnergy.Count >= cost;
            if (canPay)
            {
                for (int i = 0; i < player.Bench.Count; i++)
                {
                    if (player.Bench[i] != null)
                    {
                        moves.Add(new LegalMove
                        {
                            Type = "retreat",
                            Label = $"Retirar {player.Active.Card.Name} y promover a {player.Bench[i]!.Card.Name}",
                            Detail = $"Cuesta {cost} energía",
                            BenchIndex = i
                        });
                    }
                }
            }
        }

        // attack
        if (!player.AttackedThisTurn && player.Active != null &&
            !player.Active.Conditions.Contains(StatusCondition.Asleep) &&
            !player.Active.Conditions.Contains(StatusCondition.Paralyzed))
        {
            for (int i = 0; i < player.Active.Card.Attacks.Count; i++)
            {
                var a = player.Active.Card.Attacks[i];
                bool affordable = EnergyEngine.CanPayCost(a.Cost, player.Active.AttachedEnergy);
                if (!affordable) continue;
                moves.Add(new LegalMove
                {
                    Type = "attack",
                    Label = $"Atacar con {a.Name} ({a.Damage} dmg)",
                    Detail = "Energía suficiente",
                    AttackIndex = i
                });
            }
        }

        // abilities
        foreach (var p in pokemon)
        {
            for (int i = 0; i < p.Card.Abilities.Count; i++)
            {
                moves.Add(new LegalMove
                {
                    Type = "ability",
                    Label = $"Usar habilidad {p.Card.Abilities[i].Name}",
                    Detail = p.Card.Name,
                    TargetInstanceId = p.InstanceId,
                    AbilityIndex = i
                });
            }
        }

        // pass
        moves.Add(new LegalMove
        {
            Type = "pass",
            Label = "Terminar turno",
            Detail = "Pasa el turno al rival"
        });

        return moves;
    }

    public static List<string> Suggestions(GameState game, string playerId)
    {
        var tips = new List<string>();
        if (game.Phase != GamePhase.ActiveTurn || game.CurrentTurnPlayerId != playerId) return tips;

        var player = playerId == game.Player1.PlayerId ? game.Player1 : game.Player2;

        if (player.Active == null)
        {
            tips.Add("No tienes Pokémon Activo. Promueve uno desde tu banco.");
            return tips;
        }

        bool canAttack = !player.AttackedThisTurn &&
            player.Active.Card.Attacks.Any(a => EnergyEngine.CanPayCost(a.Cost, player.Active.AttachedEnergy));

        if (canAttack)
        {
            var best = player.Active.Card.Attacks
                .Where(a => EnergyEngine.CanPayCost(a.Cost, player.Active.AttachedEnergy))
                .OrderByDescending(a => EnergyEngine.ParseDamage(a.Damage))
                .First();
            tips.Add($"¡Buen momento para atacar! Usa \"{best.Name}\" de {player.Active.Card.Name}.");
        }
        else if (!player.EnergyAttachedThisTurn && player.Hand.Any(c => c.Card.Supertype == "Energy"))
        {
            tips.Add($"Adjunta una Energía a {player.Active.Card.Name} para poder atacar.");
        }

        var evolvable = player.Hand.Any(c => c.Card.Supertype == "Pokémon" && (c.Card.IsStage1 || c.Card.IsStage2) &&
            PlayerPokemon(player).Any(p => p.TurnsInPlay >= 1 &&
                string.Equals(p.Card.Name, c.Card.EvolvesFrom, StringComparison.OrdinalIgnoreCase)));
        if (evolvable && !game.FirstTurn && !player.EvolvedThisTurn)
            tips.Add("Puedes evolucionar un Pokémon para hacerlo más fuerte.");

        bool benchHasSpace = player.Bench.Count(b => b != null) < 5;
        if (benchHasSpace && player.Hand.Any(c => c.Card.Supertype == "Pokémon" && c.Card.IsBasic))
            tips.Add("Tienes espacio en el banco: juega un Pokémon Básico de respaldo.");

        if (player.Active.RemainingHp <= 60 && player.Bench.Any(b => b != null) && !player.RetreatedThisTurn)
            tips.Add($"Tu {player.Active.Card.Name} está débil: considera retirarte.");

        if (tips.Count == 0)
            tips.Add("Cuando estés listo, ataca o termina tu turno.");

        return tips.Take(3).ToList();
    }

    private static IEnumerable<CardInstance> PlayerPokemon(PlayerState player)
    {
        if (player.Active != null) yield return player.Active;
        foreach (var b in player.Bench) if (b != null) yield return b;
    }
}
