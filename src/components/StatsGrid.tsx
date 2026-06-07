/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Invoice } from "../types";
import { BarChart3, CreditCard, DollarSign, FileSpreadsheet, Users } from "lucide-react";

interface StatsGridProps {
  invoices: Invoice[];
  filteredInvoices: Invoice[];
}

export function StatsGrid({ invoices, filteredInvoices }: StatsGridProps) {
  // Stats on overall loaded PDF sets
  const totalInvoices = invoices.length;
  const totalVolume = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  const agentsMap = new Map<string, number>();
  invoices.forEach((inv) => {
    agentsMap.set(inv.salesAgent, (agentsMap.get(inv.salesAgent) || 0) + inv.amount);
  });
  const uniqueAgentsCount = agentsMap.size;

  // Stats on filtered selection
  const filteredCount = filteredInvoices.length;
  const filteredVolume = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const filteredAverage = filteredCount > 0 ? filteredVolume / filteredCount : 0;

  // Sorted list of agents by sales contribution for the sidebar panel
  const sortedAgents = Array.from(agentsMap.entries())
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-lg flex items-start gap-4">
          <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales Volume</p>
            <h3 className="text-2xl font-bold text-white tracking-tight mt-1">
              ${filteredVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-550 mt-1.5 text-slate-500">
              Out of <span className="font-semibold text-slate-300">${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> overall
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-lg flex items-start gap-4">
          <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filtered Invoices</p>
            <h3 className="text-2xl font-bold text-white tracking-tight mt-1">
              {filteredCount.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-550 mt-1.5 text-slate-500">
              Out of <span className="font-semibold text-slate-300">{totalInvoices.toLocaleString()}</span> in ledger document
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-lg flex items-start gap-4">
          <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales Agents</p>
            <h3 className="text-2xl font-bold text-white tracking-tight mt-1">
              {uniqueAgentsCount}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Assignee managers captured from pages
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-lg flex items-start gap-4">
          <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Invoice Value</p>
            <h3 className="text-2xl font-bold text-white tracking-tight mt-1">
              ${filteredAverage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Average across selected subset
            </p>
          </div>
        </div>
      </div>

      {/* Agents Performance Section */}
      {sortedAgents.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <h4 className="font-bold text-sm text-slate-200 uppercase tracking-wider">Agent Performance Breakdown (Total Revenue)</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedAgents.slice(0, 10).map((agent, index) => {
              const maxSales = sortedAgents[0]?.sales || 1;
              const percentageOfMax = (agent.sales / maxSales) * 100;
              const overallPercentage = totalVolume > 0 ? (agent.sales / totalVolume) * 100 : 0;

              return (
                <div key={agent.name} className="flex flex-col gap-1 p-2.5 bg-slate-950/40 rounded-xl border border-slate-850">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-400 shrink-0 flex items-center justify-center text-[10px] font-black">
                        {index + 1}
                      </span>
                      {agent.name}
                    </span>
                    <span className="font-mono text-slate-400 font-medium">
                      <span className="font-bold text-white">${agent.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      <span className="text-[10px] ml-1">({overallPercentage.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-905 bg-slate-950 rounded-full h-2 mt-1 overflow-hidden">
                    <div
                      className="bg-sky-500 h-2 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(14,165,233,0.3)]"
                      style={{ width: `${Math.max(5, percentageOfMax)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
