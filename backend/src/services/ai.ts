import OpenAI from 'openai';

// OpenRouter client - OpenAI compatible API
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key-for-startup',
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'DeepRead AI'
  }
});

// Default model - Gemini 3 Flash via OpenRouter
const DEFAULT_MODEL = 'google/gemini-3-flash:beta';

// Alternative models users can choose
const MODELS = {
  'gemini-flash': 'google/gemini-3-flash:beta',
  'gemini-pro': 'google/gemini-3-pro:beta',
  'claude': 'anthropic/claude-3.5-sonnet',
  'gpt-4': 'openai/gpt-4o-mini'
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
}

function getModel(modelPreference: string): string {
  return MODELS[modelPreference as keyof typeof MODELS] || DEFAULT_MODEL;
}

export class AIService {
  async summarize(params: SummarizeParams): Promise<{
    content: string;
    tokensUsed: number;
  }> {
    const formatInstruction = params.format === 'bullet' 
      ? 'Provide the summary as bullet points.' 
      : 'Provide the summary as a concise paragraph.';

    const typeInstruction = {
      full: 'Summarize the entire document.',
      selection: 'Summarize the selected text.',
      chapter: 'Summarize this chapter.'
    }[params.type];

    const prompt = `${typeInstruction} ${formatInstruction}\n\nText:\n${params.text || 'Full document'}`;

    const model = getModel(params.model);

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
  }> {
    const prompt = `Analyze the following text and identify key concepts, provide definitions, and suggest related references.\n\nContext: ${params.context || 'General reading'}\n\nText:\n${params.text}\n\nRespond in JSON format with:\n- concepts: array of {name, definition, context, related[]}\n- references: array of {title, source, url?}`;

    const model = getModel(params.model);

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
    // Try to extract JSON if wrapped in markdown
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
      // Fallback if JSON parsing fails
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
  }

  async chat(params: ChatParams): Promise<{
    content: string;
    tokensUsed: number;
  }> {
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful reading assistant. Answer questions about the document being read.'
      },
      ...(params.history || []),
      { role: 'user' as const, content: params.message }
    ];

    const model = getModel(params.model);

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
  }
}

export const aiService = new AIService();
