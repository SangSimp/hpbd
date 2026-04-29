using SmartKanban.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SmartKanban.Domain.Interfaces
{
    public interface ICardRepository
    {
        Task<Card> GetByIdAsync(string id);
        Task<IEnumerable<Card>> GetAllAsync();
        Task<long> CountTotalAsync();
        Task CreateAsync(Card card);
        Task UpdateAsync(string id, Card card);
        Task DeleteAsync(string id);
        Task<IEnumerable<Card>> GetCardsByColumnIdAsync(string columnId);
        Task<Card> GetCardByIdAsync(string id);
        Task UpdateCardAsync(string id, Card card);
    }
}
