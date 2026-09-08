using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace PokemonTCG.API.Services;

public record UserProfile(string Username, string DisplayName, string Role);
public record AuthResult(bool Success, string? Token, UserProfile? User, string? Error);

public class AuthService
{
    private readonly IConfiguration _config;
    private readonly string _jwtKey;
    private readonly string _jwtIssuer;
    private readonly string _jwtAudience;

    private static readonly Dictionary<string, (string Password, UserProfile Profile)> Users = new(StringComparer.OrdinalIgnoreCase)
    {
        ["JugadorPokemon"] = ("Susanita2014", new UserProfile("JugadorPokemon", "Jugador Pokémon 1", "pokemon")),
        ["JugadorPokemon2"] = ("Susanita2014", new UserProfile("JugadorPokemon2", "Jugador Pokémon 2", "pokemon"))
    };

    public AuthService(IConfiguration config)
    {
        _config = config;
        _jwtKey = _config["Jwt:Key"] ?? "PokemonTCG_Super_Secret_Key_For_Jwt_Auth_2026_VortexFree!";
        _jwtIssuer = _config["Jwt:Issuer"] ?? "PokemonTCG.API";
        _jwtAudience = _config["Jwt:Audience"] ?? "PokemonTCG.Client";
    }

    public AuthResult Login(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            return new AuthResult(false, null, null, "Por favor ingresa usuario y contraseña.");

        if (!Users.TryGetValue(username.Trim(), out var record) || record.Password != password)
            return new AuthResult(false, null, null, "Credenciales incorrectas.");

        var token = GenerateJwtToken(record.Profile);
        return new AuthResult(true, token, record.Profile, null);
    }

    public IEnumerable<UserProfile> GetDemoAccounts() => Users.Values.Select(v => v.Profile);

    public string GenerateJwtToken(UserProfile user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Username),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim("displayName", user.DisplayName),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _jwtIssuer,
            audience: _jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
