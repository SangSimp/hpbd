using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace SmartKanban.Application.Services
{
    public class AiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public AiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            var rawKey = configuration["Gemini:ApiKey"] ?? throw new Exception("Thiếu Gemini API Key!");
            _apiKey = rawKey.Replace("\"", "").Trim();
        }

        public async Task<string> GenerateChecklistAsync(string title, string description)
        {
            var prompt = $"Bạn là một chuyên gia quản lý dự án xuất sắc. Hãy phân tích công việc sau và chia nó thành 3 đến 5 bước nhỏ (checklist). Công việc: '{title}'. Mô tả chi tiết: '{description}'. YÊU CẦU BẮT BUỘC: Chỉ trả về đúng 1 mảng JSON, mỗi phần tử có định dạng đúng như sau: {{\"title\": \"tên bước\", \"isCompleted\": false}}. Không giải thích gì thêm, không trả về markdown.";

            var requestBody = new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } }
            };

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var url = $"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={_apiKey}";

            int maxRetries = 3;
            int delayMs = 2000; 

            for (int i = 0; i < maxRetries; i++)
            {
                var response = await _httpClient.PostAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    var responseString = await response.Content.ReadAsStringAsync();
                    using var jsonDoc = JsonDocument.Parse(responseString);

                    var textResult = jsonDoc.RootElement
                        .GetProperty("candidates")[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text").GetString();

                    if (textResult == null) return "[]";
                    return textResult.Replace("```json", "").Replace("```", "").Trim();
                }


                if ((int)response.StatusCode == 503)
                {
                    if (i == maxRetries - 1) 
                    {
                        throw new Exception("Hệ thống AI của Google đang quá tải diện rộng. Sếp vui lòng thử lại sau ít phút nhé!");
                    }

                    Console.WriteLine($"[CẢNH BÁO] Google đang bận, tự động thử lại lần {i + 1} sau {delayMs}ms...");
                    await Task.Delay(delayMs);
                    delayMs *= 2; 
                    continue;
                }

                var errorDetail = await response.Content.ReadAsStringAsync();
                throw new Exception($"Mã lỗi Google: {response.StatusCode} - CHI TIẾT: {errorDetail}");
            }

            return "[]";
        }
    }
}