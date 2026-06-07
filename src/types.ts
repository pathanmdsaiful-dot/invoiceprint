/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Invoice {
  pageNumber: number;
  invoiceNumber: string;
  salesAgent: string;
  clientName: string;
  invoiceDate: string;
  amount: number;
  itemsSummary?: string;
}

export interface ParseBatchRequest {
  pages: Array<{
    pageNumber: number;
    text: string;
  }>;
}

export interface ParseBatchResponse {
  invoices: Invoice[];
}
