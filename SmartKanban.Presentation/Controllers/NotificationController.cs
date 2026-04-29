using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SmartKanban.Domain.Entities;
using SmartKanban.Domain.Interfaces;
using SmartKanban.Presentation.Hubs;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SmartKanban.Presentation.Controllers
{
    [Route("api/v1/notifications")]
    [ApiController]
    [Authorize] 
    public class NotificationController : ControllerBase
    {
        private readonly INotificationRepository _notificationRepo;
        private readonly IHubContext<KanbanHub> _hubContext;

        public NotificationController(INotificationRepository notificationRepo, IHubContext<KanbanHub> hubContext)
        {
            _notificationRepo = notificationRepo;
            _hubContext = hubContext;
        }

        // 1. Lấy danh sách thông báo của tôi
        [HttpGet]
        public async Task<IActionResult> GetMyNotifications()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var notifications = await _notificationRepo.GetByUserIdAsync(userId);
            var unreadCount = await _notificationRepo.GetUnreadCountAsync(userId);

            return Ok(new { notifications, unreadCount });
        }

        // 2. Đánh dấu 1 thông báo là đã đọc
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(string id)
        {
            await _notificationRepo.MarkAsReadAsync(id);
            return Ok(new { message = "Đã đọc" });
        }

        // 3. Đánh dấu TẤT CẢ là đã đọc
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            await _notificationRepo.MarkAllAsReadAsync(userId);
            return Ok(new { message = "Đã dọn sạch thông báo" });
        }

        // 4. API DÙNG ĐỂ TEST CHUÔNG 
        [HttpPost("test-chuong")]
        [AllowAnonymous]
        public async Task<IActionResult> TestTingTing([FromBody] string targetUserId)
        {
            // A. Ghi vào sổ Database
            var newNoti = new Notification
            {
                UserId = targetUserId,
                Message = "🔔 Ê dậy đi sếp Sang, có task mới nóng hổi nè!",
                LinkUrl = "/dashboard" 
            };
            await _notificationRepo.CreateAsync(newNoti);

            // B. Kích hoạt trạm phát sóng SignalR để bắn thẳng vào màn hình người nhận
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", newNoti);

            return Ok(new { message = "Đã rung chuông thành công!" });
        }
    }
}