/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Invoice } from "../types";

// Generate 165 realistic invoices for 8 different agents spanning dates in 2026
const AGENTS = [
  "Sumaiya Rahman",
  "Asif Mahmud",
  "Rashed Chowdhury",
  "Sarah Jenkins",
  "David Miller",
  "Fatima Al-Hasan",
  "Michael Stark",
  "Jim Halpert"
];

const CLIENTS = [
  "Acme Solutions Ltd",
  "Apex Global Trading",
  "Dhaka Logistics",
  "Metropolitan Retailers",
  "Nexus Software House",
  "Benson & Brothers Corp",
  "Bengal Horizon Group",
  "Pulse Healthcare Systems",
  "Zenith Construction",
  "Starlight Textiles Co",
  "Pioneer Finance",
  "Orient Foods & Bev"
];

const ITEMS_CATEGORIES = [
  "Corporate office stationeries, printing paper and legal desks",
  "Cloud software licenses and employee enterprise communication software",
  "Industrial power generator parts and technical machinery tuning tools",
  "Imported cotton yarns and custom packaging materials",
  "Server cabinets, Category 6 ethernet cables, and routing nodes",
  "Medical examination tables, surgical masks, and thermometer kits",
  "High-durability safety helmets, concrete rebar ties, and scaffolding anchors",
  "Organic spice concentrates, premium tea bags, and culinary bottles"
];

export function generateDemoInvoices(): Invoice[] {
  const invoices: Invoice[] = [];
  const startDate = new Date("2026-01-01").getTime();

  for (let i = 1; i <= 165; i++) {
    const agent = AGENTS[i % AGENTS.length];
    const client = CLIENTS[(i * 3) % CLIENTS.length];
    const items = ITEMS_CATEGORIES[i % ITEMS_CATEGORIES.length];
    
    // Distribute dates across early 2026
    const daysOffset = (i * 13) % 150; 
    const dateObj = new Date(startDate + daysOffset * 24 * 60 * 60 * 1000);
    const invoiceDate = dateObj.toISOString().split("T")[0];

    // Generate balanced random amount
    const baseAmount = 150 + ((i * 123) % 4800);
    const cents = ((i * 17) % 100) / 100;
    const amount = parseFloat((baseAmount + cents).toFixed(2));

    invoices.push({
      pageNumber: i,
      invoiceNumber: `INV-2026-${1000 + i}`,
      salesAgent: agent,
      clientName: client,
      invoiceDate: invoiceDate,
      amount: amount,
      itemsSummary: items
    });
  }

  return invoices;
}
