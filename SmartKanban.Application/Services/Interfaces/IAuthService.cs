using SmartKanban.Application.DTOs.Auth;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SmartKanban.Application.Services.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> LoginAsync(LoginDto payload);
        Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginDto payload);
        Task<AuthResponseDto> GitHubLoginAsync(GitHubLoginDto payload);
        Task ForgotPasswordAsync(ForgotPasswordDto payload);
    }
}
