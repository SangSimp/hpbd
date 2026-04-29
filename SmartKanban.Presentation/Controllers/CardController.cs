using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
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
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using static SmartKanban.Domain.Entities.Card;

namespace SmartKanban.Presentation.Controllers
{
    [Route("api/v1/cards")]
    [ApiController]
    [Authorize]
    public class CardController : ControllerBase
    {
        private readonly ICardRepository _cardRepository;
        private readonly IColumnRepository _columnRepository;
        private readonly IHubContext<KanbanHub> _hubContext;
        private readonly IMongoCollection<BoardActivity> _activityCollection;
        private readonly IBoardRepository _boardRepository;
        private readonly INotificationRepository _notificationRepo;
        private readonly IUserRepository _userRepository;

        public CardController(ICardRepository cardRepository, IColumnRepository columnRepository,
                              IHubContext<KanbanHub> hubContext, IOptions<MongoDbSettings> settings,
                              IBoardRepository boardRepository, INotificationRepository notificationRepo,
                              IUserRepository userRepository)
        {
            _cardRepository = cardRepository;
            _columnRepository = columnRepository;
            _hubContext = hubContext;
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _activityCollection = database.GetCollection<BoardActivity>("Activities");
            _boardRepository = boardRepository;
            _notificationRepo = notificationRepo;
            _userRepository = userRepository;
        }

        public class MoveCardDto
        {
            public string SourceColumnId { get; set; }
            public string DestColumnId { get; set; }
            public int NewIndex { get; set; }
            public double Position { get; set; }
            public string BoardId { get; set; }
        }

        [HttpPut("{id}/move")]
        public async Task<IActionResult> MoveCard(string id, [FromBody] MoveCardDto payload)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value?.ToLower();

            var card = await _cardRepository.GetByIdAsync(id);
            var destColumn = await _columnRepository.GetByIdAsync(payload.DestColumnId);
            var sourceColumn = await _columnRepository.GetByIdAsync(card.ColumnId);
            var board = await _boardRepository.GetByIdAsync(payload.BoardId);

            if (card == null || destColumn == null || sourceColumn == null || board == null) return NotFound();

            bool isAdminOrOwner = userRole == "admin" || board.OwnerId == currentUserId;

            // ==========================================================
            // 💡 QUY LUẬT 1: ĐÓNG BĂNG THẺ ĐÃ HOÀN THÀNH
            // ==========================================================
            bool isSourceDone = sourceColumn.IsDoneColumn;

            if (isSourceDone && sourceColumn.Id != destColumn.Id && !isAdminOrOwner)
            {
                return BadRequest(new { message = "🔒 Khóa két sắt! Thẻ đã hoàn thành không thể kéo ngược ra ngoài. Chỉ Quản trị viên mới có đặc quyền này." });
            }

            // ==========================================================
            // 💡 QUY LUẬT 2: CHỈ NGƯỜI PHỤ TRÁCH MỚI ĐƯỢC KÉO THẺ ĐI
            // ==========================================================
            if (!isAdminOrOwner && (card.AssigneeIds == null || !card.AssigneeIds.Contains(currentUserId)))
            {
                return BadRequest(new { message = "✋ Dừng lại! Bạn không được phân công làm thẻ này nên không có quyền kéo nó đi chỗ khác!" });
            }

            // ==========================================================
            // KIỂM TRA LUỒNG KHI THẺ DI CHUYỂN SANG CỘT MỚI
            // ==========================================================
            if (sourceColumn.Id != destColumn.Id)
            {
                // 💡 QUY LUẬT 3: BẮT BUỘC ĐIỀN ĐỦ THÔNG TIN MỚI CHO QUA CỔNG
                string cleanDesc = card.Description != null ? Regex.Replace(card.Description, "<.*?>", String.Empty).Trim() : "";

                if (string.IsNullOrWhiteSpace(card.Title) ||
                    string.IsNullOrWhiteSpace(cleanDesc) ||
                    card.Tags == null || card.Tags.Count == 0 ||
                    card.AssigneeIds == null || card.AssigneeIds.Count == 0 ||
                    card.Checklists == null || card.Checklists.Count == 0 ||
                    !card.StartDate.HasValue || !card.DueDate.HasValue)
                {
                    return BadRequest(new { message = "⚠️ THẺ CHƯA ĐẦY ĐỦ CHI TIẾT! Vui lòng mở thẻ lên và điền đủ (Mô tả, Nhãn, Phụ trách, Checklist, Khung thời gian) trước khi chuyển sang cột khác!" });
                }

                if (sourceColumn.AllowedNextColumnIds == null || !sourceColumn.AllowedNextColumnIds.Contains(destColumn.Id))
                {
                    return BadRequest(new { message = $"🚫 Sai quy trình! Từ cột '{sourceColumn.Title}' không được phép kéo trực tiếp sang '{destColumn.Title}'." });
                }

                // 💡 QUY LUẬT 4: GIỚI HẠN WIP - KHÔNG QUÁ 20 THẺ MỖI CỘT
                var cardsInDest = await _cardRepository.GetCardsByColumnIdAsync(destColumn.Id);
                if (cardsInDest.Count() >= 20)
                {
                    var limitNoti = new Notification
                    {
                        UserId = board.OwnerId,
                        Message = $"⚠️ Báo động: Cột '{destColumn.Title}' đang quá tải (vượt mốc 20 thẻ) tại dự án {board.Title}!",
                        LinkUrl = $"/d/boards/{board.Id}",
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false
                    };
                    await _notificationRepo.CreateAsync(limitNoti);
                    await _hubContext.Clients.All.SendAsync("ReceiveNotification", limitNoti);

                    return BadRequest(new { message = $"🔥 Cột '{destColumn.Title}' đã đầy (Tối đa 20 thẻ). Vui lòng dọn dẹp trước khi thêm mới!" });
                }
            }

            // 💡 QUY LUẬT 5: PHẢI HOÀN THÀNH CHECKLIST MỚI ĐƯỢC NGHIỆM THU
            bool isDestDone = destColumn.IsDoneColumn;
            if (isDestDone && card.Checklists != null && card.Checklists.Any(c => !c.IsCompleted))
            {
                return BadRequest(new { message = "🛑 Khoan đã! Thẻ này vẫn còn hạng mục Checklist chưa được tick xong. Không thể nghiệm thu (chuyển sang Hoàn thành)!" });
            }

            card.ColumnId = destColumn.Id;
            card.Position = payload.Position;
            card.UpdatedAt = DateTime.UtcNow;

            await _cardRepository.UpdateAsync(id, card);

            if (sourceColumn.Id != destColumn.Id && isDestDone)
            {
                var currentUser = await _userRepository.GetByIdAsync(currentUserId);
                var realName = currentUser?.FullName ?? "Một đồng đội";

                if (currentUserId != board.OwnerId)
                {
                    var doneNoti = new Notification
                    {
                        UserId = board.OwnerId,
                        Message = $"🎉 Tin vui: {realName} vừa hoàn thành xong thẻ '{card.Title}'!",
                        LinkUrl = $"/d/boards/{board.Id}",
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false
                    };
                    await _notificationRepo.CreateAsync(doneNoti);
                    await _hubContext.Clients.All.SendAsync("ReceiveNotification", doneNoti);
                }

                // Gửi Discord
                _ = SendDiscordDoneNotification(card.Title, board.Title, realName);
            }

            // ==========================================================
            // 🚀 BẮN SÓNG ĐỒNG BỘ (FIX LỖI DELAY CHO CÁC MÁY KHÁC)
            // ==========================================================
            await _hubContext.Clients.All.SendAsync("CardMoved", id, destColumn.Id);
            await _hubContext.Clients.All.SendAsync("ReceiveBoardUpdate", payload.BoardId); // Kích hoạt reload toàn mảng!

            return Ok(card);
        }

        public class CreateCardDto
        {
            public string ColumnId { get; set; } = string.Empty;
            public string Title { get; set; } = string.Empty;
        }

        [HttpPost]
        public async Task<IActionResult> CreateCard([FromBody] CreateCardDto payload, [FromQuery] string boardId)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value?.ToLower();

            var board = await _boardRepository.GetByIdAsync(boardId);
            if (board.ViewerIds != null && board.ViewerIds.Contains(currentUserId))
            {
                return StatusCode(403, "Bạn chỉ là Khách xem bảng, không có quyền tạo thẻ!");
            }

            bool isAdminOrOwner = userRole == "admin" || board.OwnerId == currentUserId;
            var targetColumn = await _columnRepository.GetByIdAsync(payload.ColumnId);

            if (targetColumn != null && targetColumn.IsDoneColumn && !isAdminOrOwner)
            {
                return StatusCode(403, new { message = "🔒 Khóa két sắt! Không được phép tạo thẻ 'cắm chốt' sẵn ở cột Hoàn thành. Hãy đi từ quy trình lên!" });
            }

            if (string.IsNullOrWhiteSpace(payload.Title))
            {
                return BadRequest(new { message = "⚠️ Tên thẻ không được để trống sếp ơi!" });
            }

            var newCard = new Card
            {
                ColumnId = payload.ColumnId,
                Title = payload.Title,
                CreatedAt = DateTime.UtcNow
            };

            await _cardRepository.CreateAsync(newCard);

            var currentUser = await _userRepository.GetByIdAsync(currentUserId);
            var realName = currentUser?.FullName ?? "Một đồng đội";

            try
            {
                var activity = new BoardActivity
                {
                    BoardId = boardId,
                    UserName = realName,
                    Action = $"vừa tạo thẻ mới: '{payload.Title}'",
                    CreatedAt = DateTime.UtcNow
                };
                await _activityCollection.InsertOneAsync(activity);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Lỗi ghi nhật ký tạo thẻ: " + ex.Message);
            }

            await _hubContext.Clients.All.SendAsync("ReceiveNotification", new
            {
                message = $"🚀 {realName} vừa tạo thẻ công việc mới: {payload.Title}",
                createdAt = DateTime.UtcNow,
                linkUrl = $"/d/boards/{boardId}",
            });

            await _hubContext.Clients.All.SendAsync("ReceiveBoardUpdate", boardId);
            _ = SendDiscordNotification(payload.Title, payload.ColumnId);
            return Ok(newCard);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCardDetails(string id, [FromBody] Card updateData, [FromQuery] string boardId)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!await HasAccessToCardAsync(id, currentUserId))
                return StatusCode(403, new { message = "Lỗi bảo mật: Không thể chỉnh sửa thẻ này vì bạn là khách!" });

            var board = await _boardRepository.GetByIdAsync(boardId);
            if (board.ViewerIds != null && board.ViewerIds.Contains(currentUserId))
            {
                return StatusCode(403, "Bạn chỉ là Khách xem bảng, không có quyền sửa thẻ!");
            }

            var existingCard = await _cardRepository.GetCardByIdAsync(id);
            if (existingCard == null) return NotFound("Không tìm thấy thẻ!");

            var userRole = User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value?.ToLower();
            bool isAdminOrOwner = userRole == "admin" || board.OwnerId == currentUserId;

            var column = await _columnRepository.GetByIdAsync(existingCard.ColumnId);
            if (column != null && column.IsDoneColumn && !isAdminOrOwner)
            {
                return StatusCode(403, new { message = "🔒 Thẻ này đã Hoàn thành! Chỉ Quản trị viên (Admin/Sếp) mới có quyền mở khóa để chỉnh sửa." });
            }

            // ==========================================================
            // 💡 CÁC LUẬT ÉP BUỘC ĐÃ NỚI LỎNG CHO PHÉP LƯU TẠM
            // ==========================================================
            if (string.IsNullOrWhiteSpace(updateData.Title))
                return BadRequest(new { message = "⚠️ Tên thẻ là bắt buộc!" });

            if (updateData.AssigneeIds != null && updateData.AssigneeIds.Count > 5)
                return BadRequest(new { message = "⚠️ Lỗi: Không được nhồi nhét quá 5 người phụ trách!" });

            if (updateData.Tags != null && updateData.Tags.Count > 10)
                return BadRequest(new { message = "⚠️ Lỗi: Tối đa 10 nhãn dán trên một thẻ!" });

            if (updateData.StartDate.HasValue && updateData.DueDate.HasValue)
            {
                if (updateData.StartDate.Value > updateData.DueDate.Value)
                    return BadRequest(new { message = "⚠️ Thời gian Bắt đầu không thể trễ hơn Kết thúc!" });
            }

            bool isTimeChanged =
                (existingCard.DueDate?.ToString("yyyy-MM-dd HH:mm") != updateData.DueDate?.ToString("yyyy-MM-dd HH:mm")) ||
                (existingCard.StartDate?.ToString("yyyy-MM-dd HH:mm") != updateData.StartDate?.ToString("yyyy-MM-dd HH:mm"));

            if (isTimeChanged && !isAdminOrOwner)
            {
                return StatusCode(403, new { message = "🚫 Cảnh báo: Chỉ Admin/Chủ bảng mới có quyền thay đổi Khung thời gian!" });
            }

            var currentUser = await _userRepository.GetByIdAsync(currentUserId);
            var realName = currentUser?.FullName ?? "Một đồng đội";

            var changes = new List<string>();

            if (existingCard.Title != updateData.Title) changes.Add($"đổi tên thẻ thành '{updateData.Title}'");
            if ((existingCard.Description ?? "") != (updateData.Description ?? "")) changes.Add("cập nhật mô tả");
            if ((existingCard.CoverUrl ?? "") != (updateData.CoverUrl ?? "")) changes.Add("đổi ảnh bìa");

            if (existingCard.StartDate?.ToString("yyyy-MM-dd HH:mm") != updateData.StartDate?.ToString("yyyy-MM-dd HH:mm")) changes.Add("cập nhật thời gian bắt đầu");
            if (existingCard.DueDate?.ToString("yyyy-MM-dd HH:mm") != updateData.DueDate?.ToString("yyyy-MM-dd HH:mm")) changes.Add("cập nhật hạn chót");

            var oldTags = existingCard.Tags ?? new List<string>();
            var newTags = updateData.Tags ?? new List<string>();
            var addedTags = newTags.Except(oldTags).ToList();
            var removedTags = oldTags.Except(newTags).ToList();
            if (addedTags.Any() || removedTags.Any())
            {
                var tagActions = new List<string>();
                if (addedTags.Any()) tagActions.Add($"thêm nhãn [{string.Join(", ", addedTags)}]");
                if (removedTags.Any()) tagActions.Add($"xóa nhãn [{string.Join(", ", removedTags)}]");
                changes.Add(string.Join(" và ", tagActions));
            }

            var oldAttachments = existingCard.Attachments ?? new List<string>();
            var newAttachments = updateData.Attachments ?? new List<string>();
            if (oldAttachments.Count != newAttachments.Count) changes.Add("cập nhật file/link đính kèm");

            var oldChecklists = existingCard.Checklists ?? new List<ChecklistItem>();
            var newChecklists = updateData.Checklists ?? new List<ChecklistItem>();
            if (oldChecklists.Count != newChecklists.Count)
                changes.Add("thêm/xóa mục checklist");
            else if (oldChecklists.Count(c => c.IsCompleted) != newChecklists.Count(c => c.IsCompleted))
                changes.Add("cập nhật tiến độ checklist");

            var oldAssignees = existingCard.AssigneeIds ?? new List<string>();
            var newAssignees = updateData.AssigneeIds ?? new List<string>();
            if (oldAssignees.Count != newAssignees.Count || oldAssignees.Except(newAssignees).Any() || newAssignees.Except(oldAssignees).Any())
                changes.Add("cập nhật người phụ trách");

            var filteredActivities = updateData.Activities?.Where(a => !a.StartsWith("🕒 Đã cập nhật")).ToList() ?? new List<string>();

            if (changes.Count > 0)
            {
                string finalAction = string.Join(", ", changes);
                var newActivityObj = new
                {
                    userId = currentUserId,
                    userName = realName,
                    action = finalAction,
                    timestamp = DateTime.UtcNow
                };
                string newActivityJson = JsonSerializer.Serialize(newActivityObj);
                filteredActivities.Insert(0, newActivityJson);

                try
                {
                    var boardActivity = new BoardActivity
                    {
                        BoardId = boardId,
                        UserName = realName,
                        Action = $"vừa {finalAction} tại thẻ '{updateData.Title}'",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _activityCollection.InsertOneAsync(boardActivity);
                }
                catch { /* Bỏ qua */ }
            }

            existingCard.Title = updateData.Title;
            existingCard.Description = updateData.Description;
            existingCard.Tags = updateData.Tags ?? new List<string>();
            existingCard.CoverUrl = updateData.CoverUrl;
            existingCard.Checklists = updateData.Checklists ?? new List<ChecklistItem>();
            existingCard.AssigneeIds = updateData.AssigneeIds ?? new List<string>();
            existingCard.Comments = updateData.Comments ?? new List<CommentItem>();
            existingCard.CommentCount = existingCard.Comments.Count;
            existingCard.StartDate = updateData.StartDate;
            existingCard.DueDate = updateData.DueDate;
            existingCard.Activities = filteredActivities;
            existingCard.Attachments = updateData.Attachments ?? existingCard.Attachments ?? new List<string>();
            existingCard.AttachmentCount = existingCard.Attachments.Count;
            existingCard.UpdatedAt = DateTime.UtcNow;

            await _cardRepository.UpdateCardAsync(id, existingCard);
            await _hubContext.Clients.All.SendAsync("ReceiveBoardUpdate", boardId);

            return Ok(existingCard);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCard(string id, [FromQuery] string boardId)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!await HasAccessToCardAsync(id, currentUserId))
                return StatusCode(403, new { message = "Lỗi bảo mật: Đừng hòng xóa trộm thẻ của người khác!" });

            var board = await _boardRepository.GetByIdAsync(boardId);
            if (board.ViewerIds != null && board.ViewerIds.Contains(currentUserId))
            {
                return StatusCode(403, "Bạn chỉ là Khách xem bảng, không có quyền xóa thẻ!");
            }
            var card = await _cardRepository.GetByIdAsync(id);
            if (card == null) return NotFound("Không tìm thấy thẻ!");

            await _cardRepository.DeleteAsync(id);

            var currentUser = await _userRepository.GetByIdAsync(currentUserId);
            var realName = currentUser?.FullName ?? "Một đồng đội";

            try
            {
                var activity = new BoardActivity
                {
                    BoardId = boardId,
                    UserName = realName,
                    Action = $"vừa xóa thẻ công việc '{card.Title}'",
                    CreatedAt = DateTime.UtcNow
                };
                await _activityCollection.InsertOneAsync(activity);

                await _hubContext.Clients.All.SendAsync("ReceiveNotification", new
                {
                    message = $"🗑️ Cảnh báo: {realName} vừa xóa thẻ {card.Title}!",
                    createdAt = DateTime.UtcNow,
                    linkUrl = $"/d/boards/{boardId}"
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine("Lỗi ghi nhật ký: " + ex.Message);
            }

            await _hubContext.Clients.All.SendAsync("ReceiveBoardUpdate", boardId);

            return Ok(new { message = "Đã xóa thẻ!" });
        }

        private async Task SendDiscordNotification(string cardTitle, string columnId)
        {
            try
            {
                string webhookUrl = "https://discord.com/api/webhooks/1484623126754234378/ohwJO8qe5yiy1TgIZa7C1B-DkN3dc3iy5X54UfQuBAlTQngOfE6V5RcX3-liaXO8Hbz9";
                var payload = new { content = $"🚀 Có một công việc mới toanh được thêm vào hệ thống:\n👉 **{cardTitle}**\nAnh em vào check ngay nhé!" };
                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                using var httpClient = new HttpClient();
                await httpClient.PostAsync(webhookUrl, content);
            }
            catch (Exception ex) { Console.WriteLine($"Lỗi bắn Discord: {ex.Message}"); }
        }

        private async Task SendDiscordDoneNotification(string cardTitle, string boardTitle, string doerName)
        {
            try
            {
                string webhookUrl = "https://discord.com/api/webhooks/1484623126754234378/ohwJO8qe5yiy1TgIZa7C1B-DkN3dc3iy5X54UfQuBAlTQngOfE6V5RcX3-liaXO8Hbz9";
                var payload = new { content = $"🎉 **NHIỆM VỤ HOÀN THÀNH** 🎉\nDự án: `{boardTitle}`\nCông việc: **{cardTitle}**\nThực hiện bởi: `{doerName}`\n👉 Sếp vào nghiệm thu nhé!" };
                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                using var httpClient = new HttpClient();
                await httpClient.PostAsync(webhookUrl, content);
            }
            catch (Exception ex) { Console.WriteLine($"Lỗi Discord: {ex.Message}"); }
        }

        [HttpPost("{id}/attachments")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadAttachment(string id, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("Sếp chưa chọn file kìa!");

            try
            {
                var account = new Account("dtkarm2mn", "754949217414843", "dDdXAhGEmyZa6RTSb7U6XE6TyjQ");
                var cloudinary = new Cloudinary(account);
                using var stream = file.OpenReadStream();
                string fileUrl = "";
                bool isImage = file.ContentType.StartsWith("image/");

                if (isImage)
                {
                    var uploadParams = new ImageUploadParams() { File = new FileDescription(file.FileName, stream), Folder = "SmartKanban_Attachments", UseFilename = true };
                    var uploadResult = await cloudinary.UploadAsync(uploadParams);
                    if (uploadResult.Error != null) return BadRequest($"Lỗi từ Cloudinary: {uploadResult.Error.Message}");
                    fileUrl = uploadResult.SecureUrl.ToString();
                }
                else
                {
                    var uploadParams = new RawUploadParams() { File = new FileDescription(file.FileName, stream), Folder = "SmartKanban_Attachments", UseFilename = true };
                    var uploadResult = await cloudinary.UploadAsync(uploadParams);
                    if (uploadResult.Error != null) return BadRequest($"Lỗi từ Cloudinary: {uploadResult.Error.Message}");
                    fileUrl = uploadResult.SecureUrl.ToString();
                }

                return Ok(new { url = fileUrl, message = "Lên mây thành công!" });
            }
            catch (Exception ex) { return StatusCode(500, $"Lỗi server: {ex.Message}"); }
        }

        public class CommentPayloadDto
        {
            public string Content { get; set; } = string.Empty;
        }

        [HttpPost("{id}/comments")]
        public async Task<IActionResult> AddComment(string id, [FromBody] CommentPayloadDto payload)
        {
            if (string.IsNullOrWhiteSpace(payload.Content)) return BadRequest("Bình luận không được để trống!");

            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!await HasAccessToCardAsync(id, currentUserId)) return StatusCode(403, new { message = "Lỗi bảo mật: Bạn không có quyền bình luận!" });

            var card = await _cardRepository.GetCardByIdAsync(id);
            if (card == null) return NotFound("Không tìm thấy thẻ!");

            var currentUser = await _userRepository.GetByIdAsync(currentUserId);
            var realName = currentUser?.FullName ?? "Một đồng đội";

            var newComment = new CommentItem
            {
                Id = Guid.NewGuid().ToString(),
                UserName = realName,
                Avatar = realName.Substring(0, 2).ToUpper(),
                Content = payload.Content,
                CreatedAt = DateTime.UtcNow
            };

            if (card.Comments == null) card.Comments = new List<CommentItem>();
            card.Comments.Add(newComment);
            card.CommentCount = card.Comments.Count;

            await _cardRepository.UpdateCardAsync(id, card);
            await _hubContext.Clients.All.SendAsync("ReceiveNewComment", new { cardId = id, comment = newComment });

            var column = await _columnRepository.GetByIdAsync(card.ColumnId);
            if (column != null) await _hubContext.Clients.All.SendAsync("ReceiveBoardUpdate", column.BoardId);

            var matches = Regex.Matches(payload.Content, @"@\[.*?\]\((.*?)\)");
            foreach (Match match in matches)
            {
                if (match.Groups.Count > 1)
                {
                    var mentionedUserId = match.Groups[1].Value;
                    var newNoti = new Notification
                    {
                        UserId = mentionedUserId,
                        Message = $"💬 Có người vừa nhắc tên bạn trong bình luận của thẻ '{card.Title}'",
                        LinkUrl = $"/d/boards/{column?.BoardId}",
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false
                    };
                    await _notificationRepo.CreateAsync(newNoti);
                    await _hubContext.Clients.All.SendAsync("ReceiveNotification", newNoti);
                }
            }
            return Ok(newComment);
        }

        private async Task<bool> HasAccessToCardAsync(string cardId, string userId)
        {
            if (string.IsNullOrEmpty(userId)) return false;

            var role = User.Claims.FirstOrDefault(c => c.Type.ToLower().Contains("role"))?.Value?.ToLower();
            if (role == "admin") return true;

            var card = await _cardRepository.GetCardByIdAsync(cardId);
            if (card == null) return false;
            var column = await _columnRepository.GetByIdAsync(card.ColumnId);
            if (column == null) return false;
            var board = await _boardRepository.GetByIdAsync(column.BoardId);
            if (board == null) return false;

            bool isOwner = board.OwnerId == userId;
            bool isMember = board.MemberIds != null && board.MemberIds.Contains(userId);
            return isOwner || isMember;
        }

        [HttpPost("{id}/upload-background")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadBackground(string id, IFormFile file)
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var boardForAuth = await _boardRepository.GetByIdAsync(id);
            if (boardForAuth?.ViewerIds != null && boardForAuth.ViewerIds.Contains(currentUserId))
                return StatusCode(403, "Bạn chỉ là Khách xem bảng, không có quyền đổi nền!");

            if (file == null || file.Length == 0) return BadRequest("Sếp chưa chọn file ảnh kìa!");

            try
            {
                var account = new Account("dtkarm2mn", "754949217414843", "dDdXAhGEmyZa6RTSb7U6XE6TyjQ");
                var cloudinary = new Cloudinary(account);
                using var stream = file.OpenReadStream();
                var uploadParams = new ImageUploadParams() { File = new FileDescription(file.FileName, stream), Folder = "SmartKanban_BoardBackgrounds" };
                var uploadResult = await cloudinary.UploadAsync(uploadParams);
                if (uploadResult.Error != null) return BadRequest($"Lỗi Cloudinary: {uploadResult.Error.Message}");

                string fileUrl = uploadResult.SecureUrl.ToString();
                boardForAuth.BackgroundUrl = fileUrl;
                await _boardRepository.UpdateAsync(id, boardForAuth);
                await _hubContext.Clients.All.SendAsync("ReceiveBoardUpdate", id);

                return Ok(new { message = "Lên mây thành công!", backgroundUrl = fileUrl });
            }
            catch (Exception ex) { return StatusCode(500, $"Lỗi server: {ex.Message}"); }
        }
    }
}