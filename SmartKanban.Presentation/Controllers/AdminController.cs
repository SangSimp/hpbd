using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartKanban.Domain.Interfaces;
using System.Security.Claims;

namespace SmartKanban.Presentation.Controllers
{
    [Route("api/v1/admin")]
    [ApiController]
    [Authorize(Roles = "Admin")] 
    public class AdminController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IBoardRepository _boardRepository;
        private readonly ICardRepository _cardRepository;

        public AdminController(
            IUserRepository userRepository,
            IBoardRepository boardRepository,
            ICardRepository cardRepository)
        {
            _userRepository = userRepository;
            _boardRepository = boardRepository;
            _cardRepository = cardRepository;
        }

        // --------------------------------------------------------
        // UC10: Xem thống kê tổng quan hệ thống [cite: 423-425]
        // --------------------------------------------------------
        [HttpGet("statistics")]
        public async Task<IActionResult> GetSystemStatistics()
        {
            var totalUsers = (await _userRepository.GetAllAsync()).Count();
            var totalBoards = (await _boardRepository.GetAllAsync()).Count();
            var totalCards = (await _cardRepository.GetAllAsync()).Count(); 

            var stats = new
            {
                TotalUsers = totalUsers,
                TotalBoards = totalBoards,
                TotalCards = totalCards,
                Timestamp = DateTime.UtcNow
            };

            return Ok(stats); 
        }

        // --------------------------------------------------------
        // UC11: Quản lý và Đình chỉ tài khoản (Ban/Unban) [cite: 426-428]
        // --------------------------------------------------------
        [HttpPut("users/{targetUserId}/toggle-status")]
        public async Task<IActionResult> ToggleUserStatus(string targetUserId, [FromBody] bool isActive)
        {
            var currentAdminId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var targetUser = await _userRepository.GetByIdAsync(targetUserId);
            var totalUsers = await _userRepository.CountTotalAsync();
            if (targetUser == null)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            // Luồng phụ A1: Admin không được khóa tài khoản của một Admin khác (hoặc chính mình) 
            if (targetUser.Role == "Admin")
            {
                return StatusCode(403, new { message = "Không đủ thẩm quyền thao tác lên cấp tương đương." });
            }

            targetUser.IsActive = isActive;

            await _userRepository.UpdateAsync(targetUserId, targetUser);

            var actionName = isActive ? "Khôi phục" : "Đình chỉ";
            return Ok(new { message = $"Đã {actionName} tài khoản {targetUser.Email} thành công." });

        }
        [HttpGet("public/statistics")]
        [AllowAnonymous] 
        public async Task<IActionResult> GetPublicStatistics()
        {
            var totalUsers = await _userRepository.CountTotalAsync(); 
            var totalBoards = await _boardRepository.CountTotalAsync();

            return Ok(new
            {
                TotalUsers = totalUsers > 5000 ? totalUsers : 5000, 
                TotalBoards = totalBoards > 100 ? totalBoards : 145
            });
        }
    }
}