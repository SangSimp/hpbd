using SmartKanban.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SmartKanban.Domain.Interfaces
{
    public interface IColumnRepository
    {
        Task<Column> GetByIdAsync(string id);
        Task<IEnumerable<Column>> GetAllAsync();
        Task CreateAsync(Column column);
        Task UpdateAsync(string id, Column column);
        Task DeleteAsync(string id);
        Task<IEnumerable<Column>> GetColumnsByBoardIdAsync(string boardId);
    }
}
