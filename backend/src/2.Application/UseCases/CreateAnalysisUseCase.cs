using System;
using System.Threading.Tasks;
using InsightForgeAI.Application.DTOs;
using InsightForgeAI.Domain.Entities;
using InsightForgeAI.Domain.Interfaces;

namespace InsightForgeAI.Application.UseCases;

public class CreateAnalysisUseCase
{
    private readonly IAnalysisRepository _repository;

    public CreateAnalysisUseCase(IAnalysisRepository repository)
    {
        _repository = repository;
    }

    public async Task<AnalysisDto> ExecuteAsync(Guid userId, string fileName, long fileSizeInBytes, string fileContent)
    {
        var analysis = new Analysis
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FileName = fileName,
            FileSizeInBytes = fileSizeInBytes,
            FileContent = fileContent,
            Status = AnalysisStatus.Queued,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(analysis);

        return new AnalysisDto
        {
            Id = analysis.Id,
            FileName = analysis.FileName,
            FileSizeInBytes = analysis.FileSizeInBytes,
            Status = analysis.Status.ToString(),
            CreatedAt = analysis.CreatedAt
        };
    }
}