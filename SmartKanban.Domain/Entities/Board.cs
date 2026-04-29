using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartKanban.Domain.Entities
{
    public class Board
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        [BsonRepresentation(BsonType.ObjectId)]
        public string OwnerId { get; set; } = string.Empty;

        [BsonRepresentation(BsonType.ObjectId)]
        public List<string> MemberIds { get; set; } = new List<string>();

        [BsonRepresentation(BsonType.ObjectId)]
        public List<string> ColumnOrderIds { get; set; } = new List<string>();

        public string BackgroundColor { get; set; } = "#FFFFFF";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public List<string> ViewerIds { get; set; } = new List<string>();
        public string BackgroundUrl { get; set; } = string.Empty;
    }
}
