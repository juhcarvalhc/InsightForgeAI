using System;
using System.Threading.Tasks;
using InsightForgeAI.Application.DTOs;
using InsightForgeAI.Domain.Interfaces;

namespace InsightForgeAI.Application.UseCases;

public class GetAnalysisUseCase
{
    private readonly IAnalysisRepository _repository;

    public GetAnalysisUseCase(IAnalysisRepository repository)
    {
        _repository = repository;
    }

    public async Task<AnalysisDto?> ExecuteAsync(Guid id)
    {
        var analysis = await _repository.GetByIdAsync(id);

        if (analysis == null) return null;

        return new AnalysisDto
        {
            Id = analysis.Id,
            FileName = analysis.FileName,
            FileSizeInBytes = analysis.FileSizeInBytes,
            Status = analysis.Status.ToString(),
            CreatedAt = analysis.CreatedAt,
            CompletedAt = analysis.CompletedAt,
            ResultJson = analysis.ResultJson,
            ErrorMessage = analysis.ErrorMessage
        };
    }
}