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
    public class BoardRepository : IBoardRepository
    {
        private readonly IMongoCollection<Board> _boards;

        public BoardRepository(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _boards = database.GetCollection<Board>("Boards");
        }

        public async Task<Board> GetByIdAsync(string id) =>
            await _boards.Find(board => board.Id == id).FirstOrDefaultAsync();

        public async Task<IEnumerable<Board>> GetAllAsync() =>
            await _boards.Find(board => true).ToListAsync();

        public async Task CreateAsync(Board board) =>
            await _boards.InsertOneAsync(board);

        public async Task UpdateAsync(string id, Board board) =>
            await _boards.ReplaceOneAsync(b => b.Id == id, board);

        public async Task DeleteAsync(string id) =>
            await _boards.DeleteOneAsync(board => board.Id == id);
        public async Task<long> CountTotalAsync() =>
            await _boards.CountDocumentsAsync(board => true);
        public async Task<IEnumerable<Board>> GetBoardsForUserAsync(string userId)
        {
            return await _boards.Find(b =>
                b.OwnerId == userId ||
                (b.MemberIds != null && b.MemberIds.Contains(userId)) ||
                (b.ViewerIds != null && b.ViewerIds.Contains(userId))
            ).ToListAsync();
        }
    }
}
