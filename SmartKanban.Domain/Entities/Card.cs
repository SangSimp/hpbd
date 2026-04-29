using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartKanban.Domain.Entities
{
    [BsonIgnoreExtraElements]
    public class Card
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonRepresentation(BsonType.ObjectId)]
        public string ColumnId { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public double Position { get; set; }

        [BsonElement("StartDate")]
        public DateTime? StartDate { get; set; }

        [BsonElement("DueDate")]
        public DateTime? DueDate { get; set; }
        public DateTime? StartedAt { get; set; }  
        public DateTime? CompletedAt { get; set; } 
        public DateTime? UpdatedAt { get; set; }  
        public List<ChecklistItem> Checklists { get; set; } = new List<ChecklistItem>();

        [BsonRepresentation(BsonType.ObjectId)]
        public List<string> LabelIds { get; set; } = new List<string>();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [BsonElement("coverUrl")]
        public string CoverUrl { get; set; } = string.Empty;

        [BsonElement("tags")]
        public List<string> Tags { get; set; } = new List<string>();

        [BsonElement("assigneeIds")]
        [BsonRepresentation(BsonType.ObjectId)]
        public List<string> AssigneeIds { get; set; } = new List<string>();

        [BsonElement("commentCount")]
        public int CommentCount { get; set; } = 0; 

        [BsonElement("attachmentCount")]
        public int AttachmentCount { get; set; } = 0; 

        [BsonElement("version")]
        public int Version { get; set; } = 1;
        [BsonElement("comments")]
        public List<CommentItem> Comments { get; set; } = new List<CommentItem>();
        [BsonElement("attachments")]
        public List<string> Attachments { get; set; } = new List<string>();
        public class CommentItem
        {
            [BsonId]
            //[BsonRepresentation(BsonType.ObjectId)]
            public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

            [BsonElement("userId")]
            public string UserId { get; set; } = string.Empty; 

            [BsonElement("content")]
            public string Content { get; set; } = string.Empty; 

            [BsonElement("createdAt")]
            public DateTime CreatedAt { get; set; } = DateTime.UtcNow; 
            public string? UserName { get; set; }
            public string? Avatar { get; set; }

        }
        [BsonElement("activities")]
        public List<string> Activities { get; set; } = new List<string>();
    }
}
