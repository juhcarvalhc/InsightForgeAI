using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using InsightForgeAI.Domain.Entities;
using InsightForgeAI.Domain.Interfaces;
using InsightForgeAI.Infrastructure.Data;

namespace InsightForgeAI.Infrastructure.Repositories;

public class AnalysisRepository : IAnalysisRepository
{
    private readonly AppDbContext _context;

    public AnalysisRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Analysis?> GetByIdAsync(Guid id)
    {
        return await _context.Analyses.FindAsync(id);
    }

    public async Task AddAsync(Analysis analysis)
    {
        await _context.Analyses.AddAsync(analysis);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Analysis analysis)
    {
        _context.Analyses.Update(analysis);
        await _context.SaveChangesAsync();
    }
}