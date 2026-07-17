import { useState, useCallback, useEffect, useRef } from "react";
import { Upload, Loader2, Copy, Activity, LayoutDashboard, History as HistoryIcon, FileText, CheckCircle2, X, Download, FileDown, Sparkles, BarChart2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Chart, registerables } from "chart.js";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

Chart.register(...registerables);

interface AnalysisResponse {
  id?: string;
  fileName?: string;
  geminiAnalysis?: string;
  result?: string;
  text?: string;
  content?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">("dashboard");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMode, setLoadingMode] = useState<"analyze" | "clean" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [historyList, setHistoryList] = useState<AnalysisResponse[]>([]);
  
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);

  const API_URL = "http://localhost:5021/api/Analysis";

  const fetchHistory = async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        setHistoryList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleTabChange = (tab: "dashboard" | "history") => {
    setActiveTab(tab);
    if (tab === "history") fetchHistory();
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Por favor, arraste apenas arquivos CSV.");
    }
  }, []);

  const handleUpload = async (mode: "analyze" | "clean") => {
    if (!file) return;
    setLoading(true);
    setLoadingMode(mode);
    setError(null);
    setAnalysis(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Erro no servidor ao processar o arquivo.");
      
      const data: AnalysisResponse = await response.json();
      setAnalysis(data);
      fetchHistory(); 
    } catch (err: any) {
      setError(err.message || "Não foi possível conectar ao backend.");
    } finally {
      setLoading(false);
      setLoadingMode(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnalysis(null);
    setError(null);
    setCopied(false);
  };

  const getParsedAiData = (data: AnalysisResponse | null) => {
    if (!data) return { summary: "", chartData: [], cleanCsv: "" };
    
    const rawText = data.geminiAnalysis || data.result || data.text || data.content || "";
    
    if (typeof rawText === 'string') {
      try {
        const parsed = JSON.parse(rawText);
        if (parsed && (parsed.summary || parsed.chartData)) {
          return {
            summary: parsed.summary || "",
            chartData: Array.isArray(parsed.chartData) ? parsed.chartData : [],
            cleanCsv: parsed.cleanCsv || ""
          };
        }
      } catch (e) {
        return { summary: rawText, chartData: [], cleanCsv: "" };
      }
    }
    return { summary: "Nenhum insight disponível.", chartData: [], cleanCsv: "" };
  };

  const parsedData = getParsedAiData(analysis);

  const handleDownloadCsv = () => {
    if (!parsedData.cleanCsv) {
      alert("Nenhum CSV limpo foi gerado. Use a opção 'Limpar e Analisar'.");
      return;
    }
    const blob = new Blob([parsedData.cleanCsv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dataset_limpo_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      const html2canvasFn = (html2canvas as any).default || html2canvas;
      const jsPDFFn = (jsPDF as any).jsPDF || jsPDF;

      const canvas = await html2canvasFn(reportRef.current, { 
        scale: 2, 
        backgroundColor: "#07050f",
        useCORS: true 
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDFFn("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`relatorio_insights_${Date.now()}.pdf`);
    } catch (err) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const chartImage = chartInstanceRef.current ? chartInstanceRef.current.toBase64Image() : "";
        const markdownHtml = reportRef.current.querySelector(".prose")?.innerHTML || "";
        
        printWindow.document.write(`
          <html>
            <head>
              <title>Relatório de Insights - InsightForge AI</title>
              <style>
                body { background-color: #07050f; color: #cbd5e1; font-family: sans-serif; padding: 40px; margin: 0; }
                .header { text-align: center; border-bottom: 2px solid #2e1065; padding-bottom: 20px; margin-bottom: 30px; }
                h1 { color: #fff; margin: 0; font-size: 28px; }
                .neon { color: #e879f9; }
                .chart-container { background: #110c1f; border: 1px solid #2e1065; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center; }
                .chart-img { max-width: 100%; height: auto; max-height: 350px; }
                .insights { background: rgba(192, 38, 211, 0.05); border-left: 4px solid #c026d3; padding: 25px; border-radius: 0 12px 12px 0; line-height: 1.6; }
                h1, h2, h3 { color: #e879f9; }
                ul { padding-left: 20px; }
                li { margin-bottom: 8px; }
                @media print {
                  body { background-color: #ffffff; color: #000000; padding: 0; }
                  .chart-container { background: #ffffff; border: 1px solid #ccc; }
                  h1, h2, h3 { color: #c026d3; }
                  .insights { background: #f9f9f9; border-left: 4px solid #c026d3; color: #000000; }
                }
              </style>
            </head>
            <body>
              <div class="header"><h1>InsightForge <span class="neon">AI</span></h1><p>Relatório Analytics gerado automaticamente</p></div>
              <div class="chart-container"><h3 style="margin-top:0; text-align:left;">📈 Visão Geral dos Dados</h3><img class="chart-img" src="${chartImage}" /></div>
              <div class="insights">${markdownHtml}</div>
              <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  useEffect(() => {
    if (activeTab === "dashboard" && analysis && chartRef.current && parsedData.chartData.length > 0) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const ctx = chartRef.current.getContext("2d");
      if (ctx) {
        let gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, "rgba(192, 38, 211, 0.4)");
        gradient.addColorStop(1, "rgba(192, 38, 211, 0.0)");

        chartInstanceRef.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: parsedData.chartData.map((item: any) => item.name),
            datasets: [
              {
                label: "Métricas",
                data: parsedData.chartData.map((item: any) => item.value),
                borderColor: "#e879f9",
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: "#07050f",
                pointBorderColor: "#e879f9",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: "#e879f9",
                fill: true,
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, grid: { color: "rgba(46, 16, 101, 0.3)" }, ticks: { color: "#94a3b8" } },
              x: { grid: { display: false }, ticks: { color: "#94a3b8" } },
            },
          },
        });
      }
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [activeTab, analysis, parsedData.chartData]);

  const handleCopy = () => {
    if (!parsedData.summary) return;
    navigator.clipboard.writeText(parsedData.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen bg-[#07050f] text-slate-200 font-sans antialiased">
      <aside className="hidden lg:flex w-64 flex-col border-r border-[#2e1065] bg-[#07050f] z-20">
        <div className="p-6 border-b border-[#2e1065] flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-[#c026d3] to-[#e879f9] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(192,38,211,0.5)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-black tracking-tighter text-white">
            INSIGHT<span className="neon-text">FORGE</span>
          </span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button onClick={() => handleTabChange("dashboard")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-bold border ${activeTab === "dashboard" ? 'bg-[#c026d3]/10 text-white border-[#c026d3]/40 shadow-[0_0_15px_rgba(192,38,211,0.15)]' : 'text-[#94a3b8] hover:bg-[#110c1f] hover:text-white border-transparent'}`}>
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button onClick={() => handleTabChange("history")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-bold border ${activeTab === "history" ? 'bg-[#c026d3]/10 text-white border-[#c026d3]/40 shadow-[0_0_15px_rgba(192,38,211,0.15)]' : 'text-[#94a3b8] hover:bg-[#110c1f] hover:text-white border-transparent'}`}>
            <HistoryIcon className="w-4 h-4" />
            <span>Histórico</span>
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 border-b border-[#2e1065] bg-[#07050f]/95 backdrop-blur-xl flex items-center justify-end px-8 sticky top-0 z-50">
          <span className="text-xs font-bold px-4 py-1.5 bg-[#c026d3]/10 border border-[#c026d3]/30 rounded-full text-[#e879f9] flex items-center gap-2 shadow-[0_0_15px_rgba(192,38,211,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e879f9] animate-pulse"></span>
            CONNECTED
          </span>
        </header>

        <main className="p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6 relative z-0 flex-1 flex flex-col">
          
          {activeTab === "dashboard" && (
            <div className="flex-1 flex flex-col">
              <div className="flex flex-col items-center justify-center text-center space-y-4 border-b border-[#2e1065] pb-8 mb-6">
                <div>
                  <h1 className="text-3xl font-black text-white m-0">InsightForge <span className="neon-text">AI</span></h1>
                  <p className="text-[#94a3b8] text-sm mt-2">Análise Preditiva & Processamento Estatístico</p>
                </div>
                {(analysis || file) && (
                  <button onClick={handleReset} className="upload-btn px-6 py-2.5 rounded-lg font-bold text-sm cursor-pointer mt-4">
                    + Nova Análise
                  </button>
                )}
              </div>

              {!analysis && !loading && (
                <div 
                  onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                  className={`border border-dashed rounded-2xl p-16 flex flex-col items-center justify-center transition-all duration-300 bg-[#110c1f]/20 flex-1
                    ${isDragging ? 'border-[#c026d3] bg-[#c026d3]/5 shadow-[0_0_20px_rgba(192, 38, 211, 0.15)]' : 'border-[#2e1065] hover:border-[#c026d3]/50'}`}
                >
                  <input type="file" accept=".csv" disabled={loading} onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} className="hidden" id="file-upload" />
                  
                  {file ? (
                    <div className="flex flex-col items-center w-full max-w-md">
                      <div className="w-14 h-14 rounded-xl bg-[#c026d3]/20 border border-[#c026d3]/50 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(192,38,211,0.2)]">
                        <CheckCircle2 className="w-7 h-7 text-[#e879f9]" />
                      </div>
                      
                      <div className="flex items-center gap-3 bg-[#110c1f] border border-[#2e1065] pl-4 pr-2 py-2 rounded-xl mb-8">
                        <span className="text-sm font-bold text-white">{file.name}</span>
                        <button onClick={(e) => { e.preventDefault(); setFile(null); }} className="p-1 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors" title="Remover arquivo"><X className="w-4 h-4" /></button>
                      </div>

                      <div className="flex flex-col w-full gap-4">
                        <button onClick={() => handleUpload("analyze")} className="upload-btn w-full py-3 rounded-lg text-sm font-bold cursor-pointer flex items-center justify-center gap-2">
                          <BarChart2 className="w-4 h-4" /> Apenas Analisar
                        </button>
                        <button onClick={() => handleUpload("clean")} className="upload-btn w-full py-3 rounded-lg text-sm font-bold cursor-pointer flex items-center justify-center gap-2">
                          <Sparkles className="w-4 h-4" /> Limpar e Analisar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                      <div className="w-14 h-14 rounded-xl bg-[#110c1f] border border-[#c026d3]/20 flex items-center justify-center mb-4">
                        <Upload className="w-6 h-6 text-[#e879f9]" />
                      </div>
                      <p className="text-base font-bold text-white mb-1">Solte seu arquivo CSV aqui</p>
                      <p className="text-xs text-[#94a3b8]">Ou clique para buscar no seu computador</p>
                    </label>
                  )}
                </div>
              )}

              {loading && (
                <div className="bg-[#110c1f] border border-[#2e1065] rounded-2xl p-20 flex flex-col items-center justify-center flex-1">
                  <Loader2 className="w-10 h-10 text-[#e879f9] animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-white mb-1">
                    {loadingMode === "clean" ? "Limpando e Estruturando os Dados..." : "Analisando Dados..."}
                  </h3>
                  <p className="text-xs text-[#e879f9] tracking-wider uppercase font-mono">Processamento de IA em Andamento</p>
                </div>
              )}

              {error && (
                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm flex items-center gap-2 mb-6"><span>{error}</span></div>
              )}

              {analysis && !loading && (
                <>
                  <div className="flex gap-4 justify-end mb-4">
                    {parsedData.cleanCsv && (
                       <button onClick={handleDownloadCsv} className="upload-btn px-4 py-2 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-2">
                         <Download className="w-4 h-4"/> Baixar CSV Limpo
                       </button>
                    )}
                    <button onClick={handleDownloadPDF} className="upload-btn px-4 py-2 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-2">
                      <FileDown className="w-4 h-4"/> Relatório em PDF
                    </button>
                  </div>

                  <div ref={reportRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 rounded-xl bg-[#07050f] flex-1">
                    
                    <div className="md:col-span-2 panel flex flex-col justify-between min-h-[400px]">
                      <h3 className="text-lg font-semibold m-0 mb-5 text-white flex items-center gap-2">📈 Visão <span className="neon-text">Geral dos Dados</span></h3>
                      <div className="flex-1 w-full relative min-h-[280px] bg-[#110c1f] rounded-lg">
                        <canvas ref={chartRef} id="neonChart" className="w-full h-full p-2"></canvas>
                      </div>
                    </div>

                    <div className="panel flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-semibold m-0 mb-5 text-white flex items-center gap-2">🧠 Análise <span className="neon-text">Inteligente</span></h3>
                        
                        <div className="pr-2 space-y-4">
                          <div className="ai-insight p-4 rounded-r-lg text-sm leading-relaxed text-[#cbd5e1]">
                            <div className="prose prose-invert prose-sm text-[#cbd5e1]">
                              <ReactMarkdown 
                                components={{
                                  h1: ({node, ...props}) => <h1 className="text-base font-bold text-[#e879f9] mt-4 mb-2 border-b border-[#2e1065] pb-1" {...props} />,
                                  h2: ({node, ...props}) => <h2 className="text-sm font-semibold text-white mt-3 mb-1" {...props} />,
                                  p: ({node, ...props}) => <p className="mb-2 text-[#cbd5e1]" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-400" {...props} />,
                                  li: ({node, ...props}) => <li className="text-[#cbd5e1]" {...props} />,
                                  strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />
                                }}
                              >
                                {parsedData.summary}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-[#2e1065] flex gap-3">
                        <button onClick={handleCopy} className="upload-btn w-full py-3 rounded-lg font-bold text-xs cursor-pointer text-center flex items-center justify-center gap-2">
                          {copied ? "Copiado!" : <><Copy className="w-4 h-4"/> Copiar Texto</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4 flex-1">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Histórico de Relatórios</h2>
                <p className="text-sm text-[#94a3b8]">Lista de execuções persistidas no banco de dados.</p>
              </div>

              {historyList.length === 0 ? (
                <div className="text-center p-12 panel rounded-xl">
                  <p className="text-sm font-semibold text-white">Nenhum registro encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {historyList.map((item: any, idx: number) => (
                    <div 
                      key={item.id || idx} 
                      onClick={() => { setAnalysis(item); setActiveTab("dashboard"); }}
                      className="group flex items-center justify-between p-4 panel hover:bg-[#110c1f]/80 rounded-xl cursor-pointer transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#07050f] rounded-xl flex items-center justify-center border border-[#2e1065] group-hover:border-[#c026d3]/30 transition-all">
                          <FileText className="w-5 h-5 text-[#94a3b8] group-hover:text-[#e879f9]" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm group-hover:text-[#e879f9] transition-colors">{item.fileName || "Dataset.csv"}</p>
                          <p className="text-xs text-[#94a3b8] font-mono mt-1">ID: {item.id || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <footer className="mt-8 text-center text-xs text-[#94a3b8] border-t border-[#2e1065] pt-4 pb-2">
            Desenvolvido com 💜 por Juliana Carvalho.
          </footer>
        </main>
      </div>
    </div>
  );
}