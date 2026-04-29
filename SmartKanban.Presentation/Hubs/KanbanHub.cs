using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection; // 💡 PHẢI CÓ THÊM DÒNG NÀY ĐỂ GỌI QUẢN LÝ KHO
using SmartKanban.Domain.Interfaces;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmartKanban.Presentation.Hubs
{
    [Authorize]
    public class KanbanHub : Hub
    {
        // 💡 1. THAY VÌ LẤY REPOSITORY, TA LẤY ÔNG QUẢN LÝ KHO (IServiceProvider)
        private readonly IServiceProvider _serviceProvider;
        private static readonly ConcurrentDictionary<string, string> _onlineUsers = new ConcurrentDictionary<string, string>();

        public KanbanHub(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        // 🟢 KHI CÓ NGƯỜI VỪA MỞ WEB (ONLINE)
        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;
            var connectionId = Context.ConnectionId;

            if (!string.IsNullOrEmpty(userId))
            {
                _onlineUsers.AddOrUpdate(userId, connectionId, (key, oldValue) => connectionId);
                await Clients.All.SendAsync("UserOnline", userId);
            }

            await base.OnConnectedAsync();
        }

        // 🔴 KHI CÓ NGƯỜI TẮT WEB HOẶC RỚT MẠNG (OFFLINE)
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.UserIdentifier;

            if (!string.IsNullOrEmpty(userId))
            {
                // Gạch tên khỏi sổ Nam Tào
                _onlineUsers.TryRemove(userId, out _);

                // 💡 2. TUYỆT CHIÊU TRỊ DISPOSED: TẠO MỘT LUỒNG LÀM VIỆC MỚI TINH!
                using (var scope = _serviceProvider.CreateScope())
                {
                    // Xin cấp một công cụ Repository hoàn toàn mới từ kho
                    var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();

                    // Tìm user và chốt giờ thoải mái không sợ bị sập
                    var user = await userRepository.GetByIdAsync(userId);
                    if (user != null)
                    {
                        user.UpdatedAt = DateTime.UtcNow;
                        await userRepository.UpdateAsync(userId, user);
                    }
                } // 💡 Xong việc ở đây là nó tự dọn rác sạch sẽ, không ảnh hưởng ai.

                // Phát loa
                await Clients.All.SendAsync("UserOffline", userId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        // 📡 API ĐỂ FRONTEND HỎI
        public IEnumerable<string> GetOnlineUsers()
        {
            return _onlineUsers.Keys;
        }

        // ==========================================
        // CÁC HÀM CŨ
        // ==========================================
        public async Task JoinBoard(string boardId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, boardId);
        }

        public async Task LeaveBoard(string boardId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, boardId);
        }
    }
}