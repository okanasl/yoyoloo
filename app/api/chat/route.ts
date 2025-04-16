import { prisma } from '@/lib/prisma';
import { MediaGenerationWorkflowLG } from '@/modules/agent/lg-agent';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages, projectId, falKey, anthropicKey } = await request.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project ID is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const cook = cookies();
    const supabase = createClient(cook);
    const { data } = await supabase.auth.getSession()
    
    if (!data.session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: data.session.user.id }
    });
    
    if (!project) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const workflow = new MediaGenerationWorkflowLG(projectId, falKey, anthropicKey)
    const multiMediaStream = await workflow.stream(messages);


    return new Response(multiMediaStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('[CHAT] Error:', error);

    // Create a manual stream with the error
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(`data: ${JSON.stringify({ 
          type: "text", 
          value: `Error processing chat request: ${error instanceof Error ? error.message : String(error)}` 
        })}\n\n`);
        controller.enqueue(`data: [DONE]\n\n`);
        controller.close();
      }
    });
    
    return new Response(errorStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  }
} 