using Microsoft.AspNetCore.Mvc;
using PokemonTCG.API.Services;

namespace PokemonTCG.API.Controllers;

[ApiController]
[Route("api/cards")]
public class CardsController : ControllerBase
{
    private readonly ICardService _cards;

    public CardsController(ICardService cards) => _cards = cards;

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _cards.SearchAsync(q, page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("starter")]
    public async Task<IActionResult> Starter(CancellationToken ct = default)
    {
        var deck = await _cards.GetStarterDeckAsync(ct);
        return Ok(deck);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id, CancellationToken ct = default)
    {
        var card = await _cards.GetAsync(id, ct);
        return card == null ? NotFound() : Ok(card);
    }
}
