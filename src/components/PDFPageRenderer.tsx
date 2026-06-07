/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Invoice } from "../types";
import { FileText, Loader2, Printer } from "lucide-react";

interface PDFPageRendererProps {
  pdfDocument: any | null;
  pageNumber: number;
  isDemoMode: boolean;
  invoice: Invoice;
  scale?: number;
}

export function PDFPageRenderer({
  pdfDocument,
  pageNumber,
  isDemoMode,
  invoice,
  scale = 1.3,
}: PDFPageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoMode || !pdfDocument) {
      return;
    }

    let isCancelled = false;
    let renderTask: any = null;
    setLoading(true);
    setError(null);

    const renderPDFPage = async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        // Custom device pixel ratio to maintain rendering smoothness
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale });
        
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.scale(dpr, dpr);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
        
        if (!isCancelled) {
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error rendering page:", err);
        if (!isCancelled) {
          setError("Failed to render PDF page canvas.");
          setLoading(false);
        }
      }
    };

    renderPDFPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {}
      }
    };
  }, [pdfDocument, pageNumber, isDemoMode, scale]);

  if (!isDemoMode && !pdfDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-96 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 p-6 text-center">
        <FileText className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-sm text-slate-450 text-slate-400 font-medium">No PDF Loaded</p>
      </div>
    );
  }

  return (
    <div className="relative border border-slate-800 rounded-xl bg-slate-950 shadow-inner overflow-auto max-h-[70vh] flex justify-center items-start p-4">
      {loading && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-sky-450 text-sky-400" />
            <p className="text-xs text-slate-405 text-slate-400 font-medium font-sans">Rendering high-res invoice canvas...</p>
          </div>
        </div>
      )}

      {error ? (
        <p className="text-xs text-rose-500 font-medium p-4">{error}</p>
      ) : isDemoMode ? (
        // High-fidelity printable vector invoice layout for Demo Mode
        <div 
          className="w-full max-w-2xl bg-white p-8 text-zinc-800 font-sans leading-relaxed text-left border border-zinc-100"
          style={{ minHeight: "297mm" }} // Standard A4 Aspect Ratio representation
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b border-zinc-100 pb-6 mb-8">
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
              <span className="inline-block px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full mb-3 uppercase tracking-wider">
                Official Invoice
              </span>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{invoice.invoiceNumber}</h2>
              <p className="text-xs text-zinc-500 mt-1">Issue Date: <strong className="text-zinc-700">{invoice.invoiceDate}</strong></p>
            </div>
          </div>

          {/* Details Section */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-2">Bill To</p>
              <p className="font-bold text-zinc-900">{invoice.clientName}</p>
              <p className="text-xs text-zinc-500 mt-1">Corporate Client Accounts</p>
              <p className="text-xs text-zinc-500">Authorized Purchasing Division</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-2">Sales Agent Details</p>
              <p className="font-bold text-zinc-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                {invoice.salesAgent}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Designation: Senior Account Manager</p>
              <p className="text-xs text-zinc-500">Division: Regional Sales Office</p>
            </div>
          </div>

          {/* Products Summary */}
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-3">Itemized Billings</p>
          <div className="border border-zinc-100 rounded-lg overflow-hidden mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100 text-left">
                  <th className="py-3 px-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Description</th>
                  <th className="py-3 px-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider text-center">Qty</th>
                  <th className="py-3 px-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider text-right">Unit Price</th>
                  <th className="py-3 px-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-zinc-100 text-xs">
                  <td className="py-4 px-4 font-medium text-zinc-800">
                    {invoice.itemsSummary || "General wholesale commercial supply batch services"}
                  </td>
                  <td className="py-4 px-4 text-center text-zinc-500">1</td>
                  <td className="py-4 px-4 text-right text-zinc-600">${invoice.amount.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right font-semibold text-zinc-950">${invoice.amount.toLocaleString()}</td>
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
            <div className="w-64 space-y-2.5 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal:</span>
                <span>${invoice.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Vat / Tax (0%):</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-2.5 text-sm font-bold text-zinc-900">
                <span>Total Due:</span>
                <span className="text-emerald-700 font-extrabold">${invoice.amount.toLocaleString()} USD</span>
              </div>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="border-t border-dashed border-zinc-100 pt-6 mt-auto text-center">
            <p className="text-[10px] text-zinc-400 font-medium">Terms: Net 30 days. Payment processed by digital clearing gate.</p>
            <p className="text-[9px] text-zinc-400 mt-1">Thank you for your business. Page {invoice.pageNumber} of Invoice Ledger Document.</p>
          </div>
        </div>
      ) : (
        <canvas ref={canvasRef} className="shadow-lg bg-white border border-slate-800/60 rounded" />
      )}
    </div>
  );
}
