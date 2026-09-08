using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PokemonTCG.API.Services;

namespace PokemonTCG.API.Controllers;

public record LoginRequestDto(string Username, string Password);

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequestDto req)
    {
        var result = _authService.Login(req.Username, req.Password);
        if (!result.Success)
            return Unauthorized(new { message = result.Error });

        return Ok(new
        {
            token = result.Token,
            accessToken = result.Token,
            user = new
            {
                username = result.User!.Username,
                displayName = result.User.DisplayName,
                role = result.User.Role
            }
        });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return Ok(new { message = "Sesión finalizada exitosamente." });
    }

    [HttpGet("me")]
    public IActionResult GetMe()
    {
        var username = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(username))
            return Unauthorized(new { message = "No autenticado." });

        var displayName = User.FindFirstValue("displayName") ?? username;
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "pokemon";

        return Ok(new
        {
            username,
            displayName,
            role
        });
    }

    [HttpGet("demo-accounts")]
    public IActionResult GetDemoAccounts()
    {
        var accounts = _authService.GetDemoAccounts();
        return Ok(accounts);
    }
}
