/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { UploadSection } from "./components/UploadSection";
import { StatsGrid } from "./components/StatsGrid";
import { PDFPageRenderer } from "./components/PDFPageRenderer";
import { PrintCompiler } from "./components/PrintCompiler";
import { Invoice } from "./types";
import { 
  FileText, 
  Search, 
  User, 
  Calendar, 
  DollarSign, 
  Printer, 
  Power, 
  ArrowUpDown, 
  CheckSquare, 
  Square,
  Sparkles,
  HelpCircle,
  TrendingUp,
  FileCheck2,
  ChevronRight,
  Settings,
  X
} from "lucide-react";

export default function App() {
  // Primary datasets
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pdfDocument, setPdfDocument] = useState<any | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Filters state
  const [selectedAgent, setSelectedAgent] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [amountMin, setAmountMin] = useState<number | "">("");
  const [amountMax, setAmountMax] = useState<number | "">("");
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");

  // Table sorting
  const [sortBy, setSortBy] = useState<"pageNumber" | "amount" | "invoiceDate">("pageNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Selection and Previews
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<number>>(new Set());
  const [activePreviewPage, setActivePreviewPage] = useState<number>(1);

  // Printing state
  const [printingStatus, setPrintingStatus] = useState<{
    isPreparing: boolean;
    statusMessage: string;
    progressPercent: number;
  } | null>(null);

  // Handle parsed response from Uploader
  const handleInvoicesParsed = (parsedInvoices: Invoice[], isDemo: boolean, doc: any | null) => {
    setInvoices(parsedInvoices);
    setIsDemoMode(isDemo);
    setPdfDocument(doc);
    setSelectedAgent("All");
    setSearchQuery("");
    
    // Auto-select all parsed invoices by default
    const allPageNums = parsedInvoices.map((inv) => inv.pageNumber);
    setSelectedInvoiceIds(new Set(allPageNums));
    
    // Default active page preview to the first matched page
    if (parsedInvoices.length > 0) {
      setActivePreviewPage(parsedInvoices[0].pageNumber);
    }
  };

  const resetState = () => {
    setInvoices([]);
    setPdfDocument(null);
    setIsDemoMode(false);
    setSelectedInvoiceIds(new Set());
  };

  // Extract unique Sales Agent list for dropdowns
  const uniqueAgentsList = useMemo(() => {
    const agents = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.salesAgent) agents.add(inv.salesAgent);
    });
    return Array.from(agents).sort();
  }, [invoices]);

  // Compute boundaries for UI assistance
  const filterSummary = useMemo(() => {
    if (invoices.length === 0) return { maxAmountDetected: 0 };
    const amounts = invoices.map((i) => i.amount);
    return {
      maxAmountDetected: Math.max(...amounts),
    };
  }, [invoices]);

  // Perform dynamic multiple-parameter filtering
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // 1. Agent Filter
    if (selectedAgent && selectedAgent !== "All") {
      result = result.filter((inv) => inv.salesAgent === selectedAgent);
    }

    // 2. Search box string matches
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.clientName.toLowerCase().includes(q) ||
          (inv.itemsSummary && inv.itemsSummary.toLowerCase().includes(q))
      );
    }

    // 3. Amount boundary
    if (amountMin !== "") {
      result = result.filter((inv) => inv.amount >= amountMin);
    }
    if (amountMax !== "") {
      result = result.filter((inv) => inv.amount <= amountMax);
    }

    // 4. Date boundary
    if (dateStart) {
      result = result.filter((inv) => inv.invoiceDate >= dateStart);
    }
    if (dateEnd) {
      result = result.filter((inv) => inv.invoiceDate <= dateEnd);
    }

    // 5. Apply sorting
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      } else {
        return sortDirection === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

    return result;
  }, [invoices, selectedAgent, searchQuery, amountMin, amountMax, dateStart, dateEnd, sortBy, sortDirection]);

  // Map the current active preview page to its corresponding invoice details
  const activeInvoice = useMemo(() => {
    return invoices.find((inv) => inv.pageNumber === activePreviewPage) || invoices[0] || null;
  }, [invoices, activePreviewPage]);

  // Toggling specific selection status
  const toggleSelectInvoice = (pageNumber: number) => {
    const nextSet = new Set(selectedInvoiceIds);
    if (nextSet.has(pageNumber)) {
      nextSet.delete(pageNumber);
    } else {
      nextSet.add(pageNumber);
    }
    setSelectedInvoiceIds(nextSet);
  };

  // Mass action togglers
  const toggleSelectAllFiltered = () => {
    const nextSet = new Set(selectedInvoiceIds);
    const allFilteredSelected = filteredInvoices.every((inv) => nextSet.has(inv.pageNumber));

    if (allFilteredSelected) {
      // De-select all currently filtered pages
      filteredInvoices.forEach((inv) => nextSet.delete(inv.pageNumber));
    } else {
      // Add all currently filtered pages
      filteredInvoices.forEach((inv) => nextSet.add(inv.pageNumber));
    }
    setSelectedInvoiceIds(nextSet);
  };

  // Compile selected invoices for printing
  const invoiceSubsetToPrint = useMemo(() => {
    return invoices
      .filter((inv) => selectedInvoiceIds.has(inv.pageNumber))
      .sort((a, b) => a.pageNumber - b.pageNumber);
  }, [invoices, selectedInvoiceIds]);

  const triggerPrintSequence = () => {
    if (invoiceSubsetToPrint.length === 0) {
      alert("Please select at least one invoice to compile and print.");
      return;
    }
    setPrintingStatus({
      isPreparing: true,
      statusMessage: "Initializing print job sequence...",
      progressPercent: 5,
    });
  };

  const handlePrintCompilationComplete = () => {
    setPrintingStatus({
      isPreparing: true,
      statusMessage: "Broadcasting print layout to browser queue...",
      progressPercent: 100,
    });
    
    // Trigger browser printing window
    setTimeout(() => {
      window.print();
      // Remove loading screen after printing completes or is cancelled
      setPrintingStatus(null);
    }, 500);
  };

  // Toggle column header sorting
  const handleSortToggle = (column: "pageNumber" | "amount" | "invoiceDate") => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans leading-normal p-0 antialiased selection:bg-sky-505 selection:bg-sky-550/35 selection:text-white">
      
      {/* 1. Header Toolbar */}
      <header className="sticky top-0 z-40 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center font-black text-white text-lg tracking-wider shadow-[0_0_20px_rgba(14,165,233,0.4)]">
              I
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight uppercase text-white">Integra <span className="text-sky-400">Invoice Splitter</span></h1>
                <span className="bg-sky-500/10 text-sky-400 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border border-sky-500/20 flex items-center gap-1 font-sans">
                  <Sparkles className="w-2.5 h-2.5" />
                  Gemini Audited
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Invoice Agent Detection & Targeted Printing Utility</p>
            </div>
          </div>

          {/* Context Banner */}
          {invoices.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Active Document Status</span>
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 justify-end mt-0.5 font-sans">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  {isDemoMode ? "Interactive Simulated Sandbox Mode" : "Loaded Master Multi-Invoice PDF"}
                </span>
              </div>

              <button
                onClick={resetState}
                className="flex items-center gap-2 px-3.5 py-2 hover:bg-slate-805 bg-slate-800 hover:bg-slate-705 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700/60 transition-all cursor-pointer shadow-lg"
              >
                <Power className="w-3.5 h-3.5 text-slate-400" />
                Reset Document
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Primary Workspace Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 no-print">
        {invoices.length === 0 ? (
          // Uploader Panel
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <UploadSection onParsedInvoices={handleInvoicesParsed} />
            
            {/* Bengali/English Help Guide cards */}
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 text-left">
              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-xl">
                <h4 className="font-extrabold text-xs text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-sky-400" />
                  কিভাবে ব্যবহার করবেন? (How to use)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  ১. আপনার ১৫০-২০০+ পৃষ্ঠার বড় চালান বা ইনভয়েস পিডিএফ ফাইলটি ড্রপ বা সিলেক্ট করুন।<br />
                  ২. সিস্টেম স্বয়ংক্রিয়ভাবে প্রতিটি পৃষ্ঠার লেখা নিয়ে সার্ভার সাইড <strong>Gemini 3.5 AI</strong> এর দ্বারা প্রসেসিং করে তার মধ্য থেকে <strong>Sales Agent</strong>, মোট টাকা, তারিখ এবং ইনভয়েস নম্বর বের করে আনবে।<br />
                  ৩. এরপর আপনি যেকোনো সেলস এজেন্টের নাম দিয়ে ফিল্টার করতে পারবেন এবং শুধুমাত্র তার ইনভয়েসগুলি আলাদা করে একদম নিখুঁতভাবে প্রিন্ট করতে পারবেন।
                </p>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-xl">
                <h4 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  Key Features & Capabilities
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  - <strong>Adaptive Multi-layer Search</strong>: Pre-extracts PDF texts directly in-browser and structures metadata via LLM mapping.<br />
                  - <strong>Interactive Document Canvas Reviewer</strong>: Displays actual PDF sheets inside a real-time responsive preview pane under selective audit.<br />
                  - <strong>Fine-grain Search Controls</strong>: Filter transactions using sales managers, price ranges, invoice sequences, or calendar bounds instantly.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Dashboard Panel
          <div className="space-y-6">
            
            {/* Visual Analytics Block */}
            <StatsGrid invoices={invoices} filteredInvoices={filteredInvoices} />

            {/* Main Interactive Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column Controls / Filter Panels */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* 1. Filtering Tool-shed */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
                  <h4 className="font-bold text-xs text-slate-450 text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 font-sans">
                    <Settings className="w-4 h-4 text-sky-400" />
                    Granular Search Options
                  </h4>

                  <div className="space-y-4 text-left">
                    {/* Agent Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 text-slate-400 uppercase tracking-wider block font-sans">Sales Agent Field</label>
                      <div className="relative">
                        <select
                          value={selectedAgent}
                          onChange={(e) => setSelectedAgent(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700/50 hover:border-slate-600 rounded-xl text-xs font-bold text-white focus:bg-slate-900 focus:ring-1 focus:ring-sky-500/50 focus:outline-hidden transition-colors cursor-pointer"
                        >
                          <option value="All" className="bg-slate-900 font-sans text-white">All Registered Agent Managers ({uniqueAgentsList.length})</option>
                          {uniqueAgentsList.map((agent) => (
                            <option key={agent} value={agent} className="bg-slate-900 font-sans text-white">
                              {agent}
                            </option>
                          ))}
                        </select>
                        <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      </div>
                    </div>

                    {/* General Text Search */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 text-slate-400 uppercase tracking-wider block font-sans">Keyword Match (ID / Client)</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search INV code, Client name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700/50 hover:border-slate-600 rounded-xl text-xs font-semibold text-white focus:bg-slate-900 focus:ring-1 focus:ring-sky-500/50 focus:outline-hidden transition-colors"
                        />
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      </div>
                    </div>

                    {/* Amount Constraint Ranges */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 text-slate-400 uppercase tracking-wider block font-sans">Billing Total Constraints ($)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="Min"
                            value={amountMin}
                            onChange={(e) => setAmountMin(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-full pl-7 pr-1.5 py-2 bg-slate-950 border border-slate-700/50 hover:border-slate-600 rounded-xl text-xs font-semibold text-white focus:bg-slate-900 focus:outline-hidden transition-colors"
                          />
                          <DollarSign className="absolute left-2 top-2.5 w-3 h-3 text-slate-500" />
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="Max"
                            value={amountMax}
                            onChange={(e) => setAmountMax(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-full pl-7 pr-1.5 py-2 bg-slate-950 border border-slate-700/50 hover:border-slate-600 rounded-xl text-xs font-semibold text-white focus:bg-slate-900 focus:outline-hidden transition-colors"
                          />
                          <DollarSign className="absolute left-2 top-2.5 w-3 h-3 text-slate-500" />
                        </div>
                      </div>
                    </div>

                    {/* Calendar Boundaries */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 text-slate-400 uppercase tracking-wider block font-sans">Issue Date Window</label>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="relative">
                          <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className="w-full pl-8 pr-2 py-2 bg-slate-950 border border-slate-700/50 hover:border-slate-600 rounded-xl text-xs font-semibold text-white focus:bg-slate-900 focus:outline-hidden transition-colors"
                          />
                          <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-550 text-slate-500" />
                        </div>
                        <div className="relative">
                          <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            className="w-full pl-8 pr-2 py-2 bg-slate-950 border border-slate-700/50 hover:border-slate-600 rounded-xl text-xs font-semibold text-white focus:bg-slate-900 focus:outline-hidden transition-colors"
                          />
                          <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-550 text-slate-500" />
                        </div>
                      </div>
                    </div>

                    {/* Clear Current Query shortcut */}
                    {(selectedAgent !== "All" || searchQuery || amountMin || amountMax || dateStart || dateEnd) && (
                      <button
                        onClick={() => {
                          setSelectedAgent("All");
                          setSearchQuery("");
                          setAmountMin("");
                          setAmountMax("");
                          setDateStart("");
                          setDateEnd("");
                        }}
                        className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-bold text-center uppercase tracking-widest transition-all cursor-pointer mt-3 border border-slate-800/80"
                      >
                        Reset Search Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Agent Stats Quick Summary Box */}
                {selectedAgent !== "All" && (
                  <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/60 border border-slate-800/85 rounded-2xl p-5 shadow-lg text-left backdrop-blur-md">
                    <p className="text-[9px] font-black tracking-widest text-sky-400 uppercase font-mono">Agent Quick Ledger Summary</p>
                    <h5 className="font-bold text-sm mt-1 mb-2.5 text-white">{selectedAgent}</h5>
                    
                    <div className="space-y-2 text-xs text-slate-300 font-medium">
                      <div className="flex justify-between">
                        <span>Associated Invoices:</span>
                        <span className="font-bold text-white">{filteredInvoices.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Aggregated Revenue:</span>
                        <span className="font-bold text-sky-450 text-sky-400">${filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Selection rate:</span>
                        <span className="font-bold text-white font-sans">
                          {invoiceSubsetToPrint.length} of {filteredInvoices.length} picked
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Center Match List Grid */}
              <div className="lg:col-span-6 space-y-4">
                
                {/* Print Toolbar Action Area */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  
                  {/* Select Toggles */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSelectAllFiltered}
                      className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-bold px-3 py-1.5 bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-all cursor-pointer"
                    >
                      {filteredInvoices.every((inv) => selectedInvoiceIds.has(inv.pageNumber)) ? (
                        <>
                          <CheckSquare className="w-4 h-4 text-sky-400 animate-pulse" />
                          Deselect All Filtered
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4 text-slate-500" />
                          Select All Filtered
                        </>
                      )}
                    </button>
                    
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      ({invoiceSubsetToPrint.length} Selected to Print)
                    </span>
                  </div>

                  {/* Bulk Print Button */}
                  <button
                    onClick={triggerPrintSequence}
                    disabled={invoiceSubsetToPrint.length === 0}
                    className={`flex items-center justify-center gap-2 px-5 py-2.5 h-10 rounded-xl text-xs font-bold flex-1 sm:flex-none uppercase tracking-wider cursor-pointer transition-all ${
                      invoiceSubsetToPrint.length > 0
                        ? "bg-sky-505 bg-sky-500 hover:bg-sky-400 text-white shadow-[0_0_15px_rgba(14,165,233,0.35)] hover:scale-[1.01]"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    Print Selected Invoices ({invoiceSubsetToPrint.length})
                  </button>
                </div>

                {/* Filter matches list */}
                {filteredInvoices.length === 0 ? (
                  <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl py-16 px-6 text-center shadow-xl backdrop-blur-md">
                    <FileText className="w-12 h-12 text-slate-650 text-slate-600 mx-auto mb-3" />
                    <h5 className="font-bold text-white text-base">No Matching Invoices Found</h5>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                      Try resetting your amount boundaries, check if spelling matches the sales team names, or search with details like dates or receipt numbers.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
                    
                    {/* Header Columns */}
                    <div className="grid grid-cols-12 bg-slate-950/45 border-b border-slate-800/50 p-4 text-[10px] font-semibold text-slate-400 tracking-wider uppercase text-left items-center select-none font-sans">
                      <div className="col-span-1 flex items-center justify-center">Selection</div>
                      <div 
                        onClick={() => handleSortToggle("pageNumber")} 
                        className="col-span-2 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                      >
                        Sheet <ArrowUpDown className="w-3 h-3" />
                      </div>
                      <div className="col-span-3">Invoice Number</div>
                      <div className="col-span-2">Client Details</div>
                      <div 
                        onClick={() => handleSortToggle("invoiceDate")} 
                        className="col-span-2 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                      >
                        Date <ArrowUpDown className="w-3 h-3" />
                      </div>
                      <div 
                        onClick={() => handleSortToggle("amount")} 
                        className="col-span-2 text-right hover:text-white transition-colors cursor-pointer flex items-center gap-1 justify-end"
                      >
                        Amount <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Scrolling data list */}
                    <div className="divide-y divide-slate-800/40 max-h-[64vh] overflow-y-auto">
                      {filteredInvoices.map((inv) => {
                        const isSelected = selectedInvoiceIds.has(inv.pageNumber);
                        const isActive = inv.pageNumber === activePreviewPage;

                        return (
                          <div
                            key={inv.pageNumber}
                            onClick={() => setActivePreviewPage(inv.pageNumber)}
                            className={`grid grid-cols-12 p-3.5 items-center text-xs text-left cursor-pointer transition-all duration-150 border-l-4 ${
                              isActive
                                ? "bg-sky-500/10 border-sky-500 hover:bg-sky-500/15 text-white"
                                : isSelected
                                ? "bg-slate-800/35 border-slate-700 hover:bg-slate-800/50 text-slate-200"
                                : "border-transparent hover:bg-slate-800/25 text-slate-300"
                            }`}
                          >
                            {/* Checkbox selector */}
                            <div 
                              onClick={(e) => {
                                e.stopPropagation(); // Avoid triggering active row state
                                toggleSelectInvoice(inv.pageNumber);
                              }}
                              className="col-span-1 flex justify-center items-center h-full min-w-8"
                            >
                              <div className="p-1 cursor-pointer hover:scale-110 transition-transform">
                                {isSelected ? (
                                  <CheckSquare className="w-4.5 h-4.5 text-sky-455 text-sky-400" />
                                ) : (
                                  <Square className="w-4.5 h-4.5 text-slate-655 text-slate-600 hover:text-slate-500" />
                                )}
                              </div>
                            </div>

                            {/* Page / Index */}
                            <div className="col-span-2 font-mono text-slate-500 font-semibold pr-2">
                              P. {inv.pageNumber}
                            </div>

                            {/* Code info */}
                            <div className="col-span-3 pr-2">
                              <p className="font-bold text-white tracking-tight">{inv.invoiceNumber || "N/A"}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1.5 font-mono">
                                <User className="w-2.5 h-2.5 inline-block shrink-0" />
                                {inv.salesAgent}
                              </p>
                            </div>

                            {/* Client */}
                            <div className="col-span-2 truncate pr-2">
                              <span className="font-medium text-slate-300">{inv.clientName || "Cash Customer"}</span>
                            </div>

                            {/* Date */}
                            <div className="col-span-2 font-mono text-slate-400">
                              {inv.invoiceDate}
                            </div>

                            {/* Cash Total */}
                            <div className="col-span-2 text-right font-bold text-sky-400 pr-2 font-mono scale-[1.01]">
                              ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column Sticky Document Canvas Page Previewer */}
              <div className="lg:col-span-3 h-full animate-fade-in">
                <div className="sticky top-24 space-y-4">
                  {activeInvoice && (
                    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 shadow-xl text-left backdrop-blur-md">
                      <div className="flex justify-between items-center border-b border-slate-805 border-b-slate-800/60 pb-3 mb-4">
                        <div>
                          <p className="text-[9px] font-black tracking-widest text-slate-455 text-slate-400 uppercase font-mono">Invoice Viewer</p>
                          <h4 className="font-bold text-sm text-white mt-0.5">{activeInvoice.invoiceNumber || "Draft Invoice"}</h4>
                        </div>
                        <span className="bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/60 font-mono text-[10px] font-semibold px-3 py-1 rounded-full text-center transition-colors">
                          Page {activeInvoice.pageNumber}
                        </span>
                      </div>

                      {/* PDF Frame Loader */}
                      <PDFPageRenderer
                        pdfDocument={pdfDocument}
                        pageNumber={activeInvoice.pageNumber}
                        isDemoMode={isDemoMode}
                        invoice={activeInvoice}
                        scale={1.2}
                      />

                      {/* Brief Metadata Breakdown */}
                      <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Billed to:</span>
                          <span className="font-bold text-slate-200 text-right">{activeInvoice.clientName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Sales Agent:</span>
                          <span className="font-bold text-sky-400 text-right">{activeInvoice.salesAgent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Transaction Date:</span>
                          <span className="font-bold text-slate-200 text-right font-mono">{activeInvoice.invoiceDate}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-800/60 pt-2 text-sm">
                          <span className="text-slate-450 text-slate-400 font-bold">Amount Due:</span>
                          <span className="font-bold text-sky-400 font-mono scale-[1.02]">${activeInvoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        {activeInvoice.itemsSummary && (
                          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-850 mt-3 text-[11px] text-slate-300 italic font-sans leading-relaxed">
                            <p className="font-bold text-[10px] text-slate-400 font-mono uppercase not-italic tracking-wider mb-1">Item summaries detected:</p>
                            {activeInvoice.itemsSummary}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* 3. Document Print Compiler Output (Invisible visually on web page, prints high quality pages) */}
      <PrintCompiler
        pdfDocument={pdfDocument}
        isDemoMode={isDemoMode}
        selectedInvoices={invoiceSubsetToPrint}
        onComplete={handlePrintCompilationComplete}
        onProgress={(msg, pct) => {
          setPrintingStatus({
            isPreparing: true,
            statusMessage: msg,
            progressPercent: pct,
          });
        }}
      />

      {/* 4. Global Print Compiling Modal Overlay */}
      {printingStatus?.isPreparing && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-6 text-center no-print animate-fade-in">
          <div className="bg-slate-900 border border-slate-805 border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col items-center">
            
            <div className="relative flex items-center justify-center mb-6">
              <span className="absolute animate-ping w-16 h-16 bg-sky-500/10 rounded-full inline-block opacity-45"></span>
              <div className="w-14 h-14 bg-sky-500/15 rounded-2xl flex items-center justify-center text-sky-400 relative z-10">
                <Printer className="w-7 h-7" />
              </div>
            </div>

            <h4 className="font-bold text-lg text-white tracking-tight font-sans">Compiling Invoices for Printing</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans leading-relaxed">
              Please wait while we format each transaction ledger. Do not close this terminal or reload the tab.
            </p>
            
            <p className="text-xs font-bold text-slate-300 mt-6 font-mono bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-lg max-w-xs truncate">
              {printingStatus.statusMessage}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-slate-950 h-2.5 rounded-full mt-4 overflow-hidden border border-slate-800 p-[1px]">
              <div 
                className="bg-sky-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                style={{ width: `${printingStatus.progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-sky-400 mt-2 font-mono">
              {printingStatus.progressPercent}% COMPILED
            </span>
          </div>
        </div>
      )}

      {/* Minimalistic Elegant Footer */}
      <footer className="py-6 mt-12 bg-slate-950/40 border-t border-slate-800/80 font-mono text-[10px] text-slate-500 tracking-wider uppercase text-center no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Integra Systems. All ledger audits authenticated.</p>
          <p>Calculations compiled via Google GenAI Studio Engine</p>
        </div>
      </footer>

    </div>
  );
}
