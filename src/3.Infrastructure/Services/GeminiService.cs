using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using InsightForgeAI.Domain.Interfaces;

namespace InsightForgeAI.Infrastructure.Services;

public class GeminiService : IAIService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    public GeminiService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration["Gemini:ApiKey"] ?? string.Empty;
    }

    public async Task<string> AnalyzeDataAsync(string prompt)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            return "{\"error\": \"Chave de API do Gemini nao configurada.\"}";
        }

        var url = "https://generativelanguage.googleapis.com/v1beta/interactions";

        var requestBody = new
        {
            model = "gemini-3.5-flash",
            input = prompt
        };

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = content;
        request.Headers.Add("x-goog-api-key", _apiKey);

        try
        {
            var response = await _httpClient.SendAsync(request);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorDetails = await response.Content.ReadAsStringAsync();
                return $"{{\"error\": \"Erro na API do Gemini: {response.StatusCode} - {errorDetails}\"}}";
            }

            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);
            
            if (doc.RootElement.TryGetProperty("output_text", out var outputProp))
            {
                return outputProp.GetString() ?? "{\"insights\": \"Nenhum insight gerado.\"}";
            }
            
            if (doc.RootElement.TryGetProperty("interaction", out var interactionProp) && 
                interactionProp.TryGetProperty("output_text", out var nestedOutput))
            {
                return nestedOutput.GetString() ?? "{\"insights\": \"Nenhum insight gerado.\"}";
            }

            return responseString;
        }
        catch (Exception ex)
        {
            return $"{{\"error\": \"Falha na conexao: {ex.Message}\"}}";
        }
    }
}