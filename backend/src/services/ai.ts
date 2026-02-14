import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a knowledgeable research assistant. Provide accurate, educational information.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      concepts: parsed.concepts || [],
      references: parsed.references || [],
      tokensUsed: response.usage?.total_tokens || 0
    };
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
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
