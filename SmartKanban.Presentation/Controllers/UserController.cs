using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartKanban.Domain.Entities;
using SmartKanban.Domain.Interfaces;
using SmartKanban.Infrastructure.Data;

namespace SmartKanban.Presentation.Controllers
{
    [Route("api/v1/users")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IMongoCollection<User> _userCollection;
        private readonly IUserRepository _userRepository;
        private readonly ICardRepository _cardRepository;
        // 💡 1. MỜI THÊM 2 ÔNG NÀY VÀO ĐỂ TÌM DỰ ÁN
        private readonly IBoardRepository _boardRepository;
        private readonly IColumnRepository _columnRepository;

        public UserController(
            IUserRepository userRepository,
            ICardRepository cardRepository,
            IBoardRepository boardRepository,   // 💡 Khai báo
            IColumnRepository columnRepository, // 💡 Khai báo
            IOptions<MongoDbSettings> settings)
        {
            _userRepository = userRepository;
            _cardRepository = cardRepository;
            _boardRepository = boardRepository;     // 💡 Gán biến
            _columnRepository = columnRepository;   // 💡 Gán biến

            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _userCollection = database.GetCollection<User>("Users");
        }
        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            try
            {
                var users = await _userCollection.Find(_ => true).ToListAsync();
                var allCards = await _cardRepository.GetAllAsync();

                var allBoards = await _boardRepository.GetAllAsync();

                // 💡 BẢN ĐỒ V3: Lưu cả thông tin Bảng (Board) lẫn Cột (Column)
                var columnInfoMap = new Dictionary<string, (Board board, Column column)>();
                foreach (var b in allBoards)
                {
                    var cols = await _columnRepository.GetColumnsByBoardIdAsync(b.Id);
                    foreach (var c in cols) columnInfoMap[c.Id] = (b, c);
                }

                var userList = users.Select(u => {
                    var myCards = allCards.Where(c => c.AssigneeIds != null && c.AssigneeIds.Contains(u.Id)).ToList();

                    // 💡 ĐÓNG GÓI THÊM TÊN CỘT (columnName)
                    var completedCards = myCards.Where(c => c.Checklists != null && c.Checklists.Count > 0 && c.Checklists.All(chk => chk.IsCompleted))
                        .Select(c => {
                            columnInfoMap.TryGetValue(c.ColumnId, out var info);
                            return new { title = c.Title, boardId = info.board?.Id, boardName = info.board?.Title ?? "Dự án ẩn", columnName = info.column?.Title ?? "Cột ẩn" };
                        }).ToList();

                    var doingCards = myCards.Where(c => c.Checklists == null || c.Checklists.Count == 0 || c.Checklists.Any(chk => !chk.IsCompleted))
                        .Select(c => {
                            columnInfoMap.TryGetValue(c.ColumnId, out var info);
                            return new { title = c.Title, boardId = info.board?.Id, boardName = info.board?.Title ?? "Dự án ẩn", columnName = info.column?.Title ?? "Cột ẩn" };
                        }).ToList();

                    return new
                    {
                        id = u.Id,
                        name = u.FullName,
                        email = u.Email,
                        role = string.IsNullOrEmpty(u.Role) ? "member" : u.Role.ToLower(),
                        position = string.IsNullOrEmpty(u.Position) ? "Nhân viên" : u.Position,
                        status = "offline",
                        joinedAt = u.CreatedAt.ToString("yyyy-MM-dd"),
                        lastActive = u.UpdatedAt,
                        tasks = myCards.Count,
                        completedTasks = completedCards,
                        doingTasks = doingCards
                    };
                });

                return Ok(userList);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
            }
        }
        public class UpdateRoleDto
        {
            public string Role { get; set; } = string.Empty;
        }

        [HttpPut("{id}/role")]
        public async Task<IActionResult> UpdateUserRole(string id, [FromBody] UpdateRoleDto payload)
        {
            try
            {
                var filter = Builders<User>.Filter.Eq(u => u.Id, id);
                var user = await _userCollection.Find(filter).FirstOrDefaultAsync();

                if (user == null) return NotFound("Không tìm thấy nhân sự!");

                var update = Builders<User>.Update.Set(u => u.Role, payload.Role.ToLower());
                await _userCollection.UpdateOneAsync(filter, update);

                return Ok(new { message = "Đã lưu quyền mới vào Database!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi server: " + ex.Message);
            }
        }

        public class UpdatePositionDto
        {
            public string Position { get; set; }
        }

        [HttpPut("{userId}/position")]
        public async Task<IActionResult> UpdatePosition(string userId, [FromBody] UpdatePositionDto payload)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound(new { message = "Không tìm thấy nhân sự này!" });

            user.Position = payload.Position;
            await _userRepository.UpdateAsync(userId, user);

            return Ok(new { message = "Đã cập nhật chức vụ thành công!", newPosition = user.Position });
        }
    }
}