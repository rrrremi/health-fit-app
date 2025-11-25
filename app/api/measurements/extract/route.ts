import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { processAndDeduplicateMeasurements } from '@/lib/metric-normalization';
import { getOpenAIClient } from '@/lib/openai-client';

export const dynamic = 'force-dynamic';

const openai = getOpenAIClient()

const EXTRACTION_PROMPT = `
You are a medical data extraction assistant. Analyze this InBody/body composition report image and extract ALL visible measurements including segmental data.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON array (no other text)
2. Extract EVERY measurement you can see - basic metrics, segmental data, water balance, scores, etc.
3. ALL metric keys MUST be in ENGLISH. Use snake_case format. Common metrics:
   - Basic: weight, height, bmi, body_fat_percent, body_fat_mass, skeletal_muscle_mass, lean_body_mass, fat_free_mass
   - Water: total_body_water, intracellular_water, extracellular_water, ecw_ratio
   - Nutrition: protein, mineral, body_cell_mass
   - Fat: visceral_fat_level, waist_hip_ratio, obesity_grade
   - Energy: basal_metabolic_rate, target_caloric_intake, ideal_body_weight
   - Control: fat_control, muscle_control, weight_control
   - Scores: fitness_score, inbody_score
   - Blood: cholesterol_total, cholesterol_hdl, cholesterol_ldl, triglycerides, glucose, hemoglobin, hematocrit
   - Pressure: blood_pressure_systolic, blood_pressure_diastolic, heart_rate
   - Segmental: segmental_lean_mass_right_arm, segmental_lean_mass_left_arm, segmental_lean_mass_trunk, segmental_lean_mass_right_leg, segmental_lean_mass_left_leg
   - For ANY other measurement, create a descriptive snake_case key (e.g., "Vitamin D" → vitamin_d)
4. ALL units MUST be in ENGLISH: kg, %, cm, kcal, level, L, ratio, points, grade, Ω
5. Convert all numbers to use dots (77,1 → 77.1)
6. Include confidence score (0.0-1.0) for each field
7. The image may have labels in Polish, Spanish, or other languages - TRANSLATE metric names to English
8. Look for segmental data in tables/charts (arms, legs, trunk)
9. Preserve original text in raw_text field

TRANSLATION EXAMPLES:
- "Waga" → weight
- "Masa mięśniowa" → skeletal_muscle_mass
- "Tłuszcz trzewny" → visceral_fat_level
- "Woda całkowita" → total_body_water
- "Prawa ręka" / "Right Arm" → segmental_lean_mass_right_arm (for lean mass values)
- "Lewa noga" / "Left Leg" → segmental_lean_mass_left_leg

JSON format (compact, no extra text):
[{"metric":"weight","value":77.1,"unit":"kg","raw_text":"Waga: 77,1 kg","confidence":0.96}]

Extract ALL measurements (JSON array only, no markdown):
`;

interface ExtractionRequest {
  imageUrl: string;
}

interface ExtractedMeasurement {
  metric: string;
  value: number;
  unit: string;
  raw_text?: string;
  confidence?: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: ExtractionRequest = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Fetching image from:', imageUrl);
    }

    // Download image and convert to base64 to avoid OpenAI timeout issues
    let imageBase64: string;
    try {
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageBase64 = buffer.toString('base64');
      
      // Detect image type from URL or default to png
      const imageType = imageUrl.match(/\.(jpg|jpeg|png|webp)$/i)?.[1] || 'png';
      const dataUrl = `data:image/${imageType};base64,${imageBase64}`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Image downloaded successfully: ${buffer.length} bytes, type: ${imageType}`);
      }

      // Call OpenAI GPT-4o-mini Vision API with base64 image (33x cheaper than gpt-4o)
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: EXTRACTION_PROMPT
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      });

      return await processOpenAIResponse(response, user.id, supabase);

    } catch (fetchError: unknown) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching image:', fetchError);
      }
      return NextResponse.json(
        { error: `Failed to download image: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    // Detailed error logging in development only
    const err = error as Error & { code?: string; type?: string };
    if (process.env.NODE_ENV === 'development') {
      console.error('=== MEASUREMENT EXTRACTION ERROR ===');
      console.error('Error type:', err.constructor?.name);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      console.error('====================================');
    }

    return NextResponse.json(
      { 
        error: err.message || 'Failed to extract measurements',
        code: err.code,
        type: err.type
      },
      { status: 500 }
    );
  }
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string | null;
    };
  }>;
}

interface SupabaseClient {
  from: (table: string) => unknown;
}

async function processOpenAIResponse(response: OpenAIResponse, userId: string, supabase: SupabaseClient) {
  try {

    const content = response.choices[0]?.message?.content;
    
    // Log the raw response for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('=== OPENAI RESPONSE ===');
      console.log('Content length:', content?.length);
      console.log('======================');
    }
    
    if (!content) {
      if (process.env.NODE_ENV === 'development') {
        console.error('OpenAI returned no content');
      }
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response (strip markdown code blocks if present)
    let parsedData: ExtractedMeasurement[] | { measurements: ExtractedMeasurement[] };
    try {
      // Remove markdown code blocks (```json ... ```)
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```')) {
        // Remove opening ```json or ```
        cleanContent = cleanContent.replace(/^```(?:json)?\s*\n?/, '');
        // Remove closing ```
        cleanContent = cleanContent.replace(/\n?```\s*$/, '');
      }
      
      parsedData = JSON.parse(cleanContent);
      if (process.env.NODE_ENV === 'development') {
        console.log('Parsed measurements count:', Array.isArray(parsedData) ? parsedData.length : parsedData.measurements?.length);
      }
    } catch (parseError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to parse OpenAI response:', parseError);
      }
      throw new Error('Invalid JSON response from AI');
    }

    // Extract measurements array (handle different response formats)
    let measurements: ExtractedMeasurement[] = [];
    if (Array.isArray(parsedData)) {
      measurements = parsedData;
    } else if (parsedData.measurements && Array.isArray(parsedData.measurements)) {
      measurements = parsedData.measurements;
    } else {
      throw new Error('Unexpected response format from AI');
    }

    // Validate and normalize measurements with deduplication
    const { processed: validatedMeasurements, duplicates, warnings } = await processAndDeduplicateMeasurements(
      userId,
      measurements,
      supabase
    );

    // Log warnings if any (development only)
    if (process.env.NODE_ENV === 'development') {
      if (warnings.length > 0) {
        console.log('Normalization warnings:', warnings);
      }
      if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} potential duplicates`);
      }
    }

    if (validatedMeasurements.length === 0) {
      return NextResponse.json(
        { error: 'No valid measurements found in image' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      measurements: validatedMeasurements,
      count: validatedMeasurements.length,
      duplicates: duplicates.length > 0 ? duplicates : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    });

  } catch (error: unknown) {
    const err = error as Error & { code?: string; type?: string; status?: number };
    if (process.env.NODE_ENV === 'development') {
      console.error('Process OpenAI response error:', err.message);
    }
    
    // Handle specific OpenAI errors
    if (err.code === 'insufficient_quota') {
      return NextResponse.json(
        { 
          error: 'AI service quota exceeded. Please add credits to your OpenAI account.',
          code: 'insufficient_quota'
        },
        { status: 503 }
      );
    }

    if (err.code === 'model_not_found') {
      return NextResponse.json(
        { 
          error: 'GPT-4o model not available. Your API key may not have access to vision models.',
          code: 'model_not_found'
        },
        { status: 403 }
      );
    }

    if (err.code === 'invalid_api_key') {
      return NextResponse.json(
        { 
          error: 'Invalid OpenAI API key. Please check your .env.local file.',
          code: 'invalid_api_key'
        },
        { status: 401 }
      );
    }

    if (err.status === 401) {
      return NextResponse.json(
        { 
          error: 'OpenAI authentication failed. Check your API key.',
          code: 'auth_failed',
          details: err.message
        },
        { status: 401 }
      );
    }

    if (err.status === 429) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please wait a moment and try again.',
          code: 'rate_limit'
        },
        { status: 429 }
      );
    }

    // Return detailed error for debugging
    return NextResponse.json(
      { 
        error: err.message || 'Failed to extract measurements',
        code: err.code || 'unknown_error',
        type: err.type || 'unknown',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
