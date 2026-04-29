using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using SmartKanban.Domain.Entities;

namespace SmartKanban.Domain.Interfaces
{
    public interface IBoardRepository
    {
        Task<Board> GetByIdAsync(string id);
        Task<IEnumerable<Board>> GetAllAsync();
        Task<long> CountTotalAsync();
        Task CreateAsync(Board board);
        Task UpdateAsync(string id, Board board);
        Task DeleteAsync(string id);
        Task<IEnumerable<Board>> GetBoardsForUserAsync(string userId);
    }
}
