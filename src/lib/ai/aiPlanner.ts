import {  collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Types for our AI planning system
interface PlanInput {
  groupId: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  objectives: string[];
  createdBy: string;
  participants: number;
  planType: 'project' | 'event' | 'study' | 'other';
}

interface Task {
  title: string;
  description: string;
  assignedTo?: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  dependencies?: string[];
  category?: string;
}

interface AIGeneratedPlan {
  tasks: Task[];
  roles: string[];
  suggestions: string[];
  milestones?: string[];
}

interface AITaskSuggestion {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours?: number;
  category?: string;
  dependencies?: string[];
}

// AI Service Interface
interface AIServiceResponse {
  tasks: AITaskSuggestion[];
  roles?: string[];
  suggestions?: string[];
  milestones?: string[];
  success: boolean;
  error?: string;
}

// Add this helper function after the imports
function logAIResponse(source: string, response: any): void {
  console.log(`==== ${source} RESPONSE DEBUG ====`);
  try {
    if (typeof response === 'string') {
      console.log(`Raw text (${response.length} chars):`);
      console.log(response.substring(0, 500) + (response.length > 500 ? '...' : ''));
    } else {
      console.log(`Response type: ${typeof response}`);
      console.log('Response preview:');
      console.log(JSON.stringify(response, null, 2).substring(0, 500) + '...');
    }
  } catch (e) {
    console.log('Error logging response:', e);
  }
  console.log(`==== END ${source} RESPONSE DEBUG ====`);
}

// Enhanced OpenAI Service
async function generateTasksWithOpenAI(
  planType: string,
  planTitle: string,
  planDescription: string,
  objectives: string[],
  duration: number,
  participants: number,
  useSimplePrompt: boolean = false
): Promise<AIServiceResponse> {
  // Check if OpenAI should be skipped
  if (process.env.NEXT_PUBLIC_SKIP_OPENAI === 'true') {
    console.log("Skipping OpenAI due to environment variable setting");
    return { tasks: [], success: false };
  }

  // Get API token from environment variable
  const API_TOKEN = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!API_TOKEN) {
    console.warn("OpenAI API token not found");
    return { tasks: [], success: false };
  }

  // Explicitly handle common OpenAI API issues
  const handleOpenAIError = (errorText: string) => {
    // Check for quota exceeded errors with various phrasings
    if (errorText.includes("exceeded your current quota") ||
        errorText.includes("quota exceeded") ||
        errorText.includes("rate limit") ||
        errorText.includes("billing") && errorText.includes("check")) {
      console.warn("🚨 OPENAI QUOTA EXCEEDED: You have exceeded your current quota. Please check your plan and billing details.");
      console.log("Falling back to alternative planning method due to quota limits");
      return {
        tasks: [],
        success: false,
        error: "OpenAI API quota exceeded. Using alternative planning method."
      };
    } else if (errorText.includes("invalid_api_key")) {
      console.warn("INVALID OPENAI API KEY: The API key provided is not valid");
      return {
        tasks: [],
        success: false,
        error: "Invalid OpenAI API key. Using alternative planning method."
      };
    } else {
      console.error("Error from OpenAI API:", errorText);
      return {
        tasks: [],
        success: false,
        error: `OpenAI API error: ${errorText.substring(0, 100)}...`
      };
    }
  };

  // Create a simpler system prompt
  const systemPrompt = useSimplePrompt
    ? `You are a task planning assistant.`
    : `You are a task planning assistant. Create tasks for ${planType} plans.`;

  // Create user prompt based on complexity level
  const userPrompt = useSimplePrompt
    ? `Create a task plan for ${planType}: "${planTitle}" with objectives: ${objectives.join(', ')}. Return JSON with tasks array where each task has title, description, priority fields.`
    : `
Create a task plan for a ${planType}:
Title: ${planTitle}
Objectives: ${objectives.join(', ')}
Duration: ${duration} days, Team size: ${participants}

Return ONLY a JSON object with this format:
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "priority": "high/medium/low",
      "estimatedHours": number
    }
  ]
}`;

  // Adjust model and settings based on simple prompt
  // Using only "gpt-3.5-turbo" which is widely available and supported
  // Reduced token count to stay within free tier limits
  const model = "gpt-3.5-turbo";
  const maxTokens = useSimplePrompt ? 500 : 800;
  const temperature = useSimplePrompt ? 0.8 : 0.7;

  // Prepare the API request
  const apiUrl = 'https://api.openai.com/v1/chat/completions';
  const requestData = {
    model: model,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    temperature: temperature,
    max_tokens: maxTokens,
    top_p: 0.95
  };

  try {
    // Make the API call with a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("OpenAI request timed out after 15 seconds, aborting.");
      controller.abort();
    }, 15000); // Reduced to 15 seconds to be more responsive

    // Use our proxy endpoint instead of direct OpenAI API
    console.log("Calling OpenAI via proxy endpoint");
    const response = await fetch('/api/openai-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return handleOpenAIError(errorText);
    }

    const result = await response.json();
    const generatedContent = result.choices[0]?.message.content || '';

    console.log("Generated content from OpenAI (preview):",
              generatedContent.length > 100 ? generatedContent.substring(0, 100) + "..." : generatedContent);

    // Log the full response for debugging
    logAIResponse('OPENAI', generatedContent);

    // Multiple approaches to parse the response
    let parsedResponse = null;

    // First attempt: direct JSON parse
    try {
      parsedResponse = JSON.parse(generatedContent);
      console.log("Successfully parsed direct JSON from OpenAI");
    } catch (parseError) {
      console.log("OpenAI response is not direct JSON, trying to extract...");
    }

    // Second attempt: Use regex to find JSON
    if (!parsedResponse) {
      try {
        const jsonRegex = /\{[\s\S]*\}/g;
        const jsonMatch = generatedContent.match(jsonRegex);

        if (jsonMatch && jsonMatch.length > 0) {
          parsedResponse = JSON.parse(jsonMatch[0]);
          console.log("Successfully extracted JSON from OpenAI using regex");
        }
      } catch (parseError) {
        console.log("Failed to extract JSON from OpenAI with regex");
      }
    }

    // If we have a parsed response, validate and return it
    if (parsedResponse) {
      // Validate the response format
      if (!parsedResponse.tasks || !Array.isArray(parsedResponse.tasks)) {
        console.log("Invalid response format from OpenAI, no tasks array found");
        return { tasks: [], success: false };
      }

      // Filter and validate tasks
      const validTasks = parsedResponse.tasks
        .filter((task: any) =>
          task &&
          task.title &&
          task.description &&
          (!task.priority || ['high', 'medium', 'low'].includes(task.priority))
        )
        .map((task: any) => ({
          title: task.title,
          description: task.description,
          priority: task.priority || 'medium',
          estimatedHours: typeof task.estimatedHours === 'number' ?
                        task.estimatedHours :
                        Math.floor(Math.random() * 8) + 2, // 2-10 hours if not specified
          category: task.category || null,
          dependencies: Array.isArray(task.dependencies) ? task.dependencies : []
        }));

      if (validTasks.length === 0) {
        console.log("No valid tasks found in OpenAI response");
        return { tasks: [], success: false };
      }

      // Return the validated response
      return {
        tasks: validTasks,
        roles: Array.isArray(parsedResponse.roles) ? parsedResponse.roles : [],
        suggestions: Array.isArray(parsedResponse.suggestions) ? parsedResponse.suggestions : [],
        milestones: Array.isArray(parsedResponse.milestones) ? parsedResponse.milestones : [],
        success: true
      };
    } else {
      // Last resort: Try to extract tasks from text if JSON parsing failed
      console.log("Could not parse JSON from OpenAI response, trying to extract tasks from text");

      // Log the raw response for debugging
      console.log("==== OPENAI RESPONSE TEXT ====");
      console.log(generatedContent.substring(0, 500) + (generatedContent.length > 500 ? "..." : ""));
      console.log("==== END OPENAI RESPONSE TEXT ====");

      // Try to extract tasks from the text response
      const extractedTasks: AITaskSuggestion[] = [];

      // Pattern 1: Look for numbered or bulleted tasks with title and description
      const taskPattern = /(?:^|\n)(?:\d+\.|\*|\-)\s+(?:Task:?\s*)?([^\n]+)(?:\n+(?:Description:?\s*)?([^\n]+))?(?:\n+(?:Priority:?\s*)?(high|medium|low))?(?:\n+(?:Estimated Hours:?\s*)?(\d+(?:\.\d+)?))?(?:\n+(?:Category:?\s*)?([^\n]+))?/gi;

      let match;
      while ((match = taskPattern.exec(generatedContent)) !== null) {
        const [_, title, description, priority, hours, category] = match;
        if (title) {
          extractedTasks.push({
            title: title.trim(),
            description: description ? description.trim() : `Task for ${title.trim()}`,
            priority: (priority?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
            estimatedHours: hours ? parseFloat(hours) : 4,
            category: category ? category.trim() : planType
          });
        }
      }

      // Pattern 2: Look for tasks with explicit markers
      const markedTaskPattern = /Task(?:\s+\d+)?:?\s*([^\n]+)(?:\n+Description:?\s*([^\n]+))?(?:\n+Priority:?\s*(high|medium|low))?(?:\n+Estimated Hours:?\s*(\d+(?:\.\d+)?))?(?:\n+Category:?\s*([^\n]+))?/gi;

      while ((match = markedTaskPattern.exec(generatedContent)) !== null) {
        const [_, title, description, priority, hours, category] = match;
        if (title && !extractedTasks.some(t => t.title === title.trim())) {
          extractedTasks.push({
            title: title.trim(),
            description: description ? description.trim() : `Task for ${title.trim()}`,
            priority: (priority?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
            estimatedHours: hours ? parseFloat(hours) : 4,
            category: category ? category.trim() : planType
          });
        }
      }

      // Pattern 3: Look for markdown-style lists if we still don't have tasks
      if (extractedTasks.length === 0) {
        console.log("No tasks found with standard patterns, trying to extract from markdown lists");

        // Look for markdown-style lists (- Task: description)
        const markdownListPattern = /(?:^|\n)(?:\-|\*|\d+\.)\s+([^:\n]+)(?::?\s*([^\n]+))?/gi;

        while ((match = markdownListPattern.exec(generatedContent)) !== null) {
          const [_, titlePart, descriptionPart] = match;
          if (titlePart) {
            const title = titlePart.trim();
            // Skip if it's too short or looks like a header
            if (title.length > 3 && !title.toUpperCase().includes('TASK') && !title.includes('===')) {
              extractedTasks.push({
                title: title,
                description: descriptionPart ? descriptionPart.trim() : `Task for ${title}`,
                priority: 'medium',
                estimatedHours: 4,
                category: planType
              });
            }
          }
        }
      }

      // Pattern 4: Last resort - look for sentences that might be tasks
      if (extractedTasks.length === 0) {
        console.log("No tasks found in lists, trying to extract from sentences");

        // Split by sentences and look for potential task descriptions
        const sentences = generatedContent.split(/[.!?][\s\n]+/);
        for (const sentence of sentences) {
          // Only use sentences that are likely to be tasks (contain action verbs)
          const actionVerbs = ['create', 'develop', 'design', 'implement', 'plan', 'organize', 'research', 'build', 'prepare', 'set up'];
          if (actionVerbs.some(verb => sentence.toLowerCase().includes(verb)) && sentence.length > 15) {
            extractedTasks.push({
              title: sentence.trim(),
              description: `Task: ${sentence.trim()}`,
              priority: 'medium',
              estimatedHours: 4,
              category: planType
            });
          }
        }
      }

      // If we found tasks in the text, use them
      if (extractedTasks.length > 0) {
        console.log(`Successfully extracted ${extractedTasks.length} tasks from OpenAI text response`);
        return {
          tasks: extractedTasks,
          success: true,
          suggestions: [
            `Focus on high priority tasks first.`,
            `This plan was created based on text analysis.`,
            `Consider breaking down complex objectives into smaller tasks.`
          ]
        };
      }

      // If no tasks were found, return an error
      console.log("Could not extract any valid tasks from OpenAI response");
      return {
        tasks: [],
        success: false,
        error: "Could not extract tasks from OpenAI response"
      };
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("Request to OpenAI API timed out");
    } else {
      console.error("Error calling OpenAI API:", error);
    }
    return { tasks: [], success: false };
  }
}

// Enhanced Hugging Face Service
async function generateTasksWithHuggingFace(
  planType: string,
  planTitle: string,
  planDescription: string,
  objectives: string[],
  duration: number,
  participants: number,
  attemptNumber: number = 1
): Promise<AIServiceResponse> {
  // Get API token from environment variable
  const API_TOKEN = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;

  if (!API_TOKEN) {
    console.warn("Hugging Face API token not found");
    return { tasks: [], success: false };
  }

  // Handle Hugging Face API errors more explicitly
  const handleHuggingFaceError = (url: string, errorText: string) => {
    if (errorText.includes("auth method doesn't allow")) {
      console.warn(`HUGGING FACE PERMISSION ERROR: Your token doesn't have inference permissions. Please check the "Make calls to inference providers" and "Make calls to inference Endpoints" options in your token settings.`);
      return {
        tasks: [],
        success: false,
        error: "Hugging Face API permission error. Using alternative planning method."
      };
    } else if (errorText.includes("does not exist")) {
      console.warn(`HUGGING FACE MODEL ERROR: The specified model does not exist or is not accessible. Trying fallback model.`);
      return {
        tasks: [],
        success: false,
        error: "Hugging Face model not accessible. Trying fallback model."
      };
    } else if (errorText.includes("tokens + `max_new_tokens` must be <=")) {
      console.warn(`HUGGING FACE TOKEN LIMIT ERROR: Reducing token count for next attempt.`);
      return {
        tasks: [],
        success: false,
        error: "Hugging Face token limit exceeded. Trying with reduced token count."
      };
    } else {
      console.error(`Error from Hugging Face API (${url}):`, errorText);
      // Add a more visible log for debugging
      console.log(`🚨 HUGGING FACE API ERROR - Using fallback methods`);
      return {
        tasks: [],
        success: false,
        error: `Hugging Face API error: ${errorText.substring(0, 100)}...`
      };
    }
  };

  // Select more reliable models
  let model = "";
  let fallbackModel = "";

  switch (attemptNumber) {
    case 1:
      model = "gpt2"; // This is a reliable model with basic permissions
      fallbackModel = "distilgpt2";
      break;
    case 2:
      model = "distilgpt2";
      fallbackModel = "gpt2";
      break;
    case 3:
    default:
      model = "EleutherAI/gpt-neo-125m";
      fallbackModel = "facebook/opt-125m";
      break;
  }

  // Simpler prompts to avoid token limits
  let prompt = "";
  const maxTokens = 100; // Much smaller to avoid token limit errors

  // Adjust prompt complexity based on attempt number - simplify for better chances of success
  if (attemptNumber === 1) {
    prompt = `Create a plan for ${planType} "${planTitle}" with objectives: ${objectives.slice(0, 2).join(", ")}`;
  } else if (attemptNumber === 2) {
    prompt = `Plan for ${planType}: ${planTitle}. Tasks needed.`;
  } else {
    prompt = `Generate tasks for ${planType}`;
  }

  // Prepare the API request with appropriate parameters
  const requestData = {
    inputs: prompt,
    parameters: {
      max_new_tokens: maxTokens,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true,
      return_full_text: false
    }
  };

  const makeRequest = async (url: string, timeoutMs: number = 20000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`Request to ${url} timed out after ${timeoutMs/1000} seconds, aborting.`);
      controller.abort();
    }, timeoutMs);

    try {
      // Extract just the model name from the URL
      const modelPath = url.split('/models/')[1];

      console.log(`Attempting to call Hugging Face API with model: ${modelPath} via proxy`);

      // Use the proxy endpoint instead of direct HF API
      const response = await fetch('/api/huggingface-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelPath,
          inputs: requestData.inputs,
          parameters: {
            ...requestData.parameters,
            max_new_tokens: Math.min(requestData.parameters.max_new_tokens, 100) // Ensure we don't exceed proxy limits
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return handleHuggingFaceError(url, errorText);
      }

      console.log(`Successfully received response from proxy for model: ${modelPath}`);
      const responseData = await response.json();

      // Check if the response contains an error message from our proxy
      if (responseData.generated_text && responseData.generated_text.startsWith('Error:')) {
        return handleHuggingFaceError(url, responseData.generated_text);
      }

      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);

      // Check specifically for abort errors
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('abort'))) {
        console.warn(`Network timeout when calling ${url} - this is expected during development or with free API tiers`);
        return {
          tasks: [],
          success: false,
          error: "Request to Hugging Face API timed out. Using alternative planning method."
        };
      } else {
      console.error(`Error calling Hugging Face API (${url}):`, error);
        return {
          tasks: [],
          success: false,
          error: error instanceof Error ? error.message : "Unknown error calling Hugging Face API"
        };
      }
    }
  };

  // Try primary model first, then fallback
  const modelUrl = `https://api-inference.huggingface.co/models/${model}`;
  const fallbackUrl = `https://api-inference.huggingface.co/models/${fallbackModel}`;

  const timeout = attemptNumber === 1 ? 30000 : 20000; // Longer timeout for first attempt

  let result = await makeRequest(modelUrl, timeout);

  if (!result) {
    console.log(`Model ${model} failed, trying fallback model: ${fallbackModel}`);
    result = await makeRequest(fallbackUrl, timeout);
  }

  // Trying to parse JSON from the text response
  if (result) {
  // Extract the generated text from the response
  let generatedText = '';

  if (Array.isArray(result)) {
    generatedText = result[0]?.generated_text || '';
    } else if (typeof result === 'object' && result !== null) {
    generatedText = result.generated_text || '';
    } else if (typeof result === 'string') {
      generatedText = result;
    } else {
      console.log("Unexpected response format from Hugging Face:", typeof result);
      try {
        generatedText = JSON.stringify(result);
      } catch (e) {
        console.error("Cannot stringify Hugging Face response:", e);
      }
    }

    console.log("Generated text from Hugging Face (preview):",
                generatedText.length > 100 ? generatedText.substring(0, 100) + "..." : generatedText);

    // Log the full response for debugging
    logAIResponse('HUGGING FACE', generatedText);

    // Try to extract tasks from the text response
    const extractedTasks: AITaskSuggestion[] = [];

    // Log the raw response for debugging
    console.log("==== HUGGING FACE TEXT EXTRACTION ====");
    console.log(generatedText.substring(0, 500) + (generatedText.length > 500 ? "..." : ""));
    console.log("==== END HUGGING FACE TEXT EXTRACTION ====");

    // Pattern 1: Look for numbered or bulleted tasks with title and description
    const taskPattern = /(?:^|\n)(?:\d+\.|\*|\-)\s+(?:Task:?\s*)?([^\n]+)(?:\n+(?:Description:?\s*)?([^\n]+))?(?:\n+(?:Priority:?\s*)?(high|medium|low))?(?:\n+(?:Estimated Hours:?\s*)?(\d+(?:\.\d+)?))?(?:\n+(?:Category:?\s*)?([^\n]+))?/gi;

    let match;
    while ((match = taskPattern.exec(generatedText)) !== null) {
      const [_, title, description, priority, hours, category] = match;
      if (title) {
        extractedTasks.push({
          title: title.trim(),
          description: description ? description.trim() : `Task for ${title.trim()}`,
          priority: (priority?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
          estimatedHours: hours ? parseFloat(hours) : 4,
          category: category ? category.trim() : planType
        });
      }
    }

    // Pattern 2: Look for tasks with explicit markers
    const markedTaskPattern = /Task(?:\s+\d+)?:?\s*([^\n]+)(?:\n+Description:?\s*([^\n]+))?(?:\n+Priority:?\s*(high|medium|low))?(?:\n+Estimated Hours:?\s*(\d+(?:\.\d+)?))?(?:\n+Category:?\s*([^\n]+))?/gi;

    while ((match = markedTaskPattern.exec(generatedText)) !== null) {
      const [_, title, description, priority, hours, category] = match;
      if (title && !extractedTasks.some(t => t.title === title.trim())) {
        extractedTasks.push({
          title: title.trim(),
          description: description ? description.trim() : `Task for ${title.trim()}`,
          priority: (priority?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
          estimatedHours: hours ? parseFloat(hours) : 4,
          category: category ? category.trim() : planType
        });
      }
    }

    // Pattern 3: Look for markdown-style lists if we still don't have tasks
    if (extractedTasks.length === 0) {
      console.log("No tasks found with standard patterns, trying to extract from markdown lists");

      // Look for markdown-style lists (- Task: description)
      const markdownListPattern = /(?:^|\n)(?:\-|\*|\d+\.)\s+([^:\n]+)(?::?\s*([^\n]+))?/gi;

      while ((match = markdownListPattern.exec(generatedText)) !== null) {
        const [_, titlePart, descriptionPart] = match;
        if (titlePart) {
          const title = titlePart.trim();
          // Skip if it's too short or looks like a header
          if (title.length > 3 && !title.toUpperCase().includes('TASK') && !title.includes('===')) {
            extractedTasks.push({
              title: title,
              description: descriptionPart ? descriptionPart.trim() : `Task for ${title}`,
              priority: 'medium',
              estimatedHours: 4,
              category: planType
            });
          }
        }
      }
    }

    // Pattern 4: Last resort - look for sentences that might be tasks
    if (extractedTasks.length === 0) {
      console.log("No tasks found in lists, trying to extract from sentences");

      // Split by sentences and look for potential task descriptions
      const sentences = generatedText.split(/[.!?][\s\n]+/);
      for (const sentence of sentences) {
        // Only use sentences that are likely to be tasks (contain action verbs)
        const actionVerbs = ['create', 'develop', 'design', 'implement', 'plan', 'organize', 'research', 'build', 'prepare', 'set up'];
        if (actionVerbs.some(verb => sentence.toLowerCase().includes(verb)) && sentence.length > 15) {
          extractedTasks.push({
            title: sentence.trim(),
            description: `Task: ${sentence.trim()}`,
            priority: 'medium',
            estimatedHours: 4,
            category: planType
          });
        }
      }
    }

    // If we found tasks in the text, use them
    if (extractedTasks.length > 0) {
      console.log(`Successfully extracted ${extractedTasks.length} tasks from Hugging Face text response`);
    return {
        tasks: extractedTasks,
        success: true,
        suggestions: [
          `Focus on high priority tasks first.`,
          `This plan was created based on text analysis.`,
          `Consider breaking down complex objectives into smaller tasks.`
        ]
      };
    }
  }

    return { tasks: [], success: false };
  }

// Helper functions for generating roles and suggestions
function getRolesForPlanType(planType: string): string[] {
  switch (planType) {
    case 'project':
      return ["Project Manager", "Team Lead", "Developer", "Quality Assurance", "Documentation Specialist"];
    case 'event':
      return ["Event Coordinator", "Logistics Manager", "Marketing Specialist", "Guest Relations", "Technical Support"];
    case 'study':
      return ["Study Group Leader", "Research Coordinator", "Content Creator", "Session Facilitator", "Note Taker"];
    default:
      return ["Team Lead", "Coordinator", "Task Owner", "Quality Reviewer"];
  }
}

function generateSuggestionsForPlan(planType: string, duration: number, participants: number): string[] {
  const suggestions = [
    `Start with a clear kickoff meeting to ensure everyone understands the objectives.`,
    `Regular check-ins will help keep the ${planType} on track.`,
    `Document decisions and progress throughout the ${planType}.`
  ];

  if (duration < 14) {
    suggestions.push(`This is a short timeline. Focus on high-priority tasks first.`);
  } else if (duration > 30) {
    suggestions.push(`Consider breaking this ${planType} into phases for better management.`);
  }

  if (participants < 3) {
    suggestions.push(`With a small team, each person may need to handle multiple roles.`);
  } else if (participants > 7) {
    suggestions.push(`With a larger team, create sub-teams with clear responsibilities.`);
  }

  return suggestions;
}

// Local model for task generation without any AI APIs
function generateTasksWithLocalModel(
  planType: string,
  planTitle: string,
  planDescription: string,
  objectives: string[],
  duration: number,
  participants: number
): AIServiceResponse {
  console.log("Using local task generation model");

  // Create basic categories based on plan type
  const categories = {
    'project': ['Planning', 'Design', 'Implementation', 'Testing', 'Review', 'Documentation'],
    'event': ['Planning', 'Logistics', 'Marketing', 'Coordination', 'Execution', 'Follow-up'],
    'study': ['Planning', 'Research', 'Content Creation', 'Learning Sessions', 'Review', 'Assessment'],
    'other': ['Planning', 'Execution', 'Coordination', 'Review', 'Documentation']
  };

  // Select appropriate categories based on plan type
  const planCategories = categories[planType as keyof typeof categories] || categories['other'];

  // Basic task templates that will be customized
  const taskTemplates = [
    {
      title: "Kickoff Meeting",
      description: "Initial team meeting to discuss plan details and objectives",
      priority: 'high' as 'high',
      estimatedHours: 2,
      category: "Planning"
    },
    {
      title: "Create Detailed Timeline",
      description: "Develop comprehensive timeline with milestones and deadlines",
      priority: 'high' as 'high',
      estimatedHours: 3,
      category: "Planning",
      dependencies: ["Kickoff Meeting"]
    },
    {
      title: "Assign Team Roles",
      description: "Define and distribute responsibilities among team members",
      priority: 'high' as 'high',
      estimatedHours: 2,
      category: "Planning",
      dependencies: ["Kickoff Meeting"]
    }
  ];

  // Add objective-based tasks
  const tasks: AITaskSuggestion[] = [...taskTemplates];

  // Add task for each objective
  objectives.forEach((objective, index) => {
    const category = planCategories[index % planCategories.length];

    // Implementation task
    tasks.push({
      title: `Implement: ${objective.slice(0, 30)}`,
      description: `Work on completing "${objective.slice(0, 15)}..."`,
      priority: index < 3 ? "high" : index < 6 ? "medium" : "low",
      estimatedHours: Math.floor(Math.random() * 16) + 4, // 4-20 hours
      category,
      dependencies: ["Assign Team Roles"]
    });

    // Review task
    if (index % 2 === 0) {
      tasks.push({
        title: `Review: ${objective.slice(0, 30)}`,
        description: `Review and validate progress on "${objective.slice(0, 12)}..."`,
        priority: "medium",
        estimatedHours: Math.floor(Math.random() * 4) + 1, // 1-5 hours
        category: "Review",
        dependencies: [`Implement: ${objective.slice(0, 30)}`]
      });
    }
  });

  // Add final tasks
  tasks.push({
    title: "Final Review Meeting",
    description: "Team meeting to review all completed objectives",
    priority: "high",
    estimatedHours: 2,
    category: "Review",
    dependencies: tasks.filter(t => t.title.startsWith("Implement:")).map(t => t.title)
  });

  tasks.push({
    title: "Documentation & Wrap-up",
    description: "Complete all documentation and finalize deliverables",
    priority: "medium",
    estimatedHours: 4,
    category: "Documentation",
    dependencies: ["Final Review Meeting"]
  });

  // Generate roles based on plan type
  const rolesByPlanType = {
    'project': ["Project Manager", "Team Lead", "Developer", "Quality Assurance", "Documentation Specialist"],
    'event': ["Event Coordinator", "Logistics Manager", "Marketing Specialist", "Guest Relations", "Technical Support"],
    'study': ["Study Group Leader", "Research Coordinator", "Content Creator", "Session Facilitator", "Note Taker"],
    'other': ["Team Lead", "Coordinator", "Task Owner", "Quality Reviewer"]
  };

  const roles = rolesByPlanType[planType as keyof typeof rolesByPlanType] || rolesByPlanType['other'];

  // Generate suggestions based on plan type and duration
  const suggestions = [
    `Start with a clear kickoff meeting to ensure everyone understands the objectives.`,
    `Regular check-ins will help keep the ${planType} on track.`,
    `Document decisions and progress throughout the ${planType}.`
  ];

  if (duration < 14) {
    suggestions.push(`This is a short timeline. Focus on high-priority tasks first.`);
  } else if (duration > 30) {
    suggestions.push(`Consider breaking this ${planType} into phases for better management.`);
  }

  if (participants < 3) {
    suggestions.push(`With a small team, each person may need to handle multiple roles.`);
  } else if (participants > 7) {
    suggestions.push(`With a larger team, create sub-teams with clear responsibilities.`);
  }

  // Generate milestones
  const milestones = [
    `Planning Complete (by day ${Math.floor(duration * 0.2)})`,
    `50% of Objectives Complete (by day ${Math.floor(duration * 0.5)})`,
    `All Objectives Complete (by day ${Math.floor(duration * 0.8)})`,
    `Final Documentation and Wrap-up (by day ${Math.floor(duration * 0.95)})`
  ];

  return {
    tasks,
    roles,
    suggestions,
    milestones,
    success: true
  };
}

// Enhanced Multi-Service AI Plan Generator
async function generateAITasksEnhanced(
  planInput: PlanInput
): Promise<AIServiceResponse> {
  const {
    planType,
    title,
    description,
    objectives,
    startDate,
    endDate,
    participants
  } = planInput;

  // Calculate total duration in days
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Check if we can use AI services based on environment variables
  const hasOpenAIKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY &&
                       process.env.NEXT_PUBLIC_OPENAI_API_KEY.length > 10;
  const hasHuggingFaceKey = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY &&
                            process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY.length > 10;

  // Check if external AI is disabled via environment variable
  const disableExternalAI = process.env.NEXT_PUBLIC_DISABLE_EXTERNAL_AI === 'true';
  const forceLocalModel = process.env.NEXT_PUBLIC_FORCE_LOCAL_MODEL === 'true';
  const skipOpenAI = process.env.NEXT_PUBLIC_SKIP_OPENAI === 'true';

  // Force AI models to be used if specified
  const forceAIModels = process.env.NEXT_PUBLIC_FORCE_AI_MODELS === 'true';

  if (disableExternalAI || forceLocalModel) {
    console.log("External AI disabled via environment variable, using local model");
    return generateTasksWithLocalModel(
      planType,
      title,
      description,
      objectives,
      totalDays,
      participants
    );
  }

  // Skip API calls if credentials are not proper to avoid unnecessary errors
  if (!hasOpenAIKey && !hasHuggingFaceKey) {
    console.log("No valid API keys detected, using local generation model");
    return generateTasksWithLocalModel(
      planType,
      title,
      description,
      objectives,
      totalDays,
      participants
    );
  }

  // Track if we encountered quota issues
  let quotaExceeded = false;
  let quotaMessage = "";

  // Try OpenAI first unless we're skipping it
  let openAIResponse: AIServiceResponse = { tasks: [], success: false };
  if (hasOpenAIKey && !skipOpenAI) {
  console.log("Trying to generate tasks with OpenAI...");
    try {
      openAIResponse = await generateTasksWithOpenAI(
    planType,
    title,
    description,
    objectives,
    totalDays,
    participants
  );

  if (openAIResponse.success && openAIResponse.tasks.length > 0) {
    console.log("Successfully generated plan with OpenAI");
    return openAIResponse;
      } else {
        console.log("OpenAI returned no tasks, will try alternative service");

        // Check if this was a quota issue
        if (openAIResponse.error && openAIResponse.error.includes("quota")) {
          quotaExceeded = true;
          quotaMessage = "OpenAI API quota exceeded. ";
        }
      }
    } catch (error) {
      console.warn("OpenAI generation error:", error);
    }
  }

  // If OpenAI fails or is not available, try Hugging Face with multiple attempts
  let huggingFaceResponse: AIServiceResponse = { tasks: [], success: false };
  if (hasHuggingFaceKey) {
    console.log("Trying Hugging Face for task generation...");

    // Try up to 3 times with different models/settings
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Hugging Face attempt ${attempt}/3...`);
      try {
        huggingFaceResponse = await generateTasksWithHuggingFace(
    planType,
    title,
    description,
    objectives,
    totalDays,
          participants,
          attempt // Pass the attempt number to try different models
  );

  if (huggingFaceResponse.success && huggingFaceResponse.tasks.length > 0) {
          console.log(`Successfully generated plan with Hugging Face on attempt ${attempt}`);
    return huggingFaceResponse;
        } else {
          console.log(`Hugging Face attempt ${attempt} returned no tasks`);

          // Check if this was a quota or permission issue
          if (huggingFaceResponse.error &&
             (huggingFaceResponse.error.includes("permission") ||
              huggingFaceResponse.error.includes("error"))) {
            quotaExceeded = true;
            quotaMessage += "Hugging Face API error. ";
            break; // No need to try more attempts if we have permission issues
          }
        }
      } catch (error) {
        console.warn(`Hugging Face generation error on attempt ${attempt}:`, error);
      }

      // Short delay between attempts
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log("All Hugging Face attempts failed");
  }

  // Last chance - try one more time with OpenAI if it failed earlier
  if (hasOpenAIKey && !skipOpenAI && !openAIResponse.success && !quotaExceeded) {
    console.log("Final attempt with OpenAI using simpler prompt...");
    try {
      // Use a simpler prompt with lower token count
      const simpleOpenAIResponse = await generateTasksWithOpenAI(
        planType,
        title,
        description,
        objectives,
        totalDays,
        participants,
        true // Use simpler prompt
      );

      if (simpleOpenAIResponse.success && simpleOpenAIResponse.tasks.length > 0) {
        console.log("Successfully generated plan with OpenAI on final attempt");
        return simpleOpenAIResponse;
      }
    } catch (error) {
      console.warn("Final OpenAI attempt error:", error);
    }
  }

  // If forcing AI models but all attempts failed, return empty tasks
  if (forceAIModels) {
    console.log("AI services failed but returning empty tasks as AI models are forced");
    return { tasks: [], success: true };
  }

  // If both external services fail multiple times, use our local model as a last resort
  console.log("External AI services unavailable or failed after multiple attempts, using local model");

  // If we had quota issues, add a message to the response
  const localResponse = generateTasksWithLocalModel(
    planType,
    title,
    description,
    objectives,
    totalDays,
    participants
  );

  if (quotaExceeded) {
    console.log("🚨 API QUOTA ISSUES DETECTED - Using local model instead");

    // Add a suggestion about the quota issue
    if (!localResponse.suggestions) {
      localResponse.suggestions = [];
    }

    localResponse.suggestions.push(
      `Note: ${quotaMessage}Using rule-based planning instead. To use AI planning, please check your API keys and quotas.`
    );
  }

  return localResponse;
}

// Enhanced main function to generate AI plan
export async function generatePlan(input: PlanInput): Promise<string> {
  try {
    // Calculate total duration in days
    const totalDays = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Create a new plan document immediately to get an ID
    const planRef = await addDoc(collection(db, 'plans'), {
      groupId: input.groupId,
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      objectives: input.objectives,
      createdBy: input.createdBy,
      createdAt: serverTimestamp(),
      status: 'generating', // Start with a generating status
      planType: input.planType,
      participants: input.participants
    });

    // Update the status to indicate AI plan generation is in progress
    await updateDoc(doc(db, 'plans', planRef.id), {
      status: 'generating_ai'
    });

    // Generate the plan structure
    let aiPlan: AIGeneratedPlan;
    let usedAI = false;

    // Try to use the multi-service AI generation first
    try {
      console.log("Starting enhanced AI plan generation...");
      const aiResponse = await generateAITasksEnhanced(input);

      if (aiResponse.success && aiResponse.tasks.length > 0) {
        // Use AI-generated content
        const tasks: Task[] = aiResponse.tasks.map(aiTask => ({
          title: aiTask.title,
          description: aiTask.description,
          priority: aiTask.priority,
          dueDate: calculateTaskDueDate(input.startDate, input.endDate, totalDays, aiTask.title),
          estimatedHours: aiTask.estimatedHours,
          category: aiTask.category,
          dependencies: aiTask.dependencies
        }));

        // Use AI-generated roles and suggestions if available, otherwise use rule-based generation
        const roles = aiResponse.roles && aiResponse.roles.length > 0
          ? aiResponse.roles
          : generateRolesAndSuggestions(input, totalDays).roles;

        const suggestions = aiResponse.suggestions && aiResponse.suggestions.length > 0
          ? aiResponse.suggestions
          : generateRolesAndSuggestions(input, totalDays).suggestions;

        // Add milestone suggestions if available
        if (aiResponse.milestones && aiResponse.milestones.length > 0) {
          aiResponse.milestones.forEach(milestone => {
            suggestions.push(`Milestone: ${milestone}`);
          });
        }

        aiPlan = {
          tasks,
          roles,
          suggestions,
          milestones: aiResponse.milestones
        };

        usedAI = true;
        console.log("Successfully generated AI plan");
      } else {
        // Fall back to rule-based generation if AI returned no tasks
        console.log("AI generation failed, falling back to rule-based planning");
        aiPlan = generateRuleBasedPlan(input, totalDays);
      }
    } catch (error) {
      console.warn("Error using AI services, falling back to rule-based planning:", error);
      // Fall back to rule-based generation
      aiPlan = generateRuleBasedPlan(input, totalDays);
    }

    // Update the plan in Firestore with generated content
    await updateDoc(doc(db, 'plans', planRef.id), {
      status: 'active',
      suggestions: aiPlan.suggestions,
      roles: aiPlan.roles,
      generatedByAI: usedAI,
      milestones: aiPlan.milestones || []
    });

    // Create tasks in Firestore
    for (const task of aiPlan.tasks) {
      await addDoc(collection(db, 'tasks'), {
        planId: planRef.id,
        groupId: input.groupId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        assignedTo: task.assignedTo || null,
        estimatedHours: task.estimatedHours || null,
        dependencies: task.dependencies || [],
        category: task.category || null,
        status: 'pending',
        createdBy: input.createdBy,
        createdAt: serverTimestamp(),
      });
    }

    return planRef.id;
  } catch (error) {
    console.error('Error generating plan:', error);
    throw error;
  }
}

// Enhanced helper function to calculate a more intelligent due date for a task
function calculateTaskDueDate(startDate: Date, endDate: Date, totalDays: number, taskTitle: string): Date {
  // Create a range of days between start and end
  const startTime = startDate.getTime();
  const rangeInMs = endDate.getTime() - startTime;

  // Set default offsets
  const minOffset = 24 * 60 * 60 * 1000; // At least 1 day after start
  const maxOffset = rangeInMs - minOffset; // At least 1 day before end

  // Position tasks more intelligently based on keywords in the title
  const lowerTitle = taskTitle.toLowerCase();

  // Initial tasks
  if (
    lowerTitle.includes("kickoff") ||
    lowerTitle.includes("initial") ||
    lowerTitle.includes("setup") ||
    lowerTitle.includes("planning") ||
    lowerTitle.includes("define") ||
    lowerTitle.includes("requirements")
  ) {
    // Position in the first 20% of the timeline
    return new Date(startTime + (rangeInMs * 0.1) + (Math.random() * rangeInMs * 0.1));
  }

  // Middle tasks
  if (
    lowerTitle.includes("develop") ||
    lowerTitle.includes("implement") ||
    lowerTitle.includes("create") ||
    lowerTitle.includes("build") ||
    lowerTitle.includes("design") ||
    lowerTitle.includes("prepare")
  ) {
    // Position in the middle 50% of the timeline
    return new Date(startTime + (rangeInMs * 0.25) + (Math.random() * rangeInMs * 0.5));
  }

  // Final tasks
  if (
    lowerTitle.includes("review") ||
    lowerTitle.includes("test") ||
    lowerTitle.includes("final") ||
    lowerTitle.includes("complete") ||
    lowerTitle.includes("evaluate") ||
    lowerTitle.includes("deliver") ||
    lowerTitle.includes("presentation") ||
    lowerTitle.includes("report")
  ) {
    // Position in the last 30% of the timeline
    return new Date(startTime + (rangeInMs * 0.7) + (Math.random() * rangeInMs * 0.25));
  }

  // For tasks without specific positioning keywords, distribute randomly but more evenly
  // Divide the timeline into segments based on total days for better distribution
  const segmentCount = Math.max(5, Math.min(10, Math.floor(totalDays / 3)));
  const segmentSize = rangeInMs / segmentCount;
  const segmentIndex = Math.floor(Math.random() * segmentCount);

  return new Date(startTime + (segmentIndex * segmentSize) + (Math.random() * segmentSize));
}

// Extract the roles and suggestions generation to a separate function
function generateRolesAndSuggestions(input: PlanInput, totalDays: number): { roles: string[], suggestions: string[] } {
  const roles: string[] = [];
  const suggestions: string[] = [];

  // Add plan suggestions based on duration
  if (totalDays < 7) {
    suggestions.push("This is a short timeline. Consider focusing on high-priority objectives only.");
  } else if (totalDays > 30) {
    suggestions.push("Consider breaking this plan into multiple phases for better management.");
  }

  // Add suggestions based on number of participants
  if (input.participants < 3) {
    suggestions.push("With a small team, consider assigning multiple roles to each person.");
  } else if (input.participants > 8) {
    suggestions.push("With a large team, consider creating sub-teams with clear responsibilities.");
  }

  // Add role suggestions based on plan type and objectives
  if (input.planType === 'project') {
    roles.push('Project Manager', 'Team Lead');
    suggestions.push("Assign a dedicated Project Manager to track progress.");

    if (input.objectives.some(obj => obj.toLowerCase().includes('research'))) {
      roles.push('Research Specialist');
    }

    if (input.objectives.some(obj => obj.toLowerCase().includes('design'))) {
      roles.push('Designer');
    }

    if (input.objectives.some(obj => obj.toLowerCase().includes('develop') || obj.toLowerCase().includes('code'))) {
      roles.push('Developer');
    }

    if (input.objectives.some(obj => obj.toLowerCase().includes('test') || obj.toLowerCase().includes('quality'))) {
      roles.push('Quality Assurance');
    }

    if (input.objectives.some(obj => obj.toLowerCase().includes('document'))) {
      roles.push('Technical Writer');
    }
  } else if (input.planType === 'event') {
    roles.push('Event Coordinator', 'Logistics Manager');
    suggestions.push("Create a detailed day-of timeline for your event.");

    if (input.objectives.some(obj => obj.toLowerCase().includes('catering') || obj.toLowerCase().includes('food'))) {
      roles.push('Catering Coordinator');
    }

    if (input.objectives.some(obj => obj.toLowerCase().includes('promotion') || obj.toLowerCase().includes('marketing'))) {
      roles.push('Marketing Specialist');
    }

    if (input.objectives.some(obj => obj.toLowerCase().includes('sponsor'))) {
      roles.push('Sponsorship Manager');
    }

    if (input.objectives.some(obj => obj.toLowerCase().includes('speaker') || obj.toLowerCase().includes('presentation'))) {
      roles.push('Speaker Coordinator');
    }
  } else if (input.planType === 'study') {
    roles.push('Study Lead', 'Note Taker');
    suggestions.push("Schedule regular check-ins to keep everyone on track with their study goals.");

    if (input.objectives.some(obj => obj.toLowerCase().includes('research'))) {
      roles.push('Research Coordinator');
    }

    if (input.objectives.some(obj => obj.toLowerCase().includes('present'))) {
      roles.push('Presentation Coordinator');
    }

    if (input.objectives.some(obj => obj.toLowerCase().includes('review') || obj.toLowerCase().includes('quiz'))) {
      roles.push('Review Session Leader');
    }
  } else {
    // For 'other' plan types
    roles.push('Team Lead', 'Coordinator');
    suggestions.push("Clearly define roles and responsibilities at the start of your plan.");
  }

  return { roles, suggestions };
}

// Rule-based plan generation function
function generateRuleBasedPlan(input: PlanInput, totalDays: number): AIGeneratedPlan {
  const tasks: Task[] = [];
  const { roles, suggestions } = generateRolesAndSuggestions(input, totalDays);

  // Generate tasks based on the plan type
  generateTasksBasedOnPlanType(input, tasks, totalDays);

  // Add generic tasks that apply to all plan types
  generateGenericTasks(input, tasks);

  // Add tasks specifically based on objectives
  generateObjectiveBasedTasks(input, tasks, totalDays);

  return {
    tasks,
    roles,
    suggestions
  };
}

// Generate tasks based on the plan type
function generateTasksBasedOnPlanType(input: PlanInput, tasks: Task[], totalDays: number) {
  // Start with a kickoff task
  tasks.push({
    title: 'Kickoff Meeting',
    description: `Initial meeting to discuss ${input.title} plan and assign responsibilities`,
    dueDate: new Date(input.startDate.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day after start
    priority: 'high',
    estimatedHours: 1,
    category: 'Planning'
  });

  // Add milestone review at the halfway point
  if (totalDays > 10) {
    const halfwayDate = new Date(input.startDate.getTime() + (totalDays / 2) * 24 * 60 * 60 * 1000);
    tasks.push({
      title: 'Milestone Review',
      description: 'Review progress and adjust plan as needed',
      dueDate: halfwayDate,
      priority: 'medium',
      estimatedHours: 1,
      category: 'Review'
    });
  }

  // Add specific tasks based on plan type
  if (input.planType === 'project') {
    // Project-specific tasks
    tasks.push(
      {
        title: 'Requirements Gathering',
        description: 'Collect and document all project requirements',
        dueDate: new Date(input.startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 4,
        category: 'Planning'
      },
      {
        title: 'Create Project Timeline',
        description: 'Develop detailed project schedule with milestones',
        dueDate: new Date(input.startDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 3,
        dependencies: ['Requirements Gathering'],
        category: 'Planning'
      },
      {
        title: 'Resource Allocation',
        description: 'Assign team members to specific project tasks',
        dueDate: new Date(input.startDate.getTime() + 6 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 2,
        dependencies: ['Create Project Timeline'],
        category: 'Planning'
      },
      {
        title: 'Risk Assessment',
        description: 'Identify potential risks and mitigation strategies',
        dueDate: new Date(input.startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 3,
        category: 'Planning'
      },
      {
        title: 'Progress Reporting Setup',
        description: 'Establish regular progress reporting framework',
        dueDate: new Date(input.startDate.getTime() + 4 * 24 * 60 * 60 * 1000),
        priority: 'low',
        estimatedHours: 2,
        category: 'Administration'
      }
    );
  } else if (input.planType === 'event') {
    // Event-specific tasks
    tasks.push(
      {
        title: 'Venue Selection',
        description: 'Research and select venue for the event',
        dueDate: new Date(input.startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 4,
        category: 'Planning'
      },
      {
        title: 'Create Event Budget',
        description: 'Develop detailed budget for all event expenses',
        dueDate: new Date(input.startDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 3,
        category: 'Planning'
      },
      {
        title: 'Vendor Coordination',
        description: 'Contact and book necessary vendors',
        dueDate: new Date(input.startDate.getTime() + (totalDays / 3) * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 5,
        dependencies: ['Create Event Budget'],
        category: 'Logistics'
      },
      {
        title: 'Marketing & Promotion',
        description: 'Create and execute promotional strategy',
        dueDate: new Date(input.startDate.getTime() + (totalDays / 4) * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 6,
        category: 'Marketing'
      },
      {
        title: 'Guest List Management',
        description: 'Create and manage guest/attendee list',
        dueDate: new Date(input.startDate.getTime() + (totalDays / 4) * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 3,
        category: 'Administration'
      },
      {
        title: 'Event Day Schedule',
        description: 'Create detailed minute-by-minute schedule',
        dueDate: new Date(input.endDate.getTime() - 5 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 4,
        category: 'Planning'
      },
      {
        title: 'Final Confirmation',
        description: 'Confirm all details with vendors and participants',
        dueDate: new Date(input.endDate.getTime() - 2 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 2,
        dependencies: ['Vendor Coordination'],
        category: 'Logistics'
      }
    );
  } else if (input.planType === 'study') {
    // Study-specific tasks
    tasks.push(
      {
        title: 'Define Study Goals',
        description: 'Clearly define learning objectives and goals',
        dueDate: new Date(input.startDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 2,
        category: 'Planning'
      },
      {
        title: 'Create Study Schedule',
        description: 'Develop a regular study schedule for all participants',
        dueDate: new Date(input.startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 2,
        dependencies: ['Define Study Goals'],
        category: 'Planning'
      },
      {
        title: 'Gather Study Materials',
        description: 'Collect all necessary resources and materials',
        dueDate: new Date(input.startDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 3,
        dependencies: ['Define Study Goals'],
        category: 'Preparation'
      },
      {
        title: 'Create Study Groups',
        description: 'Organize participants into effective study groups',
        dueDate: new Date(input.startDate.getTime() + 4 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 1,
        category: 'Organization'
      },
      {
        title: 'Develop Practice Tests',
        description: 'Create practice questions and tests',
        dueDate: new Date(input.startDate.getTime() + (totalDays / 2) * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 4,
        category: 'Content Creation'
      },
      {
        title: 'Schedule Review Sessions',
        description: 'Plan regular group review sessions',
        dueDate: new Date(input.startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        priority: 'low',
        estimatedHours: 1,
        category: 'Planning'
      }
    );
  } else {
    // Generic tasks for 'other' plan types
    tasks.push(
      {
        title: 'Set Clear Objectives',
        description: 'Ensure all participants understand the goals',
        dueDate: new Date(input.startDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 2,
        category: 'Planning'
      },
      {
        title: 'Develop Action Plan',
        description: 'Create detailed action steps for each objective',
        dueDate: new Date(input.startDate.getTime() + 4 * 24 * 60 * 60 * 1000),
        priority: 'high',
        estimatedHours: 3,
        category: 'Planning'
      },
      {
        title: 'Assign Responsibilities',
        description: 'Clearly define who is responsible for each task',
        dueDate: new Date(input.startDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 2,
        category: 'Organization'
      },
      {
        title: 'Set Up Communication Plan',
        description: 'Establish how the team will communicate',
        dueDate: new Date(input.startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        estimatedHours: 1,
        category: 'Communication'
      }
    );
  }
}

// Generate tasks based on objectives
function generateObjectiveBasedTasks(input: PlanInput, tasks: Task[], totalDays: number) {
  // Add tasks for each objective
  input.objectives.forEach((objective, index) => {
    // Calculate a due date that spaces objectives throughout the timeline
    const objectiveProgress = (index + 1) / input.objectives.length;
    const daysOffset = Math.floor(totalDays * objectiveProgress * 0.7); // Use 70% of the timeline for objectives

    const dueDate = new Date(
      input.startDate.getTime() +
      daysOffset * 24 * 60 * 60 * 1000
    );

    // For projects, create implementation tasks
    if (input.planType === 'project') {
      tasks.push({
        title: `Implement: ${objective}`,
        description: `Work on implementing "${objective}"`,
        dueDate,
        priority: 'high',
        estimatedHours: 8,
        dependencies: ['Resource Allocation'],
        category: 'Implementation'
      });

      // Add a review task a few days after implementation
      const reviewDate = new Date(dueDate.getTime() + 3 * 24 * 60 * 60 * 1000);
      // Only add if the review date is before the end date
      if (reviewDate < input.endDate) {
        tasks.push({
          title: `Review: ${objective}`,
          description: `Review implementation of "${objective}"`,
          dueDate: reviewDate,
          priority: 'medium',
          estimatedHours: 2,
          dependencies: [`Implement: ${objective}`],
          category: 'Review'
        });
      }
    }
    // For study groups, create study sessions
    else if (input.planType === 'study') {
      tasks.push({
        title: `Study Session: ${objective}`,
        description: `Group study session focusing on "${objective}"`,
        dueDate,
        priority: 'medium',
        estimatedHours: 2,
        dependencies: ['Create Study Schedule', 'Gather Study Materials'],
        category: 'Execution'
      });
    }
    // For events, create planning tasks
    else if (input.planType === 'event') {
      tasks.push({
        title: `Plan: ${objective}`,
        description: `Coordinate and plan "${objective}" aspect of the event`,
        dueDate,
        priority: 'medium',
        estimatedHours: 3,
        dependencies: ['Create Event Budget'],
        category: 'Planning'
      });
    }
    // For other plan types
    else {
      tasks.push({
        title: `Work on: ${objective}`,
        description: `Focus on completing "${objective}"`,
        dueDate,
        priority: 'medium',
        estimatedHours: 4,
        category: 'Execution'
      });
    }
  });
}

// Add generic tasks that apply to all plan types
function generateGenericTasks(input: PlanInput, tasks: Task[]) {
  // Add a final review meeting near the end
  tasks.push({
    title: 'Final Review Meeting',
    description: `Review outcomes of ${input.title} and discuss next steps`,
    dueDate: new Date(input.endDate.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day before end
    priority: 'high',
    estimatedHours: 2,
    category: 'Review'
  });

  // Add documentation task
  tasks.push({
    title: 'Complete Documentation',
    description: 'Finalize all documentation and reports',
    dueDate: input.endDate,
    priority: 'medium',
    estimatedHours: 3,
    category: 'Documentation'
  });

  // Add feedback collection task
  tasks.push({
    title: 'Collect Feedback',
    description: 'Gather feedback from all participants',
    dueDate: new Date(input.endDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days before end
    priority: 'low',
    estimatedHours: 1,
    category: 'Feedback'
  });
}

// Enhanced AI Plan refinement - can be called later to improve an existing plan
export async function enhancePlanWithAI(planId: string) {
  // This would be a function to refine an existing plan using AI suggestions
  // based on plan progress, task completions, etc.
  return true;
}
