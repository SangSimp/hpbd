using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SmartKanban.Domain.Entities
{
    public class BoardActivity
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonRepresentation(BsonType.ObjectId)]
        public string BoardId { get; set; } = null!;

        public string UserName { get; set; } = null!; 

        public string Action { get; set; } = null!; 

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
