using PokemonTCG.API.Game.Models;

namespace PokemonTCG.API.Game.Engine;

public class ActionOutcome
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public static ActionOutcome Ok(string message = "") => new() { Success = true, Message = message };
    public static ActionOutcome Fail(string message) => new() { Success = false, Message = message };
}

public class GameEngine
{
    public GameState Game { get; }

    private readonly Random _rng;

    public GameEngine(GameState game)
    {
        Game = game;
        _rng = new Random();
    }

    public PlayerState? GetPlayer(string playerId) =>
        Game.Player1.PlayerId == playerId ? Game.Player1 :
        Game.Player2.PlayerId == playerId ? Game.Player2 : null;

    public PlayerState GetOpponent(string playerId) =>
        Game.Player1.PlayerId == playerId ? Game.Player2 : Game.Player1;

    public bool IsCurrentPlayer(string playerId) => Game.CurrentTurnPlayerId == playerId;

    private void Log(string message)
    {
        Game.Log.Add(message);
        if (Game.Log.Count > 200) Game.Log.RemoveAt(0);
    }

    // ---------- Setup ----------

    public void AddPlayer(string playerId, string name, List<GameCard> deck)
    {
        if (string.IsNullOrEmpty(Game.Player1.PlayerId))
        {
            Game.Player1 = new PlayerState { PlayerId = playerId, Name = name };
            Game.Player1.Deck = deck.Select(c => new CardInstance { Card = c }).ToList();
        }
        else if (string.IsNullOrEmpty(Game.Player2.PlayerId) && Game.Player2.PlayerId != playerId)
        {
            Game.Player2 = new PlayerState { PlayerId = playerId, Name = name };
            Game.Player2.Deck = deck.Select(c => new CardInstance { Card = c }).ToList();
        }
    }

    public ActionOutcome TryStartSetup()
    {
        if (!string.IsNullOrEmpty(Game.Player1.PlayerId) && !string.IsNullOrEmpty(Game.Player2.PlayerId))
        {
            ResolveSetup();
            return ActionOutcome.Ok("Partida iniciada");
        }
        return ActionOutcome.Fail("Esperando al segundo jugador");
    }

    private void ResolveSetup()
    {
        Shuffle(Game.Player1.Deck);
        Shuffle(Game.Player2.Deck);

        // initial draw
        DrawCards(Game.Player1, 7);
        DrawCards(Game.Player2, 7);

        ResolveMulligan(Game.Player1, Game.Player2);
        ResolveMulligan(Game.Player2, Game.Player1);

        // pending extra draws from opponent mulligans
        foreach (var kv in Game.PendingExtraDraws.ToList())
        {
            var p = GetPlayer(kv.Key);
            if (p != null) DrawCards(p, kv.Value);
        }
        Game.PendingExtraDraws.Clear();

        // auto place active + bench basics (first basic -> active, next -> bench)
        AutoPlaceBasics(Game.Player1);
        AutoPlaceBasics(Game.Player2);

        // prize cards: top 6 of deck
        Game.Player1.Prizes = Game.Player1.Deck.Take(6).ToList();
        Game.Player1.Deck.RemoveRange(0, Math.Min(6, Game.Player1.Deck.Count));
        Game.Player2.Prizes = Game.Player2.Deck.Take(6).ToList();
        Game.Player2.Deck.RemoveRange(0, Math.Min(6, Game.Player2.Deck.Count));

        // coin flip for first turn
        Game.GoingFirstPlayerId = _rng.Next(2) == 0 ? Game.Player1.PlayerId : Game.Player2.PlayerId;
        Game.CurrentTurnPlayerId = Game.GoingFirstPlayerId;
        Game.FirstTurn = true;
        Game.TurnNumber = 1;
        Game.Phase = GamePhase.ActiveTurn;
        Game.PendingExtraDraws = new Dictionary<string, int>();

        Log($"Moneda lanzada: empieza {GetPlayer(Game.GoingFirstPlayerId)?.Name}.");
        Log($"{GetPlayer(Game.Player1.PlayerId)?.Name} juega contra {GetPlayer(Game.Player2.PlayerId)?.Name}. ¡A jugar!");
    }

    private void ResolveMulligan(PlayerState player, PlayerState opponent)
    {
        int attempts = 0;
        while (!HasBasicPokemon(player.Hand) && attempts < 10)
        {
            attempts++;
            Log($"{player.Name} no tiene Pokémon Básico en la mano: mulligan ({player.Hand.Count} cartas al mazo).");
            player.Deck.AddRange(player.Hand);
            player.Hand.Clear();
            Shuffle(player.Deck);
            DrawCards(player, 7);
            Game.PendingExtraDraws[opponent.PlayerId] =
                Game.PendingExtraDraws.GetValueOrDefault(opponent.PlayerId) + 1;
        }
        if (Game.PendingExtraDraws.Count > 0)
        {
            Log("El rival roba una carta extra por cada mulligan.");
        }
    }

    private bool HasBasicPokemon(List<CardInstance> hand) =>
        hand.Any(c => c.Card.Supertype == "Pokémon" && c.Card.IsBasic);

    private void AutoPlaceBasics(PlayerState player)
    {
        var basics = player.Hand.Where(c => c.Card.Supertype == "Pokémon" && c.Card.IsBasic).ToList();
        if (basics.Count == 0) return;
        player.Active = basics[0];
        player.Hand.Remove(basics[0]);
        player.Bench = new List<CardInstance?>(5);
        for (int i = 0; i < 5; i++) player.Bench.Add(null);
        for (int i = 1; i < basics.Count && i - 1 < 5; i++)
        {
            player.Bench[i - 1] = basics[i];
            player.Hand.Remove(basics[i]);
        }
    }

    private void DrawCards(PlayerState player, int count)
    {
        for (int i = 0; i < count; i++)
        {
            if (player.Deck.Count == 0) break;
            var card = player.Deck[0];
            player.Deck.RemoveAt(0);
            player.Hand.Add(card);
        }
    }

    private void Shuffle(List<CardInstance> list)
    {
        for (int i = list.Count - 1; i > 0; i--)
        {
            int j = _rng.Next(i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
    }

    // ---------- Turn management ----------

    public void StartTurn(string playerId)
    {
        if (Game.Phase == GamePhase.GameOver) return;

        var player = GetPlayer(playerId)!;
        // reset per-turn flags
        player.EnergyAttachedThisTurn = false;
        player.SupporterPlayedThisTurn = false;
        player.RetreatedThisTurn = false;
        player.AttackedThisTurn = false;
        player.EvolvedThisTurn = false;

        // age the player's pokemon
        foreach (var p in PlayerPokemon(player)) p.TurnsInPlay++;

        // draw (skip first turn of the game for the player going first)
        if (!(Game.FirstTurn && playerId == Game.GoingFirstPlayerId))
        {
            if (player.Deck.Count == 0)
            {
                Game.WinnerId = GetOpponent(playerId).PlayerId;
                Game.WinnerReason = "deckout";
                Game.Phase = GamePhase.GameOver;
                Log($"{player.Name} no puede robar: se quedó sin cartas. ¡{GetOpponent(playerId).Name} gana!");
                return;
            }
            DrawCards(player, 1);
            Log($"Turno {Game.TurnNumber}: {player.Name} roba una carta.");
        }
        else
        {
            Log($"Turno {Game.TurnNumber}: {player.Name} no roba en el primer turno.");
        }

        Game.LastHint = null;
    }

    private void EndTurn()
    {
        var current = GetPlayer(Game.CurrentTurnPlayerId)!;
        // paralyzed recovers at the end of its owner's turn
        if (current.Active != null)
            current.Active.Conditions.Remove(StatusCondition.Paralyzed);

        Game.FirstTurn = false;
        var next = GetOpponent(Game.CurrentTurnPlayerId);
        Game.CurrentTurnPlayerId = next.PlayerId;
        Game.TurnNumber++;

        // between-turns checkup
        Checkup();

        if (Game.Phase != GamePhase.GameOver)
            StartTurn(next.PlayerId);
    }

    private void Checkup()
    {
        foreach (var player in new[] { Game.Player1, Game.Player2 })
        {
            var active = player.Active;
            if (active == null) continue;
            if (active.Conditions.Contains(StatusCondition.Poisoned))
            {
                ApplyDamage(active, 1);
                Log($"{active.Card.Name} de {player.Name} sufre 10 de daño por veneno.");
            }
            if (active.Conditions.Contains(StatusCondition.Burned))
            {
                ApplyDamage(active, 2);
                Log($"{active.Card.Name} de {player.Name} sufre 20 de daño por quemadura.");
                if (FlipCoin())
                {
                    active.Conditions.Remove(StatusCondition.Burned);
                    Log($"{active.Card.Name} se cura de la quemadura.");
                }
            }
            if (active.Conditions.Contains(StatusCondition.Asleep))
            {
                if (FlipCoin())
                {
                    active.Conditions.Remove(StatusCondition.Asleep);
                    Log($"{active.Card.Name} se despierta.");
                }
                else
                {
                    Log($"{active.Card.Name} sigue dormido.");
                }
            }
        }

        // knockouts from between-turn damage
        CheckKnockouts(Game.Player1, Game.Player2);
        CheckKnockouts(Game.Player2, Game.Player1);
    }

    private void CheckKnockouts(PlayerState victimOwner, PlayerState attackerOwner)
    {
        var active = victimOwner.Active;
        if (active != null && active.IsKnockedOut)
        {
            HandleKnockout(victimOwner, attackerOwner, active);
        }
    }

    // ---------- Actions ----------

    public ActionOutcome PlayBasicToBench(string playerId, string handInstanceId)
    {
        if (!EnsureTurn(playerId, out var player, out var msg)) return ActionOutcome.Fail(msg);
        var card = player.Hand.FirstOrDefault(c => c.InstanceId == handInstanceId);
        if (card == null) return ActionOutcome.Fail("Carta no encontrada en tu mano.");
        if (card.Card.Supertype != "Pokémon" || !card.Card.IsBasic)
            return ActionOutcome.Fail("Solo puedes jugar Pokémon Básicos al banco.");
        var slot = FirstEmptyBench(player);
        if (slot == -1) return ActionOutcome.Fail("Tu banco está lleno (máximo 5).");
        player.Hand.Remove(card);
        player.Bench[slot] = card;
        card.TurnsInPlay = 0;
        Log($"{player.Name} coloca a {card.Card.Name} en el banco.");
        return ActionOutcome.Ok();
    }

    public ActionOutcome Evolve(string playerId, string handInstanceId, string targetInstanceId)
    {
        if (!EnsureTurn(playerId, out var player, out var msg)) return ActionOutcome.Fail(msg);
        if (Game.FirstTurn) return ActionOutcome.Fail("No se puede evolucionar en el primer turno de la partida.");
        if (player.EvolvedThisTurn) return ActionOutcome.Fail("Ya evolucionaste un Pokémon este turno (1 por turno).");

        var handCard = player.Hand.FirstOrDefault(c => c.InstanceId == handInstanceId);
        if (handCard == null) return ActionOutcome.Fail("Carta no encontrada en tu mano.");
        if (handCard.Card.Supertype != "Pokémon" || !(handCard.Card.IsStage1 || handCard.Card.IsStage2))
            return ActionOutcome.Fail("Esa carta no es una evolución.");

        var target = PlayerPokemon(player).FirstOrDefault(p => p.InstanceId == targetInstanceId);
        if (target == null) return ActionOutcome.Fail("Pokémon objetivo no encontrado en juego.");
        if (target.TurnsInPlay < 1) return ActionOutcome.Fail("No puedes evolucionar un Pokémon recién jugado.");
        if (!string.Equals(target.Card.Name, handCard.Card.EvolvesFrom, StringComparison.OrdinalIgnoreCase))
            return ActionOutcome.Fail($"{handCard.Card.Name} evoluciona de {handCard.Card.EvolvesFrom}, no de {target.Card.Name}.");

        // build evolved instance preserving damage/energy, clearing conditions
        var evolved = new CardInstance
        {
            Card = handCard.Card,
            DamageCounters = target.DamageCounters,
            AttachedEnergy = new List<string>(target.AttachedEnergy),
            TurnsInPlay = 0,
            EvolvedFromInstanceId = target.InstanceId
        };
        player.Hand.Remove(handCard);

        if (player.Active?.InstanceId == target.InstanceId) player.Active = evolved;
        else
        {
            int idx = player.Bench.FindIndex(b => b?.InstanceId == target.InstanceId);
            if (idx >= 0) player.Bench[idx] = evolved;
        }
        player.EvolvedThisTurn = true;
        Log($"{player.Name} evoluciona {target.Card.Name} a {evolved.Card.Name}.");
        return ActionOutcome.Ok();
    }

    public ActionOutcome AttachEnergy(string playerId, string handInstanceId, string targetInstanceId)
    {
        if (!EnsureTurn(playerId, out var player, out var msg)) return ActionOutcome.Fail(msg);
        if (player.EnergyAttachedThisTurn) return ActionOutcome.Fail("Solo puedes adjuntar 1 energía por turno.");

        var energy = player.Hand.FirstOrDefault(c => c.InstanceId == handInstanceId);
        if (energy == null) return ActionOutcome.Fail("Carta no encontrada en tu mano.");
        if (energy.Card.Supertype != "Energy") return ActionOutcome.Fail("Esa carta no es una Energía.");

        var target = PlayerPokemon(player).FirstOrDefault(p => p.InstanceId == targetInstanceId);
        if (target == null) return ActionOutcome.Fail("Pokémon objetivo no encontrado.");

        var provides = EnergyEngine.EnergyProvides(energy.Card);
        player.Hand.Remove(energy);
        target.AttachedEnergy.AddRange(provides);
        player.EnergyAttachedThisTurn = true;
        Log($"{player.Name} adjunta energía {string.Join(",", provides)} a {target.Card.Name}.");
        return ActionOutcome.Ok();
    }

    public ActionOutcome Retreat(string playerId, int benchIndex)
    {
        if (!EnsureTurn(playerId, out var player, out var msg)) return ActionOutcome.Fail(msg);
        if (player.RetreatedThisTurn) return ActionOutcome.Fail("Solo puedes retirarte 1 vez por turno.");
        var active = player.Active;
        if (active == null) return ActionOutcome.Fail("No tienes Pokémon Activo.");
        if (active.Conditions.Contains(StatusCondition.Asleep)) return ActionOutcome.Fail("Un Pokémon dormido no puede retirarse.");
        if (active.Conditions.Contains(StatusCondition.Paralyzed)) return ActionOutcome.Fail("Un Pokémon paralizado no puede retirarse.");
        if (benchIndex < 0 || benchIndex >= player.Bench.Count || player.Bench[benchIndex] == null)
            return ActionOutcome.Fail("Elige un Pokémon válido del banco.");

        int cost = active.Card.RetreatCost.Count;
        if (active.AttachedEnergy.Count < cost)
            return ActionOutcome.Fail($"Necesitas descartar {cost} energía(s) para retirarte (tienes {active.AttachedEnergy.Count}).");

        for (int i = 0; i < cost; i++) active.AttachedEnergy.RemoveAt(active.AttachedEnergy.Count - 1);

        var promoted = player.Bench[benchIndex]!;
        player.Bench[benchIndex] = active;
        player.Active = promoted;
        active.Conditions.Clear(); // retreat clears special conditions
        player.RetreatedThisTurn = true;
        Log($"{player.Name} retira a {active.Card.Name} y promueve a {promoted.Card.Name}.");
        return ActionOutcome.Ok();
    }

    public ActionOutcome Attack(string playerId, int attackIndex)
    {
        if (!EnsureTurn(playerId, out var player, out var msg)) return ActionOutcome.Fail(msg);
        if (player.AttackedThisTurn) return ActionOutcome.Fail("Ya atacaste este turno.");
        var active = player.Active;
        if (active == null) return ActionOutcome.Fail("No tienes Pokémon Activo.");
        if (active.Card.Attacks.Count <= attackIndex || attackIndex < 0) return ActionOutcome.Fail("Ataque inválido.");
        if (active.Conditions.Contains(StatusCondition.Asleep)) return ActionOutcome.Fail("Un Pokémon dormido no puede atacar.");
        if (active.Conditions.Contains(StatusCondition.Paralyzed)) return ActionOutcome.Fail("Un Pokémon paralizado no puede atacar.");

        var attack = active.Card.Attacks[attackIndex];
        if (!EnergyEngine.CanPayCost(attack.Cost, active.AttachedEnergy))
            return ActionOutcome.Fail($"Falta energía para {attack.Name}. Cuesta: {string.Join(", ", attack.Cost)}.");

        var opponent = GetOpponent(playerId);
        player.AttackedThisTurn = true;
        Log($"{player.Name} ataca con {active.Card.Name} usando {attack.Name}.");

        // confused check
        if (active.Conditions.Contains(StatusCondition.Confused))
        {
            Log($"{active.Card.Name} está confuso: lanza una moneda.");
            if (!FlipCoin())
            {
                ApplyDamage(active, 3);
                Log($"{active.Card.Name} se hace 30 de daño a sí mismo por la confusión.");
                EndTurn();
                return ActionOutcome.Ok();
            }
        }

        var target = opponent.Active;
        if (target != null)
        {
            int damage = EnergyEngine.ParseDamage(attack.Damage);
            damage = ApplyWeaknessResistance(active, target, damage);
            if (damage > 0)
            {
                ApplyDamage(target, damage);
                int remainingHp = Math.Max(0, (target.Card.Hp ?? 0) - target.DamageCounters * 10);
                Log($"{player.Name} causó {damage} de daño a {target.Card.Name} con {attack.Name} (le quedan {remainingHp} PS).");
            }
            else
            {
                Log($"{attack.Name} no hizo daño a {target.Card.Name}.");
            }
        }

        CheckKnockouts(opponent, player);

        if (Game.Phase != GamePhase.GameOver)
            EndTurn();

        return ActionOutcome.Ok();
    }

    public ActionOutcome PlayTrainer(string playerId, string handInstanceId)
    {
        if (!EnsureTurn(playerId, out var player, out var msg)) return ActionOutcome.Fail(msg);
        var card = player.Hand.FirstOrDefault(c => c.InstanceId == handInstanceId);
        if (card == null) return ActionOutcome.Fail("Carta no encontrada en tu mano.");
        if (card.Card.Supertype != "Trainer") return ActionOutcome.Fail("Esa carta no es de Entrenador.");

        if (card.Card.IsSupporter && player.SupporterPlayedThisTurn)
            return ActionOutcome.Fail("Solo puedes jugar 1 Partidario (Supporter) por turno.");
        if (card.Card.IsStadium)
        {
            player.Stadium = new CardInstance { Card = card.Card };
            player.Hand.Remove(card);
            Log($"{player.Name} juega el Estadio {card.Card.Name}.");
            return ActionOutcome.Ok();
        }

        player.Hand.Remove(card);
        if (card.Card.IsSupporter) player.SupporterPlayedThisTurn = true;
        var result = TrainerEffect.Apply(this, player, card.Card);
        Log($"{player.Name} juega {card.Card.Name}. {result}");
        return ActionOutcome.Ok();
    }

    public ActionOutcome UseAbility(string playerId, string targetInstanceId, int abilityIndex)
    {
        if (!EnsureTurn(playerId, out var player, out var msg)) return ActionOutcome.Fail(msg);
        var target = PlayerPokemon(player).FirstOrDefault(p => p.InstanceId == targetInstanceId);
        if (target == null) return ActionOutcome.Fail("Pokémon no encontrado.");
        if (target.Card.Abilities.Count <= abilityIndex || abilityIndex < 0)
            return ActionOutcome.Fail("Habilidad inválida.");
        var ability = target.Card.Abilities[abilityIndex];
        Log($"{player.Name} usa la habilidad {ability.Name} de {target.Card.Name}.");
        Game.LastHint = $"Habilidad \"{ability.Name}\": {ability.Text}. (Efectos de habilidad aún no se resuelven automáticamente.)";
        return ActionOutcome.Ok();
    }

    public ActionOutcome Pass(string playerId)
    {
        if (!EnsureTurn(playerId, out var player, out var msg)) return ActionOutcome.Fail(msg);
        Log($"{player.Name} termina su turno.");
        EndTurn();
        return ActionOutcome.Ok();
    }

    // ---------- helpers ----------

    private bool EnsureTurn(string playerId, out PlayerState player, out string message)
    {
        player = GetPlayer(playerId)!;
        message = "";
        if (Game.Phase == GamePhase.GameOver)
        {
            message = "La partida terminó.";
            return false;
        }
        if (Game.Phase != GamePhase.ActiveTurn)
        {
            message = "Aún no es tu turno (fase: " + Game.Phase + ").";
            return false;
        }
        if (!IsCurrentPlayer(playerId))
        {
            message = "No es tu turno.";
            return false;
        }
        return true;
    }

    public IEnumerable<CardInstance> PlayerPokemon(PlayerState player)
    {
        if (player.Active != null) yield return player.Active;
        foreach (var b in player.Bench) if (b != null) yield return b;
    }

    public void DrawForPlayer(PlayerState player, int count) => DrawCards(player, count);

    public bool SearchAndDrawCard(PlayerState player, Func<CardInstance, bool> predicate, out string foundCardName)
    {
        foundCardName = "";
        var card = player.Deck.FirstOrDefault(predicate);
        if (card != null)
        {
            player.Deck.Remove(card);
            player.Hand.Add(card);
            Shuffle(player.Deck);
            foundCardName = card.Card.Name;
            return true;
        }
        return false;
    }

    public void DiscardHandAndDraw(PlayerState player, int count)
    {
        player.DiscardPile.AddRange(player.Hand);
        player.Hand.Clear();
        DrawCards(player, count);
    }

    public void Heal(CardInstance target, int counters) =>
        target.DamageCounters = Math.Max(0, target.DamageCounters - counters);

    public void SwapActiveWithBench(PlayerState player, int benchIndex)
    {
        if (player.Active == null || benchIndex < 0 || benchIndex >= player.Bench.Count || player.Bench[benchIndex] == null)
            return;
        var bench = player.Bench[benchIndex]!;
        player.Bench[benchIndex] = player.Active;
        player.Active = bench;
        Log($"{player.Name} intercambia su Activo con {bench.Card.Name}.");
    }

    private int FirstEmptyBench(PlayerState player)
    {
        for (int i = 0; i < player.Bench.Count; i++)
            if (player.Bench[i] == null) return i;
        return -1;
    }

    private bool FlipCoin() => _rng.Next(2) == 0;

    private void ApplyDamage(CardInstance target, int counters)
    {
        target.DamageCounters += counters;
    }

    private int ApplyWeaknessResistance(CardInstance attacker, CardInstance defender, int damage)
    {
        if (damage <= 0) return 0;
        string? atkType = attacker.Card.Types.FirstOrDefault();
        if (atkType != null)
        {
            var weakness = defender.Card.Weaknesses.FirstOrDefault(w => string.Equals(w.Type, atkType, StringComparison.OrdinalIgnoreCase));
            if (weakness != null)
            {
                int mult = int.TryParse(weakness.Value.Trim('×', 'x', '+', ' '), out var m) ? Math.Max(1, m) : 2;
                damage *= mult;
                Log($"{defender.Card.Name} es débil a {atkType}: daño x{mult}.");
            }
            var resistance = defender.Card.Resistances.FirstOrDefault(r => string.Equals(r.Type, atkType, StringComparison.OrdinalIgnoreCase));
            if (resistance != null)
            {
                int val = int.TryParse(resistance.Value.Trim('-', ' '), out var r) ? r : 20;
                damage = Math.Max(0, damage - val);
                Log($"{defender.Card.Name} resiste {atkType}: -{val} de daño.");
            }
        }
        return damage;
    }

    private void HandleKnockout(PlayerState victimOwner, PlayerState attackerOwner, CardInstance victim)
    {
        Log($"💥 ¡{victim.Card.Name} de {victimOwner.Name} queda Fuera de Combate (K.O.)!");
        // move victim + all attached cards to discard
        victimOwner.DiscardPile.Add(victim);
        if (victimOwner.Active?.InstanceId == victim.InstanceId) victimOwner.Active = null;
        else
        {
            int idx = victimOwner.Bench.FindIndex(b => b?.InstanceId == victim.InstanceId);
            if (idx >= 0) victimOwner.Bench[idx] = null;
        }

        // attacker takes a prize
        if (attackerOwner.Prizes.Count > 0)
        {
            var prize = attackerOwner.Prizes[0];
            attackerOwner.Prizes.RemoveAt(0);
            attackerOwner.Hand.Add(prize);
            int taken = 6 - attackerOwner.Prizes.Count;
            Log($"🏆 ¡{attackerOwner.Name} toma 1 Carta de Premio! ({taken}/6 tomadas, le faltan {attackerOwner.Prizes.Count} para ganar).");
        }

        if (attackerOwner.Prizes.Count == 0)
        {
            Game.WinnerId = attackerOwner.PlayerId;
            Game.WinnerReason = "prizes";
            Game.Phase = GamePhase.GameOver;
            Log($"🎉 ¡{attackerOwner.Name} tomó sus 6 Cartas de Premio y GANA la partida!");
            return;
        }

        if (!HasAnyPokemon(victimOwner))
        {
            Game.WinnerId = attackerOwner.PlayerId;
            Game.WinnerReason = "nopokemon";
            Game.Phase = GamePhase.GameOver;
            Log($"{victimOwner.Name} se quedó sin Pokémon. ¡{attackerOwner.Name} gana!");
            return;
        }

        if (victimOwner.Active == null)
        {
            // promote first benched pokemon
            for (int i = 0; i < victimOwner.Bench.Count; i++)
            {
                if (victimOwner.Bench[i] != null)
                {
                    var promoted = victimOwner.Bench[i]!;
                    victimOwner.Active = promoted;
                    victimOwner.Bench[i] = null;
                    Log($"{victimOwner.Name} promueve a {promoted.Card.Name}.");
                    break;
                }
            }
        }
    }

    private bool HasAnyPokemon(PlayerState player) =>
        player.Active != null || player.Bench.Any(b => b != null);
}
