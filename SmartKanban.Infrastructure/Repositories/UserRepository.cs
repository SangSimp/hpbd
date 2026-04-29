using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartKanban.Domain.Entities;
using SmartKanban.Domain.Interfaces;
using SmartKanban.Infrastructure.Data;

namespace SmartKanban.Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly IMongoCollection<User> _users;
        public UserRepository(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _users = database.GetCollection<User>("Users");
        }
        public async Task<User> GetByIdAsync(string id) =>
            await _users.Find(user => user.Id == id).FirstOrDefaultAsync();
        public async Task<User> GetByEmailAsync(string email) =>
            await _users.Find(u => u.Email == email).FirstOrDefaultAsync();
        public async Task<IEnumerable<User>> GetAllAsync() =>
            await _users.Find(user => true).ToListAsync();
        public async Task CreateAsync(User user) =>
            await _users.InsertOneAsync(user);
        public async Task UpdateAsync(string id, User user) =>
            await _users.ReplaceOneAsync(u => u.Id == id, user);
        public async Task DeleteAsync(string id) =>
            await _users.DeleteOneAsync(user => user.Id == id);
        public async Task<long> CountTotalAsync() =>
            await _users.CountDocumentsAsync(user => true);
    }
}
