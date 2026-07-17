using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using InsightForgeAI.Domain.Interfaces;

namespace InsightForgeAI.Infrastructure.Services
{
    public class GeminiService : IAIService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public GeminiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = (configuration["Gemini:ApiKey"] ?? string.Empty).Trim();
        }

        public async Task<string> AnalyzeDataAsync(string prompt)
        {
            if (string.IsNullOrEmpty(_apiKey))
                return "{\"summary\": \"Chave não configurada.\", \"chartData\": [], \"cleanCsv\": \"\"}";

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={_apiKey}";
            
            string mode = "analyze";
            if (prompt.StartsWith("[MODE:clean]")) 
            {
                mode = "clean";
                prompt = prompt.Replace("[MODE:clean]\n", "");
            } 
            else if (prompt.StartsWith("[MODE:analyze]")) 
            {
                mode = "analyze";
                prompt = prompt.Replace("[MODE:analyze]\n", "");
            }

            string engineeredPrompt = "";

            if (mode == "clean")
            {
                engineeredPrompt = @"Você é um Cientista de Dados Sênior. 
Aja como uma pipeline de ETL. O arquivo abaixo está sujo.
Retorne EXCLUSIVAMENTE um JSON válido com estas 3 chaves:
1. 'summary': (Markdown) Crie '🔍 Auditoria de Qualidade de Dados' e '📊 Insights de Negócio'.
2. 'chartData': Array com 'name' e 'value'.
3. 'cleanCsv': Uma string contendo o CSV totalmente limpo e padronizado para download.

CSV BAGUNÇADO:
" + prompt;
            }
            else
            {
                engineeredPrompt = @"Você é um Cientista de Dados Sênior. 
O arquivo abaixo JÁ ESTÁ ORGANIZADO. Faça uma análise executiva direta.
Retorne EXCLUSIVAMENTE um JSON válido com estas 2 chaves (NÃO gere a chave cleanCsv):
1. 'summary': (Markdown) Crie os títulos '📊 Análise Executiva' e '💡 Recomendações Estratégicas'.
2. 'chartData': Array com 'name' e 'value' (métricas relevantes agrupadas).

CSV ORGANIZADO:
" + prompt;
            }

            var requestBody = new { contents = new[] { new { parts = new[] { new { text = engineeredPrompt } } } } };
            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            int maxRetries = 3;
            int delayBetweenRetriesMs = 5000; 

            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    var response = await _httpClient.PostAsync(url, content);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var responseString = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(responseString);
                        
                        if (doc.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                        {
                            if (candidates[0].TryGetProperty("content", out var contentObj) &&
                                contentObj.TryGetProperty("parts", out var parts) && parts.GetArrayLength() > 0 &&
                                parts[0].TryGetProperty("text", out var textElement))
                            {
                                var aiText = textElement.GetString() ?? "";
                                aiText = aiText.Replace("```json", "").Replace("```", "").Trim();
                                try { using var testDoc = JsonDocument.Parse(aiText); return aiText; }
                                catch { var escapedText = JsonSerializer.Serialize(aiText); return $"{{\"summary\": {escapedText}, \"chartData\": [], \"cleanCsv\": \"\"}}"; }
                            }
                        }
                        return "{\"summary\": \"Falha de leitura da API.\", \"chartData\": [], \"cleanCsv\": \"\"}";
                    }
                    
                    if ((int)response.StatusCode == 503 || (int)response.StatusCode == 429) 
                    {
                        if (attempt < maxRetries)
                        {
                            await Task.Delay(delayBetweenRetriesMs);
                            continue; 
                        }
                    }

                    var errorDetails = await response.Content.ReadAsStringAsync();
                    var escapedError = JsonSerializer.Serialize($"Erro na API ({response.StatusCode}): {errorDetails}. (Tentativas: {attempt})");
                    return $"{{\"summary\": {escapedError}, \"chartData\": [], \"cleanCsv\": \"\"}}";
                }
                catch (Exception ex)
                {
                    if (attempt == maxRetries)
                    {
                        var escapedEx = JsonSerializer.Serialize(ex.Message);
                        return $"{{\"summary\": \"Erro grave: {escapedEx}\", \"chartData\": [], \"cleanCsv\": \"\"}}";
                    }
                    await Task.Delay(delayBetweenRetriesMs);
                }
            }

            return "{\"summary\": \"O Google está instável. Tente novamente mais tarde.\", \"chartData\": [], \"cleanCsv\": \"\"}";
        }
    }
}