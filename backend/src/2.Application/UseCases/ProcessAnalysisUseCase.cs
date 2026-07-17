using System;
using System.Threading.Tasks;
using InsightForgeAI.Domain.Interfaces;

namespace InsightForgeAI.Application.UseCases;

public class ProcessAnalysisUseCase
{
    private readonly IAnalysisRepository _repository;
    private readonly IAIService _aiService;

    public ProcessAnalysisUseCase(IAnalysisRepository repository, IAIService aiService)
    {
        _repository = repository;
        _aiService = aiService;
    }

    public async Task<bool> ExecuteAsync(Guid id)
    {
        var analysis = await _repository.GetByIdAsync(id);
        
        if (analysis == null) return false;

        string prompt = $@"Você é um analista de dados especialista.
Por favor, analise os dados do arquivo chamado '{analysis.FileName}'.

Aqui estão os dados extraídos do arquivo:
{analysis.FileContent}

Retorne os principais insights, tendências e um resumo estruturado sobre o que esses dados representam.";

        var result = await _aiService.AnalyzeDataAsync(prompt);

        analysis.ResultJson = result;
        analysis.CompletedAt = DateTime.UtcNow;
        
        await _repository.UpdateAsync(analysis);
        
        return true;
    }
}