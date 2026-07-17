using System.Threading.Tasks;

namespace InsightForgeAI.Domain.Interfaces;

public interface IAIService
{
    Task<string> AnalyzeDataAsync(string dataSummary);
}