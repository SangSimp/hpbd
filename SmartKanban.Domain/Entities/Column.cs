using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartKanban.Domain.Entities
{
    public class Column
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonRepresentation(BsonType.ObjectId)]
        public string BoardId { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        [BsonRepresentation(BsonType.ObjectId)]
        public List<string> CardOrderIds { get; set; } = new List<string>();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string SystemRole { get; set; } = "todo";
        public List<string> AllowedNextColumnIds { get; set; } = new List<string>();
        public bool IsDoneColumn { get; set; } = false;
    }
}