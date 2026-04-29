using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SmartKanban.Domain.Entities;
using SmartKanban.Domain.Interfaces;
using SmartKanban.Presentation.Hubs;
using System.Security.Claims;

namespace SmartKanban.Presentation.Controllers
{
    [Route("api/v1/columns")]
    [ApiController]
    [Authorize]
    public class ColumnController : ControllerBase
    {
        private readonly IColumnRepository _columnRepository;
        private readonly IHubContext<KanbanHub> _hubContext;
        private readonly IBoardRepository _boardRepository; 

        public ColumnController(IColumnRepository columnRepository, IHubContext<KanbanHub> hubContext, IBoardRepository boardRepository)
        {
            _columnRepository = columnRepository;
            _hubContext = hubContext;
            _boardRepository = boardRepository;
        }

        public class CreateColumnDto
        {
            public string BoardId { get; set; } = string.Empty;
            public string Title { get; set; } = string.Empty;
        }

        [HttpPost]
        public async Task<IActionResult> CreateColumn([FromBody] CreateColumnDto payload)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var board = await _boardRepository.GetByIdAsync(payload.BoardId);
            if (board?.ViewerIds != null && board.ViewerIds.Contains(currentUserId))
                return StatusCode(403, "Khách không có quyền thêm cột!");

            if (string.IsNullOrWhiteSpace(payload.Title))
                return BadRequest(new { message = "Tên cột không được để trống." });

            var newColumn = new Column
            {
                BoardId = payload.BoardId,
                Title = payload.Title,
                CreatedAt = DateTime.UtcNow,
                CardOrderIds = new List<string>()
            };

            await _columnRepository.CreateAsync(newColumn);
            await _hubContext.Clients.All.SendAsync("ReceiveBoardUpdate", payload.BoardId);

            return Ok(newColumn);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteColumn(string id)
        {
            // ==========================================
            // 🛡️ CHỐT CHẶN BẢO MẬT (BROKEN ACCESS CONTROL)
            // ==========================================

            // 1. Lấy ID của người đang request (Được trích xuất từ cái Token sếp đang cầm)
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized("Không nhận diện được người dùng.");

            // 2. Lấy thông tin cột đang bị nhắm mục tiêu
            var column = await _columnRepository.GetByIdAsync(id);
            if (column == null) return NotFound("Không tìm thấy cột này.");

            // 3. Lấy thông tin Bảng chứa cột đó ra để đối chiếu danh sách
            var board = await _boardRepository.GetByIdAsync(column.BoardId);
            if (board == null) return NotFound("Không tìm thấy bảng chứa cột này.");

            // 4. KIỂM TRA DANH TÍNH: Bổ sung quyền Admin
            var role = User.Claims.FirstOrDefault(c => c.Type.ToLower().Contains("role"))?.Value?.ToLower();
            bool isAdmin = role == "admin"; // 💡 THÊM ADMIN VÀO ĐÂY
            bool isOwner = board.OwnerId == currentUserId;
            bool isMember = board.MemberIds != null && board.MemberIds.Contains(currentUserId);

            // 💡 CHỈ CHẶN KHI: Không phải Admin, Không phải Chủ, Không phải Thành viên
            if (!isAdmin && !isOwner && !isMember)
            {
                Console.WriteLine($"[CẢNH BÁO BẢO MẬT] User {currentUserId} vừa cố gắng xóa trộm cột của Board {board.Id}");
                return StatusCode(403, new { message = "Lỗi bảo mật: Bạn chưa được mời vào bảng này nên không có quyền xóa cột!" });
            }
            // ==========================================

            // 5. Nếu qua được chốt kiểm tra, cho phép xóa bình thường!
            await _columnRepository.DeleteAsync(id);

            await _hubContext.Clients.All.SendAsync("ReceiveBoardUpdate", column.BoardId);

            return Ok(new { message = "Đã xóa cột thành công." });
        }

        public class UpdateColumnDto
        {
            public string Title { get; set; } = string.Empty;
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateColumn(string id, [FromBody] UpdateColumnDto payload)
        {
            var column = await _columnRepository.GetByIdAsync(id);
            if (column == null) return NotFound(new { message = "Không tìm thấy cột!" });

            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var board = await _boardRepository.GetByIdAsync(column.BoardId);
            if (board?.ViewerIds != null && board.ViewerIds.Contains(currentUserId))
                return StatusCode(403, "Khách không có quyền sửa cột!");

            if (string.IsNullOrWhiteSpace(payload.Title)) return BadRequest(new { message = "Tên cột không hợp lệ!" });

            column.Title = payload.Title;
            await _columnRepository.UpdateAsync(id, column);
            await _hubContext.Clients.All.SendAsync("ReceiveBoardUpdate", column.BoardId);

            return Ok(new { message = "Cập nhật thành công!", column });
        }
        [HttpPut("{id}/workflow")]
        public async Task<IActionResult> UpdateColumnWorkflow(string id, [FromBody] List<string> allowedNextColumnIds)
        {
            var column = await _columnRepository.GetByIdAsync(id);
            if (column == null) return NotFound("Không tìm thấy cột.");

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var board = await _boardRepository.GetByIdAsync(column.BoardId);
            var userRole = User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value?.ToLower();

            if (board.OwnerId != currentUserId && userRole != "admin")
            {
                return StatusCode(403, new { message = "Chỉ Quản trị viên dự án mới có quyền cấu hình luồng làm việc!" });
            }

            column.AllowedNextColumnIds = allowedNextColumnIds ?? new List<string>();
            await _columnRepository.UpdateAsync(id, column);

            return Ok(new { message = "✅ Đã lưu cấu hình luồng làm việc thành công!", column });
        }
    }
}