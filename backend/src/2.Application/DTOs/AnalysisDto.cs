using System;

namespace InsightForgeAI.Application.DTOs;

public class AnalysisDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSizeInBytes { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ResultJson { get; set; }
    public string? ErrorMessage { get; set; }
}