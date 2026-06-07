/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Invoice } from "../types";

interface PrintCompilerProps {
  pdfDocument: any | null;
  selectedInvoices: Invoice[];
  isDemoMode: boolean;
  onComplete: () => void;
  onProgress: (statusMessage: string, progress: number) => void;
}

export function PrintCompiler({
  pdfDocument,
  selectedInvoices,
  isDemoMode,
  onComplete,
  onProgress,
}: PrintCompilerProps) {
  const [compiled, setCompiled] = useState(false);

  useEffect(() => {
    if (selectedInvoices.length === 0) {
      onComplete();
      return;
    }

    if (isDemoMode) {
      onProgress("Structuring A4 vector invoices...", 100);
      setCompiled(true);
      // Let React layout settle for a tiny moment before printing
      setTimeout(() => {
        onComplete();
      }, 300);
      return;
    }

    if (!pdfDocument) {
      onComplete();
      return;
    }

    let isCancelled = false;
    const total = selectedInvoices.length;

    const compileAllPages = async () => {
      try {
        onProgress(`Compiling page 0 of ${total} high-DPI print canvases...`, 5);
        
        // Render pages in batches of 5 so we don't crash memory with massive 200+ canvas structures in parallel
        const batchSize = 5;
        for (let i = 0; i < total; i += batchSize) {
          if (isCancelled) return;
          
          const batch = selectedInvoices.slice(i, i + batchSize);
          const promises = batch.map(async (invoice, batchIdx) => {
            const index = i + batchIdx;
            
            try {
              const page = await pdfDocument.getPage(invoice.pageNumber);
              const canvasId = `print-canvas-layer-${invoice.pageNumber}`;
              const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
              
              if (canvas) {
                const context = canvas.getContext("2d");
                if (context) {
                  // High resolution rendering for printable documents: scale 1.8
                  const viewport = page.getViewport({ scale: 1.8 });
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  
                  await page.render({
                    canvasContext: context,
                    viewport: viewport,
                  }).promise;
                }
              }
            } catch (err) {
              console.error(`Failed to compile print canvas page ${invoice.pageNumber}:`, err);
            }
          });

          await Promise.all(promises);

          const compiledCount = Math.min(i + batchSize, total);
          const percentage = Math.floor((compiledCount / total) * 90); // Scales to 90%
          onProgress(`Compiling page ${compiledCount} of ${total} high-DPI print canvases...`, percentage);
        }

        if (!isCancelled) {
          onProgress("Finalizing print margins...", 100);
          setCompiled(true);
          setTimeout(() => {
            onComplete();
          }, 300);
        }
      } catch (err) {
        console.error("Print compilation failed:", err);
        onComplete();
      }
    };

    compileAllPages();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument, selectedInvoices, isDemoMode]);

  return (
    <div id="print-section" className="hidden print:block w-full bg-white text-zinc-950 font-sans">
      {selectedInvoices.map((inv) => (
        <div key={inv.pageNumber} className="page-break bg-white flex flex-col justify-center items-center w-full min-h-screen p-0 m-0 overflow-hidden">
          {isDemoMode ? (
            // Crisp, beautiful printable vector HTML Invoice layout for Demo Mode
            <div 
              className="w-full bg-white p-12 text-zinc-800 font-sans leading-relaxed text-left border border-zinc-100"
              style={{ width: "210mm", minHeight: "297mm", boxSizing: "border-box" }}
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-zinc-200 pb-6 mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">I</span>
                    <span className="font-bold tracking-tight text-lg text-zinc-900">INTEGRA GLOBAL</span>
                  </div>
                  <p className="text-xs text-zinc-500">12/A, Tajmahal Road, Mohammadpur</p>
                  <p className="text-xs text-zinc-500">Dhaka - 1207, Bangladesh</p>
                  <p className="text-xs text-zinc-500">Contact: support@integra-global.com</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-zinc-100 text-zinc-800 rounded-full mb-3 uppercase tracking-wider">
                    Official Invoice Ledger
                  </span>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{inv.invoiceNumber}</h2>
                  <p className="text-xs text-zinc-500 mt-1">Issue Date: <strong className="text-zinc-700">{inv.invoiceDate}</strong></p>
                </div>
              </div>

              {/* Details Section */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-2">Bill To</p>
                  <p className="font-bold text-zinc-900">{inv.clientName}</p>
                  <p className="text-xs text-zinc-500 mt-1">Corporate Client Accounts</p>
                  <p className="text-xs text-zinc-500">Authorized Purchasing Division</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-2">Sales Agent Details</p>
                  <p className="font-bold text-zinc-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block text-emerald-500"></span>
                    {inv.salesAgent}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Designation: Senior Account Manager</p>
                  <p className="text-xs text-zinc-500">Division: Regional Sales Office</p>
                </div>
              </div>

              {/* Products Summary */}
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-3">Itemized Billings</p>
              <div className="border border-zinc-200 rounded-lg overflow-hidden mb-8">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-left">
                      <th className="py-3 px-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Description</th>
                      <th className="py-3 px-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest text-center">Qty</th>
                      <th className="py-3 px-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest text-right">Unit Price</th>
                      <th className="py-3 px-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-200 text-xs text-zinc-800">
                      <td className="py-4 px-4 font-semibold text-zinc-800">
                        {inv.itemsSummary || "General wholesale commercial supply batch services"}
                      </td>
                      <td className="py-4 px-4 text-center text-zinc-500">1</td>
                      <td className="py-4 px-4 text-right text-zinc-600">${inv.amount.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-bold text-zinc-950">${inv.amount.toLocaleString()}</td>
                    </tr>
                    <tr className="text-xs bg-zinc-50/20">
                      <td className="py-3 px-4 text-zinc-400 italic">Handling, clearance, and shipment logs</td>
                      <td className="py-3 px-4 text-center text-zinc-400">1</td>
                      <td className="py-3 px-4 text-right text-zinc-400">Included</td>
                      <td className="py-3 px-4 text-right text-zinc-400">$0.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals panel */}
              <div className="flex justify-end mb-12">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-500">
                    <span>Subtotal:</span>
                    <span>${inv.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 border-b border-zinc-100 pb-2">
                    <span>Tax:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-bold text-zinc-900">
                    <span>Total Due:</span>
                    <span className="text-emerald-700 font-extrabold">${inv.amount.toLocaleString()} USD</span>
                  </div>
                </div>
              </div>

              {/* Footer Terms */}
              <div className="border-t border-dashed border-zinc-200 pt-6 mt-auto text-center">
                <p className="text-[10px] text-zinc-400 font-medium">Terms: Net 30 days. Payment processed by digital clearing gate.</p>
                <p className="text-[9px] text-zinc-400 mt-1">Thank you for your business. Page {inv.pageNumber} of Invoice Ledger Document.</p>
              </div>
            </div>
          ) : (
            // Canvas elements rendered on the fly
            <canvas
              id={`print-canvas-layer-${inv.pageNumber}`}
              className="w-full h-auto"
              style={{ maxWidth: "210mm", display: "block" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
