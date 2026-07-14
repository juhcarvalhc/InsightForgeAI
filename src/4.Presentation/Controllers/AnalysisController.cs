using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using InsightForgeAI.Application.UseCases;

namespace InsightForgeAI.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalysisController : ControllerBase
{
    private readonly CreateAnalysisUseCase _createAnalysisUseCase;
    private readonly GetAnalysisUseCase _getAnalysisUseCase;
    private readonly ProcessAnalysisUseCase _processAnalysisUseCase;

    public AnalysisController(
        CreateAnalysisUseCase createAnalysisUseCase,
        GetAnalysisUseCase getAnalysisUseCase,
        ProcessAnalysisUseCase processAnalysisUseCase)
    {
        _createAnalysisUseCase = createAnalysisUseCase;
        _getAnalysisUseCase = getAnalysisUseCase;
        _processAnalysisUseCase = processAnalysisUseCase;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromForm] CreateAnalysisRequest request)
    {
        if (request.File == null || request.File.Length == 0)
        {
            return BadRequest("Nenhum arquivo foi enviado.");
        }

        using var reader = new StreamReader(request.File.OpenReadStream());
        string fileContent = await reader.ReadToEndAsync();

        var result = await _createAnalysisUseCase.ExecuteAsync(
            request.UserId, 
            request.File.FileName, 
            request.File.Length,
            fileContent 
        );

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _getAnalysisUseCase.ExecuteAsync(id);

        if (result == null) return NotFound();

        return Ok(result);
    }

    [HttpPost("{id}/process")]
    public async Task<IActionResult> Process(Guid id)
    {
        var success = await _processAnalysisUseCase.ExecuteAsync(id);
        
        if (!success) return NotFound();
        
        return Ok(new { Message = "Análise processada pela IA e salva com sucesso!" });
    }
}

public record CreateAnalysisRequest(Guid UserId, IFormFile File);