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
    public class CardRepository : ICardRepository
    {
        private readonly IMongoCollection<Card> _cards;


        public CardRepository(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _cards = database.GetCollection<Card>("Cards");
        }
        public async Task<IEnumerable<Card>> GetCardsByColumnIdAsync(string columnId)
        {
            return await _cards.Find(c => c.ColumnId == columnId)
                               .SortBy(c => c.Position)
                               .ToListAsync();
        }
        public async Task<Card> GetByIdAsync(string id) =>
            await _cards.Find(card => card.Id == id).FirstOrDefaultAsync();

        public async Task<IEnumerable<Card>> GetAllAsync() =>
            await _cards.Find(card => true).ToListAsync();

        public async Task CreateAsync(Card card) =>
            await _cards.InsertOneAsync(card);

        public async Task UpdateAsync(string id, Card card) =>
            await _cards.ReplaceOneAsync(b => b.Id == id, card);

        public async Task DeleteAsync(string id) =>
            await _cards.DeleteOneAsync(card => card.Id == id);
        public async Task<Card> GetByColumnIdsAsync(string columnIds) =>
            await _cards.Find(card => card.ColumnId == columnIds).FirstOrDefaultAsync();
        public async Task<long> CountTotalAsync() =>
           await _cards.CountDocumentsAsync(card => true);
        public async Task<Card> GetCardByIdAsync(string id)
        {
            return await _cards.Find(c => c.Id == id).FirstOrDefaultAsync();
        }

        public async Task UpdateCardAsync(string id, Card card)
        {
            await _cards.ReplaceOneAsync(c => c.Id == id, card);
        }
    }
}
