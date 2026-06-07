/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { generateDemoInvoices } from "../utils/demoData";
import { Invoice } from "../types";
import { FileText, Loader2, PlayCircle, UploadCloud, AlertCircle } from "lucide-react";

interface UploadSectionProps {
  onParsedInvoices: (invoices: Invoice[], isDemo: boolean, pdfDoc: any | null) => void;
}

export function UploadSection({ onParsedInvoices }: UploadSectionProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startDemoMode = () => {
    try {
      setLoading(true);
      setStatusMessage("Synthesizing 165 realistic ledger records across 8 Sales Agents...");
      setProgressPercent(40);
      
      setTimeout(() => {
        setProgressPercent(80);
        setStatusMessage("Assembling vectors and layouts...");
        
        setTimeout(() => {
          const demoRecords = generateDemoInvoices();
          onParsedInvoices(demoRecords, true, null);
          setLoading(false);
        }, 600);
      }, 500);
    } catch (err: any) {
      setErrorMessage("Failed to boot simulated demo invoices.");
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processPDFFile(files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        processPDFFile(file);
      } else {
        setErrorMessage("Please select or drop a valid PDF ledger file (.pdf).");
      }
    }
  };

  const processPDFFile = async (file: File) => {
    setLoading(true);
    setErrorMessage(null);
    setProgressPercent(5);
    setStatusMessage(`Reading PDF file stream: "${file.name}"...`);

    try {
      // 1. Verify PDF.js exists on window
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error(
          "PDF.js rendering engine was not loaded from CDN yet. Please check your internet connection or reload the page."
        );
      }

      // 2. Read array buffer
      const fileReader = new FileReader();
      const arrayBufferPromise = new Promise<ArrayBuffer>((resolve, reject) => {
        fileReader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        fileReader.onerror = () => reject(new Error("Unable to read the raw PDF file."));
      });
      fileReader.readAsArrayBuffer(file);
      const arrayBuffer = await arrayBufferPromise;

      // 3. Load PDF via PDF.js
      setProgressPercent(15);
      setStatusMessage("Initializing PDF.js engine and mapping invoice index...");
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdfDoc.numPages;

      if (numPages === 0) {
        throw new Error("The selected PDF file does not contain any valid page layers.");
      }

      // 4. Extract page-by-page texts in parallel batches to prevent browser lockups while gaining extreme speed
      setProgressPercent(25);
      setStatusMessage(`Pre-extracting document text locally (0 of ${numPages} pages processed)...`);

      const extractedPages: Array<{ pageNumber: number; text: string }> = new Array(numPages);
      const extractionConcurrency = 25; // Process 25 pages in parallel chunks

      const extractPageText = async (pageNum: number) => {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Piece text together with space padding
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ")
          .trim();

        return {
          pageNumber: pageNum,
          text: pageText || `[Blank page ${pageNum} - no index extracted]`,
        };
      };

      for (let i = 1; i <= numPages; i += extractionConcurrency) {
        const promises: Promise<{ pageNumber: number; text: string }>[] = [];
        for (let j = i; j < i + extractionConcurrency && j <= numPages; j++) {
          promises.push(extractPageText(j));
        }

        const results = await Promise.all(promises);
        results.forEach((res) => {
          extractedPages[res.pageNumber - 1] = res;
        });

        const currentProcessed = Math.min(i + extractionConcurrency - 1, numPages);
        const textExtractProgress = 25 + Math.floor((currentProcessed / numPages) * 25); // Scales 25% to 50%
        setProgressPercent(textExtractProgress);
        setStatusMessage(`Pre-extracting document text locally (${currentProcessed} of ${numPages} pages processed)...`);
      }

      // 5. Query server endpoint in parallel chunks to save time & respect response token limitations
      const allParsedInvoices: Invoice[] = [];
      const batchSize = 35; // Process up to 35 invoices at a time
      const totalBatches = Math.ceil(numPages / batchSize);

      setStatusMessage(`Starting Server Audits in parallel with Gemini AI across ${totalBatches} batches...`);

      // We dispatch ALL server batches concurrently so the total network delay equals a single request!
      let completedBatches = 0;
      const batchPromises = Array.from({ length: totalBatches }).map(async (_, batchIdx) => {
        const batchPages = extractedPages.slice(batchIdx * batchSize, (batchIdx + 1) * batchSize);
        const firstPageNum = batchPages[0].pageNumber;
        const lastPageNum = batchPages[batchPages.length - 1].pageNumber;

        const response = await fetch("/api/parse-invoices", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pages: batchPages }),
        });

        if (!response.ok) {
          const errorResponse = await response.json().catch(() => ({}));
          throw new Error(
            errorResponse.error || `Server returned error status ${response.status} during batch ${batchIdx + 1}.`
          );
        }

        const data = await response.json();
        completedBatches++;

        // Dynamically increment uploader progress bar as parallel batches finish up
        const aiProgress = 50 + Math.floor((completedBatches / totalBatches) * 45);
        setProgressPercent(aiProgress);
        setStatusMessage(`AI extraction: completed batch ${completedBatches} of ${totalBatches} (Loaded pages ${firstPageNum}-${lastPageNum})...`);

        return data.invoices && Array.isArray(data.invoices) ? data.invoices : [];
      });

      const batchesResults = await Promise.all(batchPromises);
      batchesResults.forEach((invoicesList) => {
        allParsedInvoices.push(...invoicesList);
      });

      setProgressPercent(100);
      setStatusMessage("Finalizing data alignments...");

      // Sort invoices by page number
      allParsedInvoices.sort((a, b) => a.pageNumber - b.pageNumber);

      // Successfully processed!
      setTimeout(() => {
        onParsedInvoices(allParsedInvoices, false, pdfDoc);
        setLoading(false);
      }, 500);

    } catch (err: any) {
      console.error("Uploader process failure:", err);
      // Frame the errors constructively
      setErrorMessage(
        err.message || "An unexpected error occurred while parsing the ledger. Please ensure your backend is active."
      );
      setLoading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/50 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl transition-all duration-300">
      
      {/* Title block */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">
          Upload Invoice Ledger Document
        </h2>
        <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
          Drop your multi-page billing transaction PDF containing 150-200+ invoices. The system will audit the document and auto-detect independent Sales Agents, allowing visual search, filtering, and mass-printing layouts.
        </p>
      </div>

      {loading ? (
        // Progress Screen
        <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
          <div className="relative flex items-center justify-center mb-6">
            <span className="absolute animate-ping w-16 h-16 bg-sky-500/10 rounded-full inline-block opacity-45"></span>
            <div className="w-14 h-14 bg-sky-500/15 rounded-2xl flex items-center justify-center text-sky-400 relative z-10">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          </div>
          
          <h4 className="font-bold text-lg text-white">Processing Invoice Ledger</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md font-mono">{statusMessage}</p>
          
          {/* Detailed Progress Bar */}
          <div className="w-full max-w-md bg-slate-950 h-2.5 rounded-full mt-6 overflow-hidden border border-slate-800/80 p-[1px]">
            <div 
              className="bg-sky-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-sky-400 mt-2">
            {progressPercent}% COMPLETE
          </span>
        </div>
      ) : (
        // Interaction Panel
        <div className="space-y-6">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={triggerFileSelect}
            className={`border-2 border-dashed rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
              isDragOver
                ? "border-sky-500 bg-sky-500/5 scale-[0.99]"
                : "border-slate-800 hover:border-slate-700 hover:bg-slate-950/20"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              className="hidden"
            />
            
            <UploadCloud className={`w-12 h-12 mb-4 transition-transform duration-300 ${isDragOver ? "text-sky-450 -translate-y-1" : "text-sky-500"}`} />
            
            <p className="text-sm font-bold text-white">
              Drag & drop ledger PDF file here or <span className="text-sky-400 underline">browse</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              Supports large documents up to 50MB (Recommended size: 150-300 pages)
            </p>
          </div>

          {/* Quick Sandbox / Demo Prompt */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-800/60"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#020617] px-4 text-slate-500 font-extrabold tracking-widest uppercase">Or try a Demo sandbox</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={startDemoMode}
              className="group flex items-center gap-2 px-5 py-3 h-11 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold shadow-lg hover:text-white hover:scale-[1.01] transition-all cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
              Load Interactive Demo Ledger (165 Pages)
            </button>
            <p className="text-[10px] text-slate-500 mt-2 leading-tight text-center">
              Instantly boots up 165 autocheck invoice records with high-contrast simulated printing layers.
            </p>
          </div>
        </div>
      )}

      {/* Error Message Box */}
      {errorMessage && (
        <div className="mt-6 bg-red-950/30 border border-red-900/50 rounded-xl p-4 flex gap-3 text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-white">Document Audit Error</p>
            <p className="text-xs text-red-200 leading-relaxed font-medium">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
