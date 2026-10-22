import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "../config/env.js";
let client;
export function getGeminiClient() {
    if (!env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is required before using the planning service.");
    }
    client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    return client;
}
const planAnalysisSchema = z.object({
    explanation: z.string().min(1).max(900),
    orderedStepIds: z.array(z.string().min(1)).length(6),
    riskNotes: z.array(z.string().min(1).max(240)).min(1).max(4),
});
export async function analyzeSetupPlan(plan) {
    const fallback = "The setup sequence uses the collected dashboard evidence, applies least privilege, and stops before execution until a human approves the exact plan.";
    const fallbackResult = {
        text: fallback,
        source: "deterministic",
        orderedStepIds: plan.steps.map((step) => step.id),
        riskNotes: [
            "Human approval is required before the mock setup runs.",
            "Production access remains disabled throughout the workflow.",
        ],
    };
    if (!env.GEMINI_API_KEY) {
        return fallbackResult;
    }
    try {
        const response = await getGeminiClient().models.generateContent({
            model: env.GEMINI_MODEL,
            contents: [
                "Act as a risk-aware developer environment planning analyst.",
                "Review the grounded plan below and return structured analysis for a human approver.",
                "Explain why the sandbox action and least-privilege role are appropriate in no more than three short sentences.",
                "Order every provided step ID exactly once. Respect safety dependencies: evidence first, sandbox before access or seeding, smoke login after setup, and manifest last.",
                "Include one to four concise risks or checks for the reviewer.",
                "Do not change any policy decision, invent evidence, introduce secrets, approve the plan, or claim execution happened.",
                JSON.stringify(plan),
            ].join("\n"),
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: {
                    type: "object",
                    additionalProperties: false,
                    required: ["explanation", "orderedStepIds", "riskNotes"],
                    properties: {
                        explanation: { type: "string" },
                        orderedStepIds: {
                            type: "array",
                            minItems: 6,
                            maxItems: 6,
                            items: { type: "string" },
                        },
                        riskNotes: {
                            type: "array",
                            minItems: 1,
                            maxItems: 4,
                            items: { type: "string" },
                        },
                    },
                },
            },
        });
        const parsed = planAnalysisSchema.parse(JSON.parse(response.text ?? ""));
        return {
            text: parsed.explanation.trim(),
            source: "gemini",
            orderedStepIds: parsed.orderedStepIds,
            riskNotes: parsed.riskNotes,
        };
    }
    catch {
        return fallbackResult;
    }
}
//# sourceMappingURL=gemini.js.map