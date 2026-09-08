using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using PokemonTCG.API.Hubs;
using PokemonTCG.API.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. JSON Configuration & Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// 2. SignalR Hub
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// 3. HTTP Client & Game Services
builder.Services.AddHttpClient();
builder.Services.AddSingleton<ICardService, CardService>();
builder.Services.AddSingleton<GameStore>();
builder.Services.AddSingleton<AuthService>();

// 4. CORS Setup
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 5. JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "PokemonTCG_Super_Secret_Key_For_Jwt_Auth_2026_Standalone!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "PokemonTCG.API";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "PokemonTCG.Client";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };

    // Support receiving token from SignalR query string
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && 
                (path.StartsWithSegments("/api/hubs") || path.StartsWithSegments("/gameHub")))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseRouting();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Root status check
app.MapGet("/", () => Results.Ok(new
{
    app = "Pokemon TCG API",
    version = "1.0.0",
    status = "running",
    timestamp = DateTime.UtcNow
}));

app.MapControllers();
app.MapHub<GameHub>("/api/hubs/pokemon");
app.MapHub<GameHub>("/gameHub");

app.Run();
