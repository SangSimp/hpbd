using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using SmartKanban.Application.DTOs.Auth;
using SmartKanban.Application.Services.Interfaces;
using SmartKanban.Domain.Entities;
using SmartKanban.Domain.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace SmartKanban.Presentation.Controllers
{
    [Route("api/v1/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IConfiguration _configuration;
        private readonly IAuthService _authService;
        public AuthController(IUserRepository userRepository, IConfiguration configuration, IAuthService authService)
        {
            _userRepository = userRepository;
            _configuration = configuration;
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> RegisterAsync([FromBody] RegisterDto payload)
        {
            var existingUser = await _userRepository.GetByEmailAsync(payload.Email);
            if (existingUser != null)
                return BadRequest(new { message = "Email đã tồn tại trong hệ thống." });

            var newUser = new User
            {
                FullName = payload.FullName,
                Email = payload.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(payload.Password),
                Role = "viewer",
                Position = "Người xem",
                IsActive = true
            };

            await _userRepository.CreateAsync(newUser);
            return Created("", new { message = "Đăng ký thành công!" });
        }

        [HttpPost("login")]
        public async Task<IActionResult> LoginAsync([FromBody] LoginDto payload)
        {
            var user = await _userRepository.GetByEmailAsync(payload.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(payload.Password, user.PasswordHash))
                return Unauthorized(new { message = "Sai email hoặc mật khẩu." });

            if (!user.IsActive)
                return Forbid("Tài khoản của bạn đã bị khóa.");

            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtKey = _configuration["Jwt:Key"] ?? "NotChuoiKyTuBiMatDaiVaAnToanChoSmartKanban123!";
            var key = Encoding.UTF8.GetBytes(jwtKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, string.IsNullOrEmpty(user.Role) ? "viewer" : user.Role.ToLower()),
                    new Claim("Position", user.Position ?? "Người xem")
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);

            return Ok(new
            {
                Token = tokenHandler.WriteToken(token),
                User = new { user.Id, user.FullName, user.Email, user.AvatarUrl }
            });
        }

        public class GoogleLoginDto
        {
            public string Token { get; set; } = string.Empty;
        }

        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLoginAsync([FromBody] GoogleLoginDto payload)
        {
            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", payload.Token);

                var userResponse = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");

                if (!userResponse.IsSuccessStatusCode)
                    return BadRequest(new { message = "Mã xác thực Google không hợp lệ hoặc đã hết hạn." });

                var googleUser = await userResponse.Content.ReadFromJsonAsync<JsonElement>();

                string email = googleUser.GetProperty("email").GetString();
                string name = googleUser.GetProperty("name").GetString();
                string picture = googleUser.TryGetProperty("picture", out var picProp) ? picProp.GetString() : "";

                var user = await _userRepository.GetByEmailAsync(email);

                if (user == null)
                {
                    user = new User
                    {
                        FullName = name,
                        Email = email,
                        AvatarUrl = picture,
                        PasswordHash = "",
                        Role = "viewer",
                        Position = "Người xem",
                        IsActive = true
                    };
                    await _userRepository.CreateAsync(user);
                    user = await _userRepository.GetByEmailAsync(email);
                }

                if (!user.IsActive)
                    return Forbid("Tài khoản của bạn đã bị khóa.");

                var tokenHandler = new JwtSecurityTokenHandler();
                var jwtKey = _configuration["Jwt:Key"] ?? "NotChuoiKyTuBiMatDaiVaAnToanChoSmartKanban123!";
                var key = Encoding.UTF8.GetBytes(jwtKey);

                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, user.Id),
                        new Claim(ClaimTypes.Email, user.Email),
                        // 💡 ĐÃ SỬA
                        new Claim(ClaimTypes.Role, string.IsNullOrEmpty(user.Role) ? "viewer" : user.Role.ToLower())
                    }),
                    Expires = DateTime.UtcNow.AddDays(7),
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
                };

                var token = tokenHandler.CreateToken(tokenDescriptor);

                return Ok(new
                {
                    token = tokenHandler.WriteToken(token),
                    user = new { id = user.Id, fullName = user.FullName, email = user.Email, avatarUrl = user.AvatarUrl }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ Lỗi Google Login: " + ex.Message);
                return BadRequest(new { message = "Lỗi kết nối đến máy chủ Google." });
            }
        }

        public class GitHubLoginDto { public string Code { get; set; } = string.Empty; }

        [HttpPost("github-login")]
        public async Task<IActionResult> GitHubLoginAsync([FromBody] GitHubLoginDto payload)
        {
            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("Accept", "application/json");

                var tokenRequest = new Dictionary<string, string>
                {
                    {"client_id", "Ov23licJAjMGlPixZKA7"},
                    {"client_secret", "8d239cd7c0317c9fea2d0ed17f42f4ccd66bd857"},
                    {"code", payload.Code}
                };

                var tokenResponse = await httpClient.PostAsync("https://github.com/login/oauth/access_token", new FormUrlEncodedContent(tokenRequest));
                var tokenResult = await tokenResponse.Content.ReadFromJsonAsync<JsonElement>();

                if (!tokenResult.TryGetProperty("access_token", out var accessTokenElement))
                    return BadRequest(new { message = "Không thể lấy thẻ bài từ GitHub." });

                var accessToken = accessTokenElement.GetString();

                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                httpClient.DefaultRequestHeaders.Add("User-Agent", "SmartKanbanApp");

                var userResponse = await httpClient.GetAsync("https://api.github.com/user");
                var userResult = await userResponse.Content.ReadFromJsonAsync<JsonElement>();

                string githubName = userResult.TryGetProperty("name", out var nameProp) && nameProp.ValueKind != JsonValueKind.Null ? nameProp.GetString() : userResult.GetProperty("login").GetString();
                string avatarUrl = userResult.GetProperty("avatar_url").GetString();
                string email = userResult.TryGetProperty("email", out var emailProp) && emailProp.ValueKind != JsonValueKind.Null ? emailProp.GetString() : null;

                if (string.IsNullOrEmpty(email))
                {
                    var emailsResponse = await httpClient.GetAsync("https://api.github.com/user/emails");
                    var emailsResult = await emailsResponse.Content.ReadFromJsonAsync<JsonElement[]>();
                    email = emailsResult?.FirstOrDefault(e => e.GetProperty("primary").GetBoolean()).GetProperty("email").GetString();
                }

                if (string.IsNullOrEmpty(email)) return BadRequest(new { message = "Không lấy được Email từ GitHub." });

                var user = await _userRepository.GetByEmailAsync(email);
                if (user == null)
                {
                    user = new User
                    {
                        FullName = githubName,
                        Email = email,
                        AvatarUrl = avatarUrl,
                        PasswordHash = "",
                        Role = "viewer",
                        Position = "Người xem",
                        IsActive = true
                    };
                    await _userRepository.CreateAsync(user);
                    user = await _userRepository.GetByEmailAsync(email);
                }

                if (!user.IsActive) return Forbid("Tài khoản của bạn đã bị khóa.");

                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "NotChuoiKyTuBiMatDaiVaAnToanChoSmartKanban123!");
                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, user.Id),
                        new Claim(ClaimTypes.Email, user.Email),
                        new Claim(ClaimTypes.Role, string.IsNullOrEmpty(user.Role) ? "viewer" : user.Role.ToLower()),
                        new Claim("Position", user.Position ?? "Người xem")
                    }),
                    Expires = DateTime.UtcNow.AddDays(7),
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
                };

                var token = tokenHandler.CreateToken(tokenDescriptor);

                return Ok(new
                {
                    token = tokenHandler.WriteToken(token),
                    user = new { id = user.Id, fullName = user.FullName, email = user.Email, avatarUrl = user.AvatarUrl }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ Lỗi GitHub Login: " + ex.Message);
                return BadRequest(new { message = "Lỗi kết nối đến máy chủ GitHub." });
            }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto payload)
        {
            try
            {
                await _authService.ForgotPasswordAsync(payload);
                return Ok(new { message = "Nếu email tồn tại trong hệ thống, một liên kết khôi phục đã được gửi!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}