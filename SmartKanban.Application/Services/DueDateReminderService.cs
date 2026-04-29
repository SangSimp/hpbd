using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MailKit.Net.Smtp;
using MimeKit;

namespace SmartKanban.Application.Services
{

    public class DueDateReminderService : BackgroundService
    {
        private readonly ILogger<DueDateReminderService> _logger;

        public DueDateReminderService(ILogger<DueDateReminderService> logger)
        {
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🚀 [ROBOT] Hệ thống Gửi Email Tự Động đã sẵn sàng!");

            try
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    _logger.LogWarning("⏰ [ROBOT] Đang kiểm tra công việc trễ hạn lúc: {time}", DateTimeOffset.Now.ToString("HH:mm:ss"));

                    try
                    {
                        SendReminderEmail("sang_dth225740@student.agu.edu.vn", "Thẻ công việc của bạn sắp trễ hạn!");
                        _logger.LogInformation("✅ [ROBOT] Đã gửi Email cảnh báo thành công!");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"❌ [ROBOT] Lỗi gửi mail: {ex.Message}");
                    }

                    await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
                }
            } catch (TaskCanceledException)
            {
                _logger.LogInformation("🛑 [ROBOT] Hệ thống Gửi Email Tự Động đang tắt...");
            }
        }

        private void SendReminderEmail(string toEmail, string subject)
        {
            var email = new MimeMessage();

            email.From.Add(new MailboxAddress("Trello Clone Admin", "gmail_cua_ban@gmail.com"));

            email.To.Add(new MailboxAddress("Thành viên", toEmail));

            email.Subject = subject;
            email.Body = new TextPart(MimeKit.Text.TextFormat.Html)
            {
                Text = "<h3>Báo động đỏ!</h3><p>Sếp ơi, có một công việc trên bảng Kanban đang chờ xử lý gấp. Vào check ngay nhé!</p>"
            };

            using var smtp = new SmtpClient();
            smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

            smtp.Connect("smtp.gmail.com", 587, MailKit.Security.SecureSocketOptions.StartTls);

            smtp.Authenticate("sang_dth225740@student.agu.edu.vn", "njihrtapiaxsheyy");

            smtp.Send(email);
            smtp.Disconnect(true);
        }
    }
}
