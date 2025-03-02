// src/lib/ai/openaiService.ts

interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AITaskSuggestion {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours?: number;
}

export async function generateAITasksWithOpenAI(
  planType: string,
  objectives: string[],
  duration: number,
  participants: number
): Promise<AITaskSuggestion[]> {
  // Get API token from environment variable
  const API_TOKEN = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!API_TOKEN) {
    console.warn("OpenAI API token not found, using fallback rule-based generation");
    return [];
  }

  // Create a prompt for the AI
  const prompt = `
    Generate a list of ${Math.min(10, objectives.length * 2)} tasks for a ${planType} plan with the following objectives:
    ${objectives.map(obj => `- ${obj}`).join('\n')}

    The plan duration is ${duration} days with ${participants} participants.

    For each task, provide:
    1. A short, clear title (maximum 8 words)
    2. A brief description (maximum 20 words)
    3. Priority (high, medium, or low)
    4. Estimated hours to complete (a number between 1 and 40)

    Return ONLY a valid JSON array of objects with the format:
    [
      {
        "title": "Task title",
        "description": "Task description",
        "priority": "high/medium/low",
        "estimatedHours": number
      }
    ]

    Ensure the JSON is valid with no trailing commas.
  `;

  // Prepare the API request
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  const requestData: OpenAIRequest = {
    model: "gpt-4o-mini", // You can change this to other models as needed
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 0.9
  };

  try {
    // Make the API call with a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error from OpenAI API:", errorText);
      return [];
    }

    const result = await response.json() as OpenAIResponse;

    // Extract the generated text from the response
    const generatedText = result.choices[0]?.message.content || '';

    // Extract the JSON part from the text
    const jsonRegex = /\[\s*\{\s*"title"[\s\S]*\}\s*\]/g;
    const jsonMatch = generatedText.match(jsonRegex);

    if (!jsonMatch) {
      console.warn("Could not extract JSON from AI response:", generatedText);
      return [];
    }

    try {
      // Parse the JSON
      const jsonText = jsonMatch[0];
      const tasks = JSON.parse(jsonText) as AITaskSuggestion[];

      // Validate and filter tasks
      return tasks.filter(task =>
        task.title &&
        task.description &&
        ['high', 'medium', 'low'].includes(task.priority)
      );
    } catch (parseError) {
      console.error("Error parsing JSON from AI response:", parseError);
      return [];
    }
  } catch (error) {
    // Handle network errors, timeouts, or aborted requests
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      console.error("Request to OpenAI API timed out");
    } else {
      console.error("Error calling OpenAI API:", error);
    }
    return [];
  }
}
