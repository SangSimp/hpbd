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
    public class ColumnRepository : IColumnRepository
    {
        private readonly IMongoCollection<Column> _columns;

        public ColumnRepository(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _columns = database.GetCollection<Column>("Columns");
        }

        public async Task<Column> GetByIdAsync(string id) =>
            await _columns.Find(column => column.Id == id).FirstOrDefaultAsync();

        public async Task<IEnumerable<Column>> GetAllAsync() =>
            await _columns.Find(column => true).ToListAsync();

        public async Task CreateAsync(Column column) =>
            await _columns.InsertOneAsync(column);

        public async Task UpdateAsync(string id, Column column) =>
            await _columns.ReplaceOneAsync(b => b.Id == id, column);

        public async Task DeleteAsync(string id) =>
            await _columns.DeleteOneAsync(column => column.Id == id);
        public async Task<Column> GetByBoardIdAsync(string boardId) =>
            await _columns.Find(column => column.BoardId == boardId).FirstOrDefaultAsync();
        public async Task<IEnumerable<Column>> GetColumnsByBoardIdAsync(string boardId)
        {
            return await _columns.Find(c => c.BoardId == boardId).ToListAsync();
        }
    }
}
