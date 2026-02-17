import OpenAI from 'openai';
import { aiModelFallback } from './aiResilience';
import { logger } from '../utils/logger';

// OpenRouter client - OpenAI compatible API
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key-for-startup',
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'DeepRead AI'
  }
});

// Default model - Minimax M2.5 via OpenRouter
const DEFAULT_MODEL = 'minimax/minimax-m2.5';

// Alternative models users can choose
const MODELS = {
  'gemini-flash': 'google/gemini-3-flash:beta',
  'gemini-pro': 'google/gemini-3-pro:beta',
  'claude': 'anthropic/claude-3.5-sonnet',
  'gpt-4': 'openai/gpt-4o-mini',
  'minimax': 'minimax/minimax-m2.5'
};

interface SummarizeParams {
  text?: string;
  type: 'full' | 'selection' | 'chapter';
  format: 'paragraph' | 'bullet';
  model: string;
}

interface DeepDiveParams {
  text: string;
  context?: string;
  model: string;
}

interface ChatParams {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  model: string;
  documentContext?: string;
  documentTitle?: string;
}

function getModel(modelPreference: string): string {
  return MODELS[modelPreference as keyof typeof MODELS] || DEFAULT_MODEL;
}

export class AIService {
  /**
   * Stream summarize - returns an async generator for SSE
   */
  async *streamSummarize(params: SummarizeParams): AsyncGenerator<string, void, unknown> {
    const formatInstruction = params.format === 'bullet'
      ? 'Provide the summary as bullet points.'
      : 'Provide the summary as a concise paragraph.';

    const typeInstruction = {
      full: 'Summarize the entire document.',
      selection: 'Summarize the selected text.',
      chapter: 'Summarize this chapter.'
    }[params.type];

    const prompt = `${typeInstruction} ${formatInstruction}

Below is the content to summarize:

---CONTENT START---
${params.text || 'Full document'}
---CONTENT END---

Important: Summarize ONLY the content provided above. Do not say you cannot access it - the content is right there between ---CONTENT START--- and ---CONTENT END---.`;
    const model = getModel(params.model);

    const stream = await openrouter.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful reading assistant that provides clear, concise summaries.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  async summarize(params: SummarizeParams): Promise<{
    content: string;
    tokensUsed: number;
    modelUsed?: string;
  }> {
    const formatInstruction = params.format === 'bullet'
      ? 'Provide the summary as bullet points.'
      : 'Provide the summary as a concise paragraph.';

    const typeInstruction = {
      full: 'Summarize the entire document.',
      selection: 'Summarize the selected text.',
      chapter: 'Summarize this chapter.'
    }[params.type];

    const prompt = `${typeInstruction} ${formatInstruction}

Below is the content to summarize:

---CONTENT START---
${params.text || 'Full document'}
---CONTENT END---

Important: Summarize ONLY the content provided above. Do not say you cannot access it - the content is right there between ---CONTENT START--- and ---CONTENT END---.`;

    const preferredModel = getModel(params.model);

    // Use fallback system
    const { result, modelUsed } = await aiModelFallback.executeWithFallback(
      async (model) => {
        const response = await openrouter.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful reading assistant that provides clear, concise summaries.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1000
        });

        return {
          content: response.choices[0]?.message?.content || 'No summary generated',
          tokensUsed: response.usage?.total_tokens || 0
        };
      },
      preferredModel
    );

    logger.info(`Summary generated with model: ${modelUsed}`);

    return {
      ...result,
      modelUsed
    };
  }

  async deepDive(params: DeepDiveParams): Promise<{
    concepts: Array<{
      name: string;
      definition: string;
      context: string;
      related: string[];
    }>;
    references: Array<{
      title: string;
      source: string;
      url?: string;
    }>;
    tokensUsed: number;
    modelUsed?: string;
  }> {
    const prompt = `Analyze the following text and identify key concepts, provide definitions, and suggest related references.\n\nContext: ${params.context || 'General reading'}\n\nText:\n${params.text}\n\nRespond in JSON format with:\n- concepts: array of {name, definition, context, related[]}\n- references: array of {title, source, url?}`;

    const preferredModel = getModel(params.model);

    // Use fallback system
    const { result, modelUsed } = await aiModelFallback.executeWithFallback(
      async (model) => {
        const response = await openrouter.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a knowledgeable research assistant. Provide accurate, educational information.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2000
        });

        const content = response.choices[0]?.message?.content || '{}';
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/{[\s\S]*}/);
        const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;

        try {
          const parsed = JSON.parse(jsonStr);
          return {
            concepts: parsed.concepts || [],
            references: parsed.references || [],
            tokensUsed: response.usage?.total_tokens || 0
          };
        } catch (e) {
          return {
            concepts: [{
              name: 'Analysis',
              definition: content.slice(0, 500),
              context: 'Generated analysis',
              related: []
            }],
            references: [],
            tokensUsed: response.usage?.total_tokens || 0
          };
        }
      },
      preferredModel
    );

    logger.info(`Deep dive generated with model: ${modelUsed}`);

    return {
      ...result,
      modelUsed
    };
  }

  /**
   * Stream chat - returns an async generator for SSE
   */
  async *streamChat(params: ChatParams): AsyncGenerator<string, void, unknown> {
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful reading assistant. Answer questions about the document being read.'
      },
      ...(params.history || []),
      { role: 'user' as const, content: params.message }
    ];

    const model = getModel(params.model);

    const stream = await openrouter.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  async chat(params: ChatParams): Promise<{
    content: string;
    tokensUsed: number;
    modelUsed?: string;
  }> {
    // Build system message with document context
    let systemContent = 'You are a helpful reading assistant. Answer questions about the document being read.';
    
    if (params.documentContext) {
      systemContent = `You are a helpful reading assistant for the document "${params.documentTitle || 'Document'}".
      
Answer questions based on the following document content:

---DOCUMENT START---
${params.documentContext}
---DOCUMENT END---

Instructions:
- Answer questions specifically about this document's content
- Quote relevant passages when helpful
- If the answer is not in the document, say so clearly
- Be concise but thorough`;
    }

    const messages = [
      {
        role: 'system' as const,
        content: systemContent
      },
      ...(params.history || []),
      { role: 'user' as const, content: params.message }
    ];

    const preferredModel = getModel(params.model);

    // Use fallback system
    const { result, modelUsed } = await aiModelFallback.executeWithFallback(
      async (model) => {
        const response = await openrouter.chat.completions.create({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1500
        });

        return {
          content: response.choices[0]?.message?.content || 'No response generated',
          tokensUsed: response.usage?.total_tokens || 0
        };
      },
      preferredModel
    );

    logger.info(`Chat response generated with model: ${modelUsed}`);

    return {
      ...result,
      modelUsed
    };
  }
}

export const aiService = new AIService();
