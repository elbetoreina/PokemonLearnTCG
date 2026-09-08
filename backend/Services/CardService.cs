using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using PokemonTCG.API.Game.Models;

namespace PokemonTCG.API.Services;

public class CardService : ICardService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<CardService> _logger;
    private readonly string _baseUrl;
    private readonly string? _apiKey;
    private readonly List<GameCard> _fallback;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public CardService(IHttpClientFactory httpFactory, IConfiguration config, ILogger<CardService> logger)
    {
        _httpFactory = httpFactory;
        _config = config;
        _logger = logger;
        _baseUrl = config["CardApi:BaseUrl"] ?? "https://api.pokemontcg.io/v2";
        _apiKey = config["CardApi:ApiKey"];
        _fallback = LoadFallback();
    }

    public List<GameCard> GetFallback() => _fallback;

    public async Task<CardSearchResult> SearchAsync(string? query, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        bool hasApi = !string.IsNullOrWhiteSpace(_apiKey);
        if (!hasApi)
        {
            var local = string.IsNullOrWhiteSpace(query)
                ? _fallback
                : _fallback.Where(c => c.Name.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                                       (c.Types.Any(t => t.Equals(query, StringComparison.OrdinalIgnoreCase)))).ToList();
            return new CardSearchResult { Cards = local.Skip((page - 1) * pageSize).Take(pageSize).ToList(), TotalCount = local.Count };
        }

        try
        {
            var q = string.IsNullOrWhiteSpace(query) ? "" : $"&q=name:\"{Uri.EscapeDataString(query)}\"";
            var url = $"{_baseUrl}/cards?page={page}&pageSize={pageSize}{q}";
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            if (_apiKey != null) req.Headers.Add("X-Api-Key", _apiKey);

            var http = _httpFactory.CreateClient();
            using var resp = await http.SendAsync(req, ct);
            resp.EnsureSuccessStatusCode();
            var json = await resp.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            int total = root.TryGetProperty("totalCount", out var tc) && tc.TryGetInt32(out var t) ? t : 0;
            var cards = new List<GameCard>();
            if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in data.EnumerateArray())
                    cards.Add(MapApiCard(item));
            }
            return new CardSearchResult { Cards = cards, TotalCount = total };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error consultando la API de cartas; usando set de respaldo.");
            var local = _fallback.Where(c => c.Name.Contains(query ?? "", StringComparison.OrdinalIgnoreCase)).ToList();
            return new CardSearchResult { Cards = local.Take(pageSize).ToList(), TotalCount = local.Count };
        }
    }

    public async Task<GameCard?> GetAsync(string id, CancellationToken ct = default)
    {
        var fromFallback = _fallback.FirstOrDefault(c => c.Id == id);
        if (fromFallback != null) return fromFallback;

        if (string.IsNullOrWhiteSpace(_apiKey)) return null;

        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}/cards/{id}");
            req.Headers.Add("X-Api-Key", _apiKey);
            var http = _httpFactory.CreateClient();
            using var resp = await http.SendAsync(req, ct);
            resp.EnsureSuccessStatusCode();
            var json = await resp.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty("data", out var data) ? MapApiCard(data) : null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error al obtener la carta {Id}", id);
            return null;
        }
    }

    public async Task<List<GameCard>> GetStarterDeckAsync(CancellationToken ct = default)
    {
        var deck = new List<GameCard>();
        var counts = new Dictionary<string, int>
        {
            // Imported Pokémon (19 cards)
            { "imp-garchomp-ex", 1 },
            { "imp-morpeko", 1 },
            { "imp-eevee", 1 },
            { "imp-heracross", 1 },
            { "imp-scyther", 1 },
            { "imp-mantine", 1 },
            { "imp-growlithe", 1 },
            { "imp-basculin", 1 },
            { "imp-spinda", 1 },
            { "imp-rotom", 1 },
            { "imp-ting-lu", 1 },
            { "imp-magnemite", 1 },
            { "imp-voltorb", 1 },
            { "imp-barboach", 1 },
            { "imp-buneary", 1 },
            { "imp-sneasel", 1 },
            { "imp-poochyena", 1 },
            { "imp-qwilfish", 1 },
            { "imp-overqwil", 1 },

            // Trainers & Supporters (19 cards)
            { "imp-energy-loto", 4 },
            { "cur-pokeball", 4 },
            { "cur-professor", 4 },
            { "cur-switch", 3 },
            { "cur-potion", 4 },

            // Basic Energies (22 cards)
            { "imp-fire-energy", 6 },
            { "cur-water-energy", 6 },
            { "cur-lightning-energy", 5 },
            { "cur-grass-energy", 5 }
        };
        foreach (var kv in counts)
        {
            var card = await GetAsync(kv.Key, ct);
            if (card == null) continue;
            for (int i = 0; i < kv.Value; i++) deck.Add(card);
        }
        return deck;
    }

    // ---------- mapping ----------

    private static GameCard MapApiCard(JsonElement e)
    {
        string GetStr(string prop) => e.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";
        var card = new GameCard
        {
            Id = GetStr("id"),
            Name = GetStr("name"),
            Supertype = GetStr("supertype"),
            EvolvesFrom = e.TryGetProperty("evolvesFrom", out var ev) && ev.ValueKind == JsonValueKind.String ? ev.GetString() : null,
            Number = GetStr("number")
        };
        if (e.TryGetProperty("subtypes", out var st) && st.ValueKind == JsonValueKind.Array)
            card.Subtypes = st.EnumerateArray().Select(x => x.GetString() ?? "").ToList();
        if (e.TryGetProperty("types", out var ty) && ty.ValueKind == JsonValueKind.Array)
            card.Types = ty.EnumerateArray().Select(x => x.GetString() ?? "").ToList();
        if (e.TryGetProperty("hp", out var hp) && hp.ValueKind == JsonValueKind.String && int.TryParse(hp.GetString(), out var hpv))
            card.Hp = hpv;
        if (e.TryGetProperty("rules", out var rl) && rl.ValueKind == JsonValueKind.Array)
            card.Rules = rl.EnumerateArray().Select(x => x.GetString() ?? "").ToList();
        if (e.TryGetProperty("retreatCost", out var rc) && rc.ValueKind == JsonValueKind.Array)
            card.RetreatCost = rc.EnumerateArray().Select(x => x.GetString() ?? "").ToList();
        if (e.TryGetProperty("weaknesses", out var wk) && wk.ValueKind == JsonValueKind.Array)
            card.Weaknesses = wk.EnumerateArray().Select(x => new TypeValue { Type = GetProp(x, "type"), Value = GetProp(x, "value") }).ToList();
        if (e.TryGetProperty("resistances", out var rs) && rs.ValueKind == JsonValueKind.Array)
            card.Resistances = rs.EnumerateArray().Select(x => new TypeValue { Type = GetProp(x, "type"), Value = GetProp(x, "value") }).ToList();
        if (e.TryGetProperty("attacks", out var at) && at.ValueKind == JsonValueKind.Array)
        {
            foreach (var a in at.EnumerateArray())
            {
                card.Attacks.Add(new Attack
                {
                    Name = GetProp(a, "name"),
                    Damage = GetProp(a, "damage"),
                    Text = GetProp(a, "text"),
                    Cost = a.TryGetProperty("cost", out var cost) && cost.ValueKind == JsonValueKind.Array
                        ? cost.EnumerateArray().Select(x => x.GetString() ?? "").ToList()
                        : new List<string>()
                });
            }
        }
        if (e.TryGetProperty("abilities", out var ab) && ab.ValueKind == JsonValueKind.Array)
        {
            foreach (var a in ab.EnumerateArray())
            {
                card.Abilities.Add(new Ability
                {
                    Name = GetProp(a, "name"),
                    Type = GetProp(a, "type"),
                    Text = GetProp(a, "text")
                });
            }
        }
        if (e.TryGetProperty("images", out var im))
        {
            card.ImageSmall = GetProp(im, "small");
            card.ImageLarge = GetProp(im, "large");
        }
        if (e.TryGetProperty("set", out var s))
            card.SetName = GetProp(s, "name");
        return card;
    }

    private static string GetProp(JsonElement e, string prop) =>
        e.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";

    private static List<GameCard> LoadFallback()
    {
        try
        {
            var diskPath = Path.Combine(AppContext.BaseDirectory, "Data", "Pokemon", "cards_fallback.json");
            if (File.Exists(diskPath))
            {
                var json = File.ReadAllText(diskPath);
                var list = JsonSerializer.Deserialize<List<GameCard>>(json, JsonOpts);
                if (list != null && list.Count > 0) return list;
            }
        }
        catch { }

        var asm = Assembly.GetExecutingAssembly();
        var resourceName = asm.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("cards_fallback.json"));
        if (resourceName == null) return new List<GameCard>();
        using var stream = asm.GetManifestResourceStream(resourceName);
        if (stream == null) return new List<GameCard>();
        using var reader = new StreamReader(stream);
        return JsonSerializer.Deserialize<List<GameCard>>(reader.ReadToEnd(), JsonOpts) ?? new List<GameCard>();
    }
}
