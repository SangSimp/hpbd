using SmartKanban.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmartKanban.Domain.Interfaces
{
    public interface INotificationRepository
    {
        Task<IEnumerable<Notification>> GetByUserIdAsync(string userId);

        Task<long> GetUnreadCountAsync(string userId);

        Task CreateAsync(Notification notification);

        Task MarkAsReadAsync(string notificationId);

        Task MarkAllAsReadAsync(string userId);
    }
}