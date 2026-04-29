using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartKanban.Application.Services;
using SmartKanban.Domain.Entities;
using SmartKanban.Domain.Interfaces;
using System.Text.Json;

namespace SmartKanban.Presentation.Controllers
{
    [Route("api/v1/ai")]
    [ApiController]
    [Authorize] 
    public class AiController : ControllerBase
    {
        private readonly AiService _aiService;
        private readonly ICardRepository _cardRepository;

        public AiController(AiService aiService, ICardRepository cardRepository)
        {
            _aiService = aiService;
            _cardRepository = cardRepository;
        }

        public class AiBreakdownRequest
        {
            public string CardId { get; set; } = string.Empty;
        }

        [HttpPost("generate-checklist")]
        public async Task<IActionResult> GenerateChecklist([FromBody] AiBreakdownRequest request)
        {
            var card = await _cardRepository.GetByIdAsync(request.CardId);
            if (card == null) return NotFound(new { message = "Thẻ không tồn tại." });

            if (string.IsNullOrWhiteSpace(card.Title))
                return BadRequest(new { message = "Thẻ cần có tiêu đề để AI phân tích." });

            try
            {
                var jsonResponse = await _aiService.GenerateChecklistAsync(card.Title, card.Description);

                var aiChecklists = JsonSerializer.Deserialize<List<ChecklistItem>>(jsonResponse, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (aiChecklists != null && aiChecklists.Any())
                {
                    card.Checklists.AddRange(aiChecklists);
                    await _cardRepository.UpdateAsync(card.Id, card);
                    return StatusCode(201, card.Checklists);
                }

                return BadRequest(new { message = "AI không thể sinh ra danh sách hợp lệ." });
            }
            catch (Exception ex)
            {
                Console.WriteLine("LỖI AI THẬT SỰ LÀ: " + ex.Message);
                return StatusCode(503, new { message = "Hệ thống AI đang bận, vui lòng thử lại sau.", error = ex.Message });
            }
        }
    }
}