using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using InsightForgeAI.Domain.Interfaces;

namespace InsightForgeAI.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalysisController : ControllerBase
{
    private readonly IAIService _geminiService;

    public AnalysisController(IAIService geminiService)
    {
        _geminiService = geminiService;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadAndProcess([FromForm] IFormFile file, [FromForm] string mode = "analyze")
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Nenhum arquivo foi enviado.");
        }

        try 
        {
            using var reader = new StreamReader(file.OpenReadStream());
            string fileContent = await reader.ReadToEndAsync();

            if (fileContent.Length > 20000) 
            {
                fileContent = fileContent.Substring(0, 20000);
            }

            string promptWithMode = $"[MODE:{mode}]\n{fileContent}";
            
            var aiResultJson = await _geminiService.AnalyzeDataAsync(promptWithMode);

            return Ok(new 
            {
                id = Guid.NewGuid().ToString(),
                fileName = file.FileName,
                geminiAnalysis = aiResultJson
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Erro interno: {ex.Message}");
        }
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        return Ok(new object[] { });
    }
}