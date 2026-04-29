using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartKanban.Domain.Entities;
using SmartKanban.Domain.Interfaces;
using SmartKanban.Infrastructure.Data;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmartKanban.Infrastructure.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly IMongoCollection<Notification> _notifications;

        public NotificationRepository(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _notifications = database.GetCollection<Notification>("Notifications");
        }

        public async Task<IEnumerable<Notification>> GetByUserIdAsync(string userId) =>
            await _notifications.Find(n => n.UserId == userId)
                                .SortByDescending(n => n.CreatedAt) 
                                .ToListAsync();

        public async Task<long> GetUnreadCountAsync(string userId) =>
            await _notifications.CountDocumentsAsync(n => n.UserId == userId && !n.IsRead);

        public async Task CreateAsync(Notification notification) =>
            await _notifications.InsertOneAsync(notification);

        public async Task MarkAsReadAsync(string notificationId)
        {
            var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
            await _notifications.UpdateOneAsync(n => n.Id == notificationId, update);
        }

        public async Task MarkAllAsReadAsync(string userId)
        {
            var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
            await _notifications.UpdateManyAsync(n => n.UserId == userId && !n.IsRead, update);
        }
    }
}