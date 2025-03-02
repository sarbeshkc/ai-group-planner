import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { model, messages, temperature, max_tokens, top_p } = await request.json();
    const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not found in environment variables');
      return NextResponse.json({ 
        error: "API key not configured",
        choices: [{ message: { content: "Error: OpenAI API key not configured" } }]
      }, { status: 500 });
    }

    console.log(`API Proxy calling OpenAI model: ${model}`);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          model: model || 'gpt-3.5-turbo',
          messages,
          temperature: temperature || 0.7,
          max_tokens: Math.min(max_tokens || 800, 1000), // Cap at 1000 tokens
          top_p: top_p || 0.95
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API error (${response.status}): ${errorText}`);
        
        // Return a formatted response that won't break the client
        return NextResponse.json({ 
          choices: [{ 
            message: { 
              content: `Error: ${errorText.substring(0, 100)}...` 
            } 
          }]
        });
      }

      const data = await response.json();
      console.log("Successfully received response from OpenAI");
      return NextResponse.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Request to OpenAI API timed out');
        return NextResponse.json({ 
          choices: [{ 
            message: { 
              content: "Request timed out. Please try again with a simpler prompt." 
            } 
          }]
        });
      }
      
      throw fetchError; // Let the outer catch handle other errors
    }
  } catch (error) {
    console.error('Proxy error:', error);
    // Return a response that won't break the client
    return NextResponse.json({ 
      choices: [{ 
        message: { 
          content: `Error: ${error.message}` 
        } 
      }]
    });
  }
} 