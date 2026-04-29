using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SmartKanban.Application.DTOs;
using SmartKanban.Application.DTOs.Auth;
using SmartKanban.Application.Services.Interfaces;
using SmartKanban.Domain.Entities;
using SmartKanban.Domain.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace SmartKanban.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IConfiguration _configuration;

        public AuthService(IUserRepository userRepository, IConfiguration configuration)
        {
            _userRepository = userRepository;
            _configuration = configuration;
        }

        // ===============================================
        // 1. ĐĂNG NHẬP BẰNG FORM TRUYỀN THỐNG (EMAIL/PASS)
        // ===============================================
        public async Task<AuthResponseDto> LoginAsync(LoginDto payload)
        {
            var user = await _userRepository.GetByEmailAsync(payload.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(payload.Password, user.PasswordHash))
                throw new Exception("Sai thông tin đăng nhập.");

            if (!user.IsActive)
                throw new Exception("Tài khoản đã bị khóa.");

            return GenerateAuthResponse(user);
        }

        // ===============================================
        // 2. ĐĂNG NHẬP GOOGLE (DÙNG ACCESS TOKEN TỪ REACT)
        // ===============================================
        public async Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginDto payload)
        {
            try
            {
                // ==========================================
                // 1. CẦM ACCESS TOKEN LÊN HỎI GOOGLE
                // ==========================================
                using var httpClient = new HttpClient();

                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", payload.Token);

                var response = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");

                if (!response.IsSuccessStatusCode)
                {
                    throw new Exception("Mã truy cập Google không hợp lệ hoặc đã hết hạn.");
                }

                var userInfo = await response.Content.ReadFromJsonAsync<JsonElement>();

                string email = userInfo.GetProperty("email").GetString();
                string fullName = userInfo.GetProperty("name").GetString();
                string avatarUrl = userInfo.TryGetProperty("picture", out var pic) && pic.ValueKind != JsonValueKind.Null ? pic.GetString() : "";

                // ==========================================
                // 2. KIỂM TRA DATABASE SMART KANBAN
                // ==========================================
                var user = await _userRepository.GetByEmailAsync(email);
                if (user == null)
                {
                    user = new User
                    {
                        FullName = fullName,
                        Email = email,
                        AvatarUrl = avatarUrl,
                        PasswordHash = "",
                        Role = "User",
                        IsActive = true
                    };
                    await _userRepository.CreateAsync(user);
                    user = await _userRepository.GetByEmailAsync(email); 
                }

                if (!user.IsActive)
                    throw new Exception("Tài khoản của bạn đã bị khóa.");

                // ==========================================
                // 3. CẤP THẺ CỦA SMART KANBAN VÀ MỞ CỬA
                // ==========================================
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "NotChuoiKyTuBiMatDaiVaAnToanChoSmartKanban123!");
                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, user.Id),
                        new Claim(ClaimTypes.Email, user.Email),
                        new Claim(ClaimTypes.Role, user.Role ?? "User")
                    }),
                    Expires = DateTime.UtcNow.AddDays(7),
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
                };

                var token = tokenHandler.CreateToken(tokenDescriptor);

                return new AuthResponseDto
                {
                    Token = tokenHandler.WriteToken(token),
                    User = new { id = user.Id, fullName = user.FullName, email = user.Email, avatarUrl = user.AvatarUrl }
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ Lỗi Google Login: " + ex.Message);
                throw new Exception("Lỗi xác thực từ Google.");
            }
        }

        // ===============================================
        // 3. ĐĂNG NHẬP GITHUB
        // ===============================================
        public async Task<AuthResponseDto> GitHubLoginAsync(GitHubLoginDto payload)
        {
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Add("Accept", "application/json");

            var tokenRequest = new Dictionary<string, string>
            {
                {"client_id", _configuration["GitHub:ClientId"]},
                {"client_secret", _configuration["GitHub:ClientSecret"]},
                {"code", payload.Code}
            };

            var tokenResponse = await httpClient.PostAsync("https://github.com/login/oauth/access_token", new FormUrlEncodedContent(tokenRequest));
            var tokenResult = await tokenResponse.Content.ReadFromJsonAsync<JsonElement>();

            if (!tokenResult.TryGetProperty("access_token", out var accessTokenElement))
                throw new Exception("Không lấy được mã từ GitHub.");

            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessTokenElement.GetString());
            httpClient.DefaultRequestHeaders.Add("User-Agent", "SmartKanbanApp");

            var userResponse = await httpClient.GetAsync("https://api.github.com/user");
            var userResult = await userResponse.Content.ReadFromJsonAsync<JsonElement>();

            string email = userResult.TryGetProperty("email", out var emailProp) && emailProp.ValueKind != JsonValueKind.Null ? emailProp.GetString() : null;
            if (string.IsNullOrEmpty(email))
            {
                var emailsResponse = await httpClient.GetAsync("https://api.github.com/user/emails");
                var emailsResult = await emailsResponse.Content.ReadFromJsonAsync<JsonElement[]>();
                email = emailsResult?.FirstOrDefault(e => e.GetProperty("primary").GetBoolean()).GetProperty("email").GetString();
            }

            string githubName = userResult.TryGetProperty("name", out var nameProp) && nameProp.ValueKind != JsonValueKind.Null ? nameProp.GetString() : userResult.GetProperty("login").GetString();
            string avatarUrl = userResult.GetProperty("avatar_url").GetString();

            var user = await CheckOrCreateUserAsync(email, githubName, avatarUrl);
            return GenerateAuthResponse(user);
        }

        // ===============================================
        // HÀM HỖ TRỢ: KIỂM TRA USER HOẶC TẠO MỚI
        // ===============================================
        private async Task<User> CheckOrCreateUserAsync(string email, string fullName, string avatarUrl)
        {
            var user = await _userRepository.GetByEmailAsync(email);
            if (user == null)
            {
                user = new User
                {
                    FullName = fullName,
                    Email = email,
                    AvatarUrl = avatarUrl,
                    PasswordHash = "",
                    Role = "User",
                    IsActive = true
                };
                await _userRepository.CreateAsync(user);
                user = await _userRepository.GetByEmailAsync(email);
            }

            if (!user.IsActive) throw new Exception("Tài khoản của bạn đã bị khóa.");
            return user;
        }

        // ===============================================
        // HÀM HỖ TRỢ: TẠO JWT TOKEN VÀ TRẢ VỀ DTO
        // ===============================================
        private AuthResponseDto GenerateAuthResponse(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "NotChuoiKyTuBiMatDaiVaAnToanChoSmartKanban123!");
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role ?? "User")
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return new AuthResponseDto
            {
                Token = tokenHandler.WriteToken(token),
                User = new { id = user.Id, fullName = user.FullName, email = user.Email, avatarUrl = user.AvatarUrl }
            };
        }
        public async Task ForgotPasswordAsync(ForgotPasswordDto payload)
        {
            var user = await _userRepository.GetByEmailAsync(payload.Email);

            if (user == null) return;

            string resetToken = Convert.ToBase64String(Encoding.UTF8.GetBytes(user.Id + ":" + DateTime.UtcNow.AddMinutes(15).Ticks));
            string resetLink = $"http://localhost:5173/reset-password?token={resetToken}";

            try
            {
                var mail = new MailMessage();
                mail.From = new MailAddress("sang_dth225740@student.agu.edu.vn", "Smart Kanban");
                mail.To.Add(payload.Email);
                mail.Subject = "🔐 Khôi phục mật khẩu Smart Kanban";
                mail.Body = $@"
                    <h3>Chào {user.FullName},</h3>
                    <p>Hệ thống nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn.</p>
                    <p>Vui lòng click vào liên kết bên dưới để đặt lại mật khẩu (Liên kết có hiệu lực 15 phút):</p>
                    <a href='{resetLink}' style='display:inline-block; padding:10px 20px; background-color:#0c66e4; color:white; text-decoration:none; border-radius:5px;'>Đặt lại mật khẩu</a>
                    <p>Nếu bạn không yêu cầu điều này, xin hãy bỏ qua email này.</p>";
                mail.IsBodyHtml = true;

                using var smtp = new SmtpClient("smtp.gmail.com", 587);

                smtp.Credentials = new System.Net.NetworkCredential("sang_dth225740@student.agu.edu.vn", "rjndzlnzxbeljooe");
                smtp.EnableSsl = true;

                await smtp.SendMailAsync(mail);
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ Lỗi gửi mail: " + ex.Message);
                throw new Exception("Không thể gửi email lúc này. Hãy thử lại sau.");
            }
        }
    }
}