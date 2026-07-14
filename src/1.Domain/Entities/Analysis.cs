using System;

namespace InsightForgeAI.Domain.Entities;

public class Analysis
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSizeInBytes { get; set; }
    public string FileContent { get; set; } = string.Empty;
    public AnalysisStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ResultJson { get; set; }
    public string? ErrorMessage { get; set; }
}