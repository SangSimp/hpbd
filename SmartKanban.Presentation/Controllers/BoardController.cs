using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartKanban.Domain.Entities;
using SmartKanban.Domain.Interfaces;
using SmartKanban.Infrastructure.Data;
using SmartKanban.Presentation.Hubs;
using System.Security.Claims;

namespace SmartKanban.Presentation.Controllers
{
    [Route("api/v1/boards")]
    [ApiController]
    [Authorize]
    public class BoardController : ControllerBase
    {
        private readonly IBoardRepository _boardRepository;
        private readonly IColumnRepository _columnRepository;
        private readonly ICardRepository _cardRepository;
        private readonly IMongoCollection<BoardActivity> _activityCollection;
        private readonly IHubContext<KanbanHub> _hubContext;
        private readonly IUserRepository _userRepository;

        public BoardController(
            IBoardRepository boardRepository,
            IColumnRepository columnRepository,
            ICardRepository cardRepository,
            IUserRepository userRepository,
            IHubContext<KanbanHub> hubContext,
            IOptions<MongoDbSettings> settings)
        {
            _boardRepository = boardRepository;
            _columnRepository = columnRepository;
            _cardRepository = cardRepository;
            _userRepository = userRepository;
            _hubContext = hubContext;
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _activityCollection = database.GetCollection<BoardActivity>("Activities");
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetBoardById(string id)
        {
            if (string.IsNullOrEmpty(id) || id == "undefined" || id.Length != 24)
                return BadRequest(new { message = "Lỗi: ID dự án không hợp lệ!" });

            var board = await _boardRepository.GetByIdAsync(id);
            if (board == null) return NotFound("Bảng không tồn tại!");

            var rawColumns = await _columnRepository.GetColumnsByBoardIdAsync(id);
            var columns = rawColumns.ToList();

            // =========================================================
            // 💡 FIX LỖI GIẬT NGƯỢC: SẮP XẾP CỘT TRƯỚC KHI TRẢ VỀ FRONTEND
            // =========================================================
            if (board.ColumnOrderIds != null && board.ColumnOrderIds.Any())
            {
                columns = columns.OrderBy(c => {
                    var index = board.ColumnOrderIds.IndexOf(c.Id);
                    return index == -1 ? int.MaxValue : index; // Cột mới tạo chưa có order thì cho xuống cuối
                }).ToList();
            }

            var columnDataList = new List<object>();
            foreach (var col in columns)
            {
                var cards = await _cardRepository.GetCardsByColumnIdAsync(col.Id);
                // (Tùy chọn: Sếp cũng có thể sort thẻ ở đây theo card.Position nếu cần)
                cards = cards.OrderBy(c => c.Position).ToList();

                columnDataList.Add(new
                {
                    id = col.Id,
                    title = col.Title,
                    allowedNextColumnIds = col.AllowedNextColumnIds ?? new List<string>(),
                    isDoneColumn = col.IsDoneColumn, // 💡 Trả về cờ Hoàn thành cho Frontend
                    cards = cards
                });
            }
            return Ok(new { board = board, columns = columnDataList });
        }

        [HttpGet]
        public async Task<IActionResult> GetMyWorkspace()
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var myBoards = await _boardRepository.GetAllAsync();
            return Ok(myBoards);
        }

        [HttpPost]
        public async Task<IActionResult> CreateBoard([FromBody] Board newBoard)
        {
            var roleClaim = User.Claims.FirstOrDefault(c => c.Type.ToLower().Contains("role"))?.Value;
            if (!string.IsNullOrEmpty(roleClaim) && roleClaim.ToLower() == "viewer")
            {
                return StatusCode(403, new { message = "Bạn chỉ là Viewer, không được tạo bảng đâu nhé!" });
            }
            newBoard.OwnerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            newBoard.CreatedAt = DateTime.UtcNow;

            if (newBoard.MemberIds == null) newBoard.MemberIds = new List<string>();

            await _boardRepository.CreateAsync(newBoard);
            await _hubContext.Clients.All.SendAsync("ReceiveBoardUpdate", newBoard.Id);
            return Created($"/api/v1/boards/{newBoard.Id}", newBoard);
        }

        public class InviteMemberDto
        {
            public string Email { get; set; } = string.Empty;
        }

        [HttpPost("{boardId}/invite")]
        public async Task<IActionResult> InviteMemberToBoard(string boardId, [FromBody] InviteMemberDto payload)
        {
            var board = await _boardRepository.GetByIdAsync(boardId);
            if (board == null) return NotFound(new { message = "Không tìm thấy bảng này!" });

            var userToInvite = await _userRepository.GetByEmailAsync(payload.Email);
            if (userToInvite == null) return BadRequest(new { message = "Email này chưa có trên hệ thống Smart Kanban!" });

            if ((board.MemberIds != null && board.MemberIds.Contains(userToInvite.Id)) || board.OwnerId == userToInvite.Id)
            {
                return BadRequest(new { message = "Thành viên này đã ở trong bảng rồi sếp ơi!" });
            }

            if (board.MemberIds == null) board.MemberIds = new List<string>();
            board.MemberIds.Add(userToInvite.Id);

            await _boardRepository.UpdateAsync(boardId, board);

            return Ok(new { message = $"Đã mời {userToInvite.FullName} vào bảng thành công!" });
        }

        [HttpPut("{id}/column-order")]
        public async Task<IActionResult> UpdateColumnOrder(string id, [FromBody] List<string> columnOrderIds)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var boardForAuth = await _boardRepository.GetByIdAsync(id);
            if (boardForAuth?.ViewerIds != null && boardForAuth.ViewerIds.Contains(currentUserId))
            {
                return StatusCode(403, "Bạn chỉ là Khách xem bảng, không có quyền thực hiện thao tác này!");
            }
            var board = await _boardRepository.GetByIdAsync(id);
            if (board == null) return NotFound(new { message = "Không tìm thấy bảng!" });

            board.ColumnOrderIds = columnOrderIds;
            await _boardRepository.UpdateAsync(id, board);

            // 💡 Nhắc nhở mọi người cập nhật lại bảng
            await _hubContext.Clients.All.SendAsync("ReceiveBoardUpdate", id);

            return Ok(new { message = "Đã lưu thứ tự cột thành công!" });
        }

        [HttpGet("{boardId}/activities")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBoardActivities(string boardId)
        {
            try
            {
                var activities = await _activityCollection.Find(a => a.BoardId == boardId)
                                                          .SortByDescending(a => a.CreatedAt)
                                                          .Limit(50)
                                                          .ToListAsync();
                return Ok(activities);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy lịch sử hoạt động", error = ex.Message });
            }
        }

        public class UpdateBgDto
        {
            public string BackgroundUrl { get; set; }
        }

        [HttpPost("{id}/upload-background")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadBackground(string id, IFormFile file)
        {
            var board = await _boardRepository.GetByIdAsync(id);
            if (board == null) return NotFound();

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var role = User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value?.ToLower();

            if (role != "admin" && board.OwnerId != currentUserId) return StatusCode(403, "Sếp không có quyền!");

            if (file == null || file.Length == 0) return BadRequest("Sếp chưa chọn ảnh!");

            try
            {
                var account = new CloudinaryDotNet.Account("dtkarm2mn", "754949217414843", "dDdXAhGEmyZa6RTSb7U6XE6TyjQ");
                var cloudinary = new CloudinaryDotNet.Cloudinary(account);
                using var stream = file.OpenReadStream();
                var uploadParams = new CloudinaryDotNet.Actions.ImageUploadParams() { File = new CloudinaryDotNet.FileDescription(file.FileName, stream), Folder = "SmartKanban_Backgrounds" };
                var result = await cloudinary.UploadAsync(uploadParams);

                board.BackgroundUrl = result.SecureUrl.ToString();
                await _boardRepository.UpdateAsync(id, board);
                await _hubContext.Clients.All.SendAsync("ReceiveBoardUpdate", id);
                return Ok(new { backgroundUrl = board.BackgroundUrl });
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

            var myBoards = await _boardRepository.GetAllAsync();

            int totalBoards = myBoards.Count();
            int completedTasks = 0, dueSoonTasks = 0, totalTasks = 0;
            int todo = 0, doing = 0, review = 0;

            var myTasks = new List<object>();
            var workloadDict = new Dictionary<string, int>();
            var productivityDict = new Dictionary<DayOfWeek, int>();

            DateTime now = DateTime.UtcNow.ToLocalTime();
            int diff = (7 + (now.DayOfWeek - DayOfWeek.Monday)) % 7;
            DateTime startOfWeek = now.Date.AddDays(-1 * diff);

            foreach (var board in myBoards)
            {
                var columns = await _columnRepository.GetColumnsByBoardIdAsync(board.Id);
                string firstColumnId = board.ColumnOrderIds?.FirstOrDefault();

                foreach (var col in columns)
                {
                    var cards = await _cardRepository.GetCardsByColumnIdAsync(col.Id);
                    totalTasks += cards.Count();

                    foreach (var card in cards)
                    {
                        bool isChecklistFull = card.Checklists != null && card.Checklists.Count > 0 && card.Checklists.All(c => c.IsCompleted);

                        // 💡 ĐÃ SỬA: Thay vì lastColumnId, dùng cờ IsDoneColumn chuẩn
                        bool isDone = col.IsDoneColumn || isChecklistFull;

                        bool isTodo = (col.Id == firstColumnId) && !isDone;
                        bool isDoing = !isDone && !isTodo;

                        if (isDone) completedTasks++;
                        else if (isDoing) doing++;
                        else todo++;

                        bool isMyTask = card.AssigneeIds != null && card.AssigneeIds.Contains(currentUserId);
                        if (isMyTask && !isDone)
                        {
                            myTasks.Add(new
                            {
                                id = card.Id,
                                title = card.Title,
                                project = board.Title,
                                status = isDoing ? "Đang làm" : (card.DueDate.HasValue && card.DueDate.Value < DateTime.UtcNow ? "Trễ hạn" : "Chờ xử lý"),
                                dueDate = card.DueDate,
                                color = isDoing ? "#ffbd2e" : (card.DueDate.HasValue && card.DueDate.Value < DateTime.UtcNow ? "#ef4444" : "#6ab0ff"),
                                boardId = board.Id,
                                boardName = board.Title
                            });
                        }

                        if (card.AssigneeIds != null && !isDone)
                        {
                            foreach (var uId in card.AssigneeIds)
                            {
                                if (!workloadDict.ContainsKey(uId)) workloadDict[uId] = 0;
                                workloadDict[uId]++;
                            }
                        }

                        if (!isDone && card.DueDate.HasValue)
                        {
                            var daysLeft = (card.DueDate.Value - DateTime.UtcNow).TotalDays;
                            if (daysLeft <= 3 && daysLeft >= 0) dueSoonTasks++;
                        }

                        if (isDone)
                        {
                            var completedDate = (card.CompletedAt ?? card.UpdatedAt ?? card.CreatedAt).ToLocalTime();
                            if (completedDate >= startOfWeek)
                            {
                                var day = completedDate.DayOfWeek;
                                if (!productivityDict.ContainsKey(day)) productivityDict[day] = 0;
                                productivityDict[day]++;
                            }
                        }
                    }
                }
            }

            int performance = totalTasks > 0 ? (int)Math.Round((double)completedTasks / totalTasks * 100) : 0;

            var teamWorkloadList = new List<object>();
            var colors = new[] { "#ff5f56", "#6ab0ff", "#ffbd2e", "#27c93f", "#8777D9" };
            int colorIdx = 0;
            foreach (var kvp in workloadDict)
            {
                string userName = "Thành viên";
                try
                {
                    var user = await _userRepository.GetByIdAsync(kvp.Key);
                    if (user != null) userName = user.FullName;
                }
                catch { }

                if (kvp.Key == currentUserId) userName += " (You)";

                teamWorkloadList.Add(new { name = userName, tasks = kvp.Value, color = colors[colorIdx % colors.Length] });
                colorIdx++;
            }
            if (teamWorkloadList.Count == 0) teamWorkloadList.Add(new { name = "Chưa phân bổ", tasks = 0, color = "#64748b" });

            var productivityList = new List<object>
            {
                new { name = "T2", task = productivityDict.ContainsKey(DayOfWeek.Monday) ? productivityDict[DayOfWeek.Monday] : 0 },
                new { name = "T3", task = productivityDict.ContainsKey(DayOfWeek.Tuesday) ? productivityDict[DayOfWeek.Tuesday] : 0 },
                new { name = "T4", task = productivityDict.ContainsKey(DayOfWeek.Wednesday) ? productivityDict[DayOfWeek.Wednesday] : 0 },
                new { name = "T5", task = productivityDict.ContainsKey(DayOfWeek.Thursday) ? productivityDict[DayOfWeek.Thursday] : 0 },
                new { name = "T6", task = productivityDict.ContainsKey(DayOfWeek.Friday) ? productivityDict[DayOfWeek.Friday] : 0 },
                new { name = "T7", task = productivityDict.ContainsKey(DayOfWeek.Saturday) ? productivityDict[DayOfWeek.Saturday] : 0 },
                new { name = "CN", task = productivityDict.ContainsKey(DayOfWeek.Sunday) ? productivityDict[DayOfWeek.Sunday] : 0 }
            };

            var boardIds = myBoards.Select(b => b.Id).ToList();
            var recentActivities = await _activityCollection.Find(a => boardIds.Contains(a.BoardId))
                                        .SortByDescending(a => a.CreatedAt).Limit(5).ToListAsync();
            var activitiesList = recentActivities.Select(a => new {
                user = a.UserName,
                action = a.Action,
                time = a.CreatedAt.AddHours(7).ToString("HH:mm dd/MM/yyyy")
            }).ToList();

            return Ok(new
            {
                activeBoards = totalBoards,
                completedTasks = completedTasks,
                dueSoonTasks = dueSoonTasks,
                performanceRate = performance,
                totalTasks = totalTasks,
                todoTasks = todo,
                doingTasks = doing,
                reviewTasks = review,
                myTasks = myTasks,
                teamWorkload = teamWorkloadList,
                productivity = productivityList,
                recentActivities = activitiesList
            });
        }

        [HttpGet("calendar-tasks")]
        public async Task<IActionResult> GetCalendarTasks()
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

            var myBoards = await _boardRepository.GetAllAsync();
            var calendarTasks = new List<object>();

            foreach (var board in myBoards)
            {
                var columns = await _columnRepository.GetColumnsByBoardIdAsync(board.Id);
                foreach (var col in columns)
                {
                    var cards = await _cardRepository.GetCardsByColumnIdAsync(col.Id);

                    // 💡 ĐÃ SỬA: Xóa hardcode "hoàn", "done" -> Dùng IsDoneColumn
                    bool isDone = col.IsDoneColumn;
                    string colTitle = col.Title.ToLower();
                    bool isDoing = !isDone && (colTitle.Contains("doing") || colTitle.Contains("đang") || colTitle.Contains("thực"));

                    foreach (var card in cards)
                    {
                        if (card.DueDate.HasValue)
                        {
                            string color = isDone ? "#27c93f" : (isDoing ? "#0c66e4" : "#ffbd2e");
                            string status = isDone ? "done" : (isDoing ? "doing" : "todo");

                            if (!isDone && card.DueDate.Value < DateTime.UtcNow)
                            {
                                color = "#ef4444";
                                status = "todo";
                            }

                            calendarTasks.Add(new
                            {
                                id = card.Id,
                                title = card.Title,
                                boardName = board.Title,
                                boardId = board.Id,
                                dueDate = card.DueDate,
                                status = status,
                                color = color
                            });
                        }
                    }
                }
            }
            return Ok(calendarTasks);
        }
    }
}