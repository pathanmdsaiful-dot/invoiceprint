/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// Set up JSON body parser with increased limit to support high-page counts
app.use(express.json({ limit: "50mb" }));

// Initialize GoogleGenAI client lazily to avoid crashing on start if API key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please open Settings > Secrets and add your real API key.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Full audit & parse endpoint
app.post("/api/parse-invoices", async (req, res) => {
  try {
    const { pages } = req.body;
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      res.status(400).json({ error: "Missing pages property or empty page array." });
      return;
    }

    const ai = getAiClient();

    // Group the text of pages into a readable prompt format
    const pagePromptTexts = pages
      .map((p) => `--- START PAGE ${p.pageNumber} ---\n${p.text}\n--- END PAGE ${p.pageNumber} ---`)
      .join("\n\n");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          text: `Evaluate the text contents of the following invoice pages and extract the structured invoice metadata.
Each page corresponds to exactly one separate invoice. Below are the page text blocks:

${pagePromptTexts}

Please extract: pageNumber, invoiceNumber, salesAgent, clientName, invoiceDate, amount, and itemsSummary. Make sure to respond with a valid JSON list matching the schema requested.`,
        },
      ],
      config: {
        systemInstruction: `You are an expert financial accountant. Your task is to process text chunks corresponding to pages of a single multi-invoice PDF.
Each page number in the response MUST correspond exactly to the pageNumber in the input block.

CRITICAL RULES for Sales Agent detection:
1. Identify fields indicating the sales representative. Examples: "Sales Agent", "Salesperson", "Sales Rep", "Agent", "Rep", "Bighati", "Sold By", "Account Manager", "Staff", "Consultant", "Prepared By", "Served By".
2. Search diligently for a person's name associated with these fields. If a name is found, format it using title case (e.g., "John Doe", "Jane Smith").
3. Do not include titles (e.g. "Mr.", "Mrs.", "Agent") or department codes.
4. If there is absolutely no salesperson, sales agent, or prepared-by signature name inside the page content, set salesAgent to "Not Disclosed". Do NOT leave it empty.

CRITICAL RULES for and formatting:
1. invoiceNumber: Find the invoice ID, sequential receipt number, or reference number. If none, leave empty "".
2. clientName: Find the buyer name, billing organization, or "Bill To:" name.
3. invoiceDate: Find invoice issue date and parse into YYYY-MM-DD. If cannot parse, output raw date string.
4. amount: Parse total amount due or grand total. Ensure it is a valid floating-point number.
5. itemsSummary: Provide a brief phrase summarizing items sold (e.g., "Office supplies, desks, and printing materials").

Ensure output strictly adheres to the requested JSON structure.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            invoices: {
              type: Type.ARRAY,
              description: "Array of extracted invoice objects",
              items: {
                type: Type.OBJECT,
                properties: {
                  pageNumber: {
                    type: Type.INTEGER,
                    description: "The page number from the input block.",
                  },
                  invoiceNumber: {
                    type: Type.STRING,
                    description: "The invoice identifier number or ID.",
                  },
                  salesAgent: {
                    type: Type.STRING,
                    description: "The name of the sales agent, representative, or salesperson. Return 'Not Disclosed' if none.",
                  },
                  clientName: {
                    type: Type.STRING,
                    description: "The name of the client or company being billed.",
                  },
                  invoiceDate: {
                    type: Type.STRING,
                    description: "The date of invoice issuance (formatted cleanly as YYYY-MM-DD).",
                  },
                  amount: {
                    type: Type.NUMBER,
                    description: "The grand total billing amount as a number.",
                  },
                  itemsSummary: {
                    type: Type.STRING,
                    description: "A short, elegant summary of what was sold.",
                  },
                },
                required: ["pageNumber", "invoiceNumber", "salesAgent", "clientName", "invoiceDate", "amount"],
              },
            },
          },
          required: ["invoices"],
        },
      },
    });

    const textResponse = response.text || "";
    const parsedData = JSON.parse(textResponse.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error parsing invoices with Gemini:", error);
    res.status(500).json({
      error: error.message || "An error occurred during Gemini processing.",
    });
  }
});

// Start integration with Vite for dev/production handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve HTML entry in production fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();
