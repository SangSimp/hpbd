using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SmartKanban.Application.DTOs.Auth
{
    public class AuthResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public object User { get; set; } = null!;
    }

    public class GoogleLoginDto
    {
        public string Token { get; set; } = string.Empty;
    }

    public class GitHubLoginDto
    {
        public string Code { get; set; } = string.Empty;
    }
    public class ForgotPasswordDto
    {
        public string Email { get; set; } = string.Empty;
    }
}
