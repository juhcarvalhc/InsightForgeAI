using System;
using System.Threading.Tasks;
using InsightForgeAI.Domain.Entities;

namespace InsightForgeAI.Domain.Interfaces;

public interface IAnalysisRepository
{
    Task<Analysis?> GetByIdAsync(Guid id);
    Task AddAsync(Analysis analysis);
    Task UpdateAsync(Analysis analysis);
}