// src/lib/ai/huggingfaceService.ts
interface HuggingFaceRequest {
    inputs: string;
    parameters?: {
      max_new_tokens?: number;
      temperature?: number;
      top_p?: number;
      do_sample?: boolean;
    };
    options?: {
      wait_for_model?: boolean;
    };
  }
  
  interface AITaskSuggestion {
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimatedHours?: number;
  }
  
  export async function generateAITasks(
    planType: string, 
    objectives: string[], 
    duration: number, 
    participants: number
  ): Promise<AITaskSuggestion[]> {
    // Get API token from environment variable
    const API_TOKEN = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;
    
    if (!API_TOKEN) {
      console.warn("Hugging Face API token not found, using fallback rule-based generation");
      return [];
    }
    
    // Create a prompt for the AI
    const prompt = `
      Generate a list of tasks for a ${planType} plan with the following objectives:
      ${objectives.map(obj => `- ${obj}`).join('\n')}
      
      The plan duration is ${duration} days with ${participants} participants.
      
      For each task, provide:
      1. A title
      2. A brief description
      3. Priority (high, medium, or low)
      4. Estimated hours to complete
      
      Return the results as a JSON array of objects with the format:
      [
        {
          "title": "Task title",
          "description": "Task description",
          "priority": "high/medium/low",
          "estimatedHours": number
        }
      ]
    `;
    
    // Model to use (this is a good free model for text generation)
    const model = "mistralai/Mistral-7B-Instruct-v0.2";
    
    // Prepare the API request
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;
    const requestData: HuggingFaceRequest = {
      inputs: prompt,
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true
      },
      options: {
        wait_for_model: true
      }
    };
    
    try {
      // Make the API call
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        console.error("Error from Hugging Face API:", await response.text());
        return [];
      }
      
      const result = await response.json();
      
      // Extract the generated text from the response
      let generatedText = '';
      if (Array.isArray(result) && result.length > 0) {
        generatedText = result[0].generated_text || '';
      } else {
        generatedText = result.generated_text || '';
      }
      
      // Extract the JSON part from the text
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn("Could not extract JSON from AI response");
        return [];
      }
      
      // Parse the JSON
      const jsonText = jsonMatch[0];
      const tasks = JSON.parse(jsonText) as AITaskSuggestion[];
      
      return tasks;
    } catch (error) {
      console.error("Error calling Hugging Face API:", error);
      return [];
    }
  }