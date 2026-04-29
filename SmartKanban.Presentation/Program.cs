using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using SmartKanban.Application.Services;
using SmartKanban.Application.Services.Interfaces;
using SmartKanban.Domain.Interfaces;
using SmartKanban.Infrastructure.Data;
using SmartKanban.Infrastructure.Repositories;
using SmartKanban.Presentation.Hubs;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Thêm cấu hình CORS (Đặt phần này ở trên cùng, trước var app = builder.Build();)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowViteApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Chính xác URL frontend của bạn
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // BẮT BUỘC PHẢI CÓ cho SignalR
    });
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// 1. Cấu hình lấy dữ liệu chuỗi kết nối MongoDB từ appsettings.json
builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection("MongoDbSettings"));

// 2. Đăng ký Dependency Injection (DI) cho các Repository
builder.Services.AddScoped<IBoardRepository, BoardRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IColumnRepository, ColumnRepository>(); // Thêm dòng này vào!
builder.Services.AddScoped<ICardRepository, CardRepository>();
builder.Services.AddHttpClient<AiService>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
// Khởi động Robot chạy ngầm nhắc việc
//builder.Services.AddHostedService<DueDateReminderService>();

// 3. Cấu hình JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "MotChuoiKyTuBiMatDaiVaAnToanChoSmartKanban123!";
// Cấu hình giải mã JWT Token
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])),
            ValidateIssuer = false,
            ValidateAudience = false
        };
        // 👇 THÊM TOÀN BỘ KHỐI EVENTS NÀY VÀO ĐỂ BẢO VỆ NHẬN THẺ TỪ SIGNALR 👇
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                // Chỉ định rõ đường dẫn của Hub
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/kanban"))
                {
                    // Lấy token từ URL nhét vào tay bảo vệ
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddControllers();

// Thêm vào phần đăng ký dịch vụ (phía trên builder.Build())
builder.Services.AddSignalR();
builder.Services.AddHttpClient<AiService>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173") // Cho phép React gọi sang
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials(); // Bắt buộc phải có để chạy được SignalR (Kéo thả Real-time)
        });
});
builder.Services.AddScoped<IAuthService, AuthService>();
// 1. ĐĂNG KÝ CORS (BẮT BUỘC NẰM TRÊN BƯỚC BUILD)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        builder => builder
            .WithOrigins("http://localhost:5173") // Cho phép React truy cập
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});
var app = builder.Build();
app.UseCors("AllowReactApp");

// Kích hoạt giao diện Swagger (thường chỉ dùng trong môi trường Development)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
// 4. Khai báo Middleware
app.UseRouting();
// 2. Kích hoạt CORS (NÊN đặt giữa UseRouting và UseAuthorization/MapHub)
app.UseCors("AllowViteApp");
app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<SmartKanban.Presentation.Hubs.KanbanHub>("/hubs/kanban");
app.Run();
