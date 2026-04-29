using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartKanban.Domain.Interfaces;
using System.Security.Claims;

namespace SmartKanban.Presentation.Controllers
{
    [Route("api/v1/analytics")]
    [ApiController]
    [Authorize]
    public class AnalyticsController : ControllerBase
    {
        private readonly IBoardRepository _boardRepository;
        private readonly IColumnRepository _columnRepository;
        private readonly ICardRepository _cardRepository;
        private readonly IUserRepository _userRepository;

        public AnalyticsController(
            IBoardRepository boardRepository,
            IColumnRepository columnRepository,
            ICardRepository cardRepository,
            IUserRepository userRepository)
        {
            _boardRepository = boardRepository;
            _columnRepository = columnRepository;
            _cardRepository = cardRepository;
            _userRepository = userRepository;
        }

        [HttpGet]
        public async Task<IActionResult> GetAnalytics([FromQuery] string timeRange = "month", [FromQuery] string projectId = "all")
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

            var myBoards = await _boardRepository.GetAllAsync();
            if (projectId != "all")
            {
                myBoards = myBoards.Where(b => b.Id == projectId).ToList();
            }

            var trendDict = new Dictionary<string, (int newTasks, int completed)>();
            var cycleDict = new Dictionary<string, (double totalLead, double totalCycle, int count)>();
            var orderedKeys = new List<string>();

            DateTime now = DateTime.UtcNow.ToLocalTime();
            DateTime startDate;

            int totalDays = 30;

            if (timeRange == "week")
            {
                totalDays = 7;
                startDate = now.AddDays(-6).Date;
                for (int i = 6; i >= 0; i--)
                {
                    string key = now.AddDays(-i).ToString("dd/MM");
                    orderedKeys.Add(key);
                    trendDict[key] = (0, 0);
                    cycleDict[key] = (0, 0, 0);
                }
            }
            else if (timeRange == "quarter")
            {
                totalDays = 90;
                startDate = new DateTime(now.Year, now.Month, 1).AddMonths(-2);
                for (int i = 2; i >= 0; i--)
                {
                    string key = "Tháng " + now.AddMonths(-i).Month;
                    orderedKeys.Add(key);
                    trendDict[key] = (0, 0);
                    cycleDict[key] = (0, 0, 0);
                }
            }
            else
            {
                totalDays = DateTime.DaysInMonth(now.Year, now.Month);
                startDate = new DateTime(now.Year, now.Month, 1);
                orderedKeys = new List<string> { "Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4" };
                foreach (var k in orderedKeys)
                {
                    trendDict[k] = (0, 0);
                    cycleDict[k] = (0, 0, 0);
                }
            }

            string GetKey(DateTime date)
            {
                if (timeRange == "week") return date.ToString("dd/MM");
                if (timeRange == "quarter") return "Tháng " + date.Month;
                int day = date.Day;
                if (day <= 7) return "Tuần 1";
                if (day <= 14) return "Tuần 2";
                if (day <= 21) return "Tuần 3";
                return "Tuần 4";
            }

            int totalCompleted = 0;
            int totalTasks = 0;

            var memberTasksDict = new Dictionary<string, int>();
            var projectAllocDict = new Dictionary<string, int>();

            var colors = new[] { "#0c66e4", "#8777D9", "#27c93f", "#ffbd2e", "#ef4444" };
            int colorIdx = 0;

            foreach (var board in myBoards)
            {
                int boardTaskCount = 0;
                var columns = await _columnRepository.GetColumnsByBoardIdAsync(board.Id);

                foreach (var col in columns)
                {
                    var cards = await _cardRepository.GetCardsByColumnIdAsync(col.Id);
                    boardTaskCount += cards.Count();

                    string colTitle = col.Title.ToLower();
                    bool isDone = colTitle.Contains("done") || colTitle.Contains("hoàn") || colTitle.Contains("xong");

                    foreach (var card in cards)
                    {
                        var createdDate = card.CreatedAt.ToLocalTime();
                        if (createdDate >= startDate)
                        {
                            totalTasks++; 
                            string createdKey = GetKey(createdDate);
                            if (trendDict.ContainsKey(createdKey))
                            {
                                var t = trendDict[createdKey];
                                trendDict[createdKey] = (t.newTasks + 1, t.completed);
                            }
                        }

                        if (isDone)
                        {
                            var completedDate = card.CompletedAt ?? card.UpdatedAt ?? DateTime.UtcNow;
                            var compDateLocal = completedDate.ToLocalTime();

                            if (compDateLocal >= startDate)
                            {
                                totalCompleted++;
                                string compKey = GetKey(compDateLocal);

                                if (trendDict.ContainsKey(compKey))
                                {
                                    var t = trendDict[compKey];
                                    trendDict[compKey] = (t.newTasks, t.completed + 1);

                                    var startDateTask = card.StartedAt ?? card.CreatedAt;
                                    double leadDays = (completedDate - card.CreatedAt).TotalDays;
                                    double cycleDays = (completedDate - startDateTask).TotalDays;

                                    if (leadDays <= 0) leadDays = 0.1;
                                    if (cycleDays <= 0) cycleDays = 0.1;

                                    var c = cycleDict[compKey];
                                    cycleDict[compKey] = (c.totalLead + leadDays, c.totalCycle + cycleDays, c.count + 1);
                                }

                                if (card.AssigneeIds != null)
                                {
                                    foreach (var assigneeId in card.AssigneeIds)
                                    {
                                        if (!memberTasksDict.ContainsKey(assigneeId)) memberTasksDict[assigneeId] = 0;
                                        memberTasksDict[assigneeId]++;
                                    }
                                }
                            }
                        }
                    }
                }

                if (boardTaskCount > 0)
                {
                    projectAllocDict.Add(board.Title, boardTaskCount);
                }
            }

            var trendData = new List<object>();
            var cycleTimeData = new List<object>();

            foreach (var key in orderedKeys)
            {
                trendData.Add(new
                {
                    name = key,
                    newTasks = trendDict[key].newTasks,
                    completed = trendDict[key].completed
                });

                var c = cycleDict[key];
                cycleTimeData.Add(new
                {
                    sprint = key,
                    leadTime = c.count > 0 ? Math.Round(c.totalLead / c.count, 1) : 0,
                    cycleTime = c.count > 0 ? Math.Round(c.totalCycle / c.count, 1) : 0
                });
            }

            var memberPerformance = new List<object>();
            var topPerformer = new { name = "Chưa có", tasks = 0 };

            foreach (var kvp in memberTasksDict.OrderByDescending(x => x.Value).Take(5))
            {
                var user = await _userRepository.GetByIdAsync(kvp.Key);
                var userName = user?.FullName ?? "Đồng đội";
                if (kvp.Key == currentUserId) userName += " (You)";

                memberPerformance.Add(new { name = userName, tasks = kvp.Value });

                if (kvp.Value > topPerformer.tasks)
                {
                    topPerformer = new { name = userName, tasks = kvp.Value };
                }
            }
            if (!memberPerformance.Any()) memberPerformance.Add(new { name = "Chưa có dữ liệu", tasks = 0 });

            var projectAllocation = new List<object>();
            int totalProjectTasks = projectAllocDict.Values.Sum();
            foreach (var kvp in projectAllocDict)
            {
                int percentage = totalProjectTasks > 0 ? (int)Math.Round((double)kvp.Value / totalProjectTasks * 100) : 0;
                projectAllocation.Add(new
                {
                    name = kvp.Key.Length > 20 ? kvp.Key.Substring(0, 20) + "..." : kvp.Key,
                    value = percentage,
                    color = colors[colorIdx % colors.Length]
                });
                colorIdx++;
            }
            if (!projectAllocation.Any()) projectAllocation.Add(new { name = "Trống", value = 100, color = "#64748b" });

            return Ok(new
            {
                trendData,
                memberPerformance,
                projectAllocation,
                cycleTimeData,
                totalCompleted,
                totalTasks, 
                totalDays,  
                topPerformer
            });
        }
    }
}