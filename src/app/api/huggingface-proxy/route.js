// src/app/api/huggingface-proxy/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { model, inputs, parameters } = await request.json();
    const HF_TOKEN = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;

    if (!HF_TOKEN) {
      console.error('Hugging Face API token not found in environment variables');
      return NextResponse.json({ 
        error: "API token not configured",
        generated_text: "Error: Hugging Face API token not configured" 
      }, { status: 500 });
    }

    console.log(`API Proxy calling HF model: ${model}`);
    
    // Simplify parameters to minimize errors
    const simplifiedParams = {
      ...parameters,
      max_new_tokens: Math.min(parameters.max_new_tokens || 100, 100), // Cap at 100
      return_full_text: false,
    };

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputs, 
          parameters: simplifiedParams 
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HF API error (${response.status}): ${errorText}`);
        
        // For 4xx errors, return a formatted response that won't break the client
        if (response.status >= 400 && response.status < 500) {
          return NextResponse.json({ 
            generated_text: `Error: ${errorText.substring(0, 100)}...` 
          });
        }
        
        // For other errors, return a formatted response that won't break the client
        return NextResponse.json({ 
          generated_text: "Error calling model API. Please try again."
        });
      }

      const data = await response.json();
      console.log("Successfully received response from Hugging Face");
      
      // Ensure we return in a format the client expects
      if (Array.isArray(data)) {
        return NextResponse.json(data);
      } else if (typeof data === 'object' && data !== null) {
        return NextResponse.json(data);
      } else {
        // If we got a string or other format, wrap it
        return NextResponse.json({ generated_text: String(data) });
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Request to Hugging Face API timed out');
        return NextResponse.json({ 
          generated_text: "Request timed out. Please try again with a simpler prompt."
        });
      }
      
      throw fetchError; // Let the outer catch handle other errors
    }
  } catch (error) {
    console.error('Proxy error:', error);
    // Return a response that won't break the client
    return NextResponse.json({ 
      generated_text: `Error: ${error.message}`
    });
  }
}