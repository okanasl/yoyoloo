/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from "zod";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createFalClient, FalClient } from "@fal-ai/client";
import { Message } from "ai";
import { prisma } from "@/lib/prisma";
import { applyPatch, Operation } from 'fast-json-patch'
import { Item } from "../vengin/item/item";
import { StreamEncoder } from "./stream";
import { writeFileSync } from "fs";
import { v4 as uuidv4 } from 'uuid';
import { InputJsonObject } from "@/app/generated/prisma/runtime/library";

type ImageMessage = {
  type: "image",
  image: string;
}

type TextMessage = {
  type: "text",
  text: string;
}

type AppMessage = Message & {
  content: Array<TextMessage | ImageMessage>;
}

// Comprehensive Schemas with More Flexible Parameter Generation
const ImageGenerationSchema = z.object({
  prompt: z.string().describe("Detailed description of the image to generate"),
  style: z.enum(["photorealistic", "cartoon", "artistic", "minimalist"]).optional(),
  image_size: z.enum(["square_hd" , "square" , "portrait_4_3" , "portrait_16_9" , "landscape_4_3" , "landscape_16_9"]).optional(),
});

const VideoGenerationSchema = z.object({
  image_url: z.string().url().describe("URL of the image to use to create the video"),
  prompt: z.string().describe("Detailed description of the video to generate"),
  duration: z.number().min(1).max(10).optional().describe("Duration of the video in seconds max 10"),
});

const SoundEffectToolSchema = z.object({
    text: z.string().describe("Text to be converted to speech."),
  });

const TTSToolSchema = z.object({
  text: z.string().describe("Text to be converted to speech."),
});

const MusicToolSchema = z.object({
  prompt: z.string().describe("Detailed description of music"),
  duration: z.number().describe('Duration of the music')
});

const EditImageSchema = z.object({
  prompt: z.string().describe("Prompt to run"),
  input_image_url: z.string().describe('Image url')
});

const StartEndToVideoSchema = z.object({
  prompt: z.string().describe("Prompt to run"),
  start_image_url: z.string().describe('Start Image url'),
  end_image_url: z.string().describe('End Image url')
});

const ReferenceToVideoSchema = z.object({
  prompt: z.string().describe("Prompt to run"),
  reference_image_urls: z.array(z.string()).describe('Reference image URLS'),
});

// Type for Generation Results
interface MediaGenerationResult {
  id: string;
  url: string;
  type: "image" | "video" | "audio";
  metadata: any;
}

// ReAct Agent Types
type Thought = {
  text: string;
};

type Action = {
  tool: string;
  toolInput: any;
};

type Observation = {
  result: any;
};

type AgentState = {
  thoughts: Thought[];
  actions: Action[];
  observations: Observation[];
  mediaResults: MediaGenerationResult[];
};

// Add a new interface to track iteration history
interface IterationHistory {
  iteration: number;
  thought: string;
  action?: string;
  actionInput?: string;
  observation?: string;
  mediaResults?: MediaGenerationResult[];
}

export class MediaGenerationWorkflowLG {
  private projectId: string;
  private llm: ChatAnthropic;
  private fal: FalClient;

  constructor(projectId: string, fal_key: string, anthropic_key: string) {
    this.projectId = projectId;
    this.llm = new ChatAnthropic({
      model: "claude-3-5-sonnet-20241022",
      apiKey: anthropic_key,
      temperature: 0, // Does high temperature makes it better prompter ?
    });
    this.fal = createFalClient({
      credentials: fal_key
    })
  }

  // Generate unique ID for items
  private generateId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Fetch current project state
  private async getProjectState(): Promise<{ items: Item[] }> {
    const project = await prisma.project.findFirst({
      where: { id: this.projectId }
    });

    if (!project) {
      throw new Error(`Project with ID ${this.projectId} not found`);
    }
    
    // Improved error handling for state parsing
    try {
      // Check if state exists and is a valid string
      if (!project.state) {
        console.log("Empty or invalid state, returning default state");
        return { items: [] };
      }
      return JSON.parse(JSON.stringify(project.state));
    } catch (error) {
      console.error("Error parsing project state:", error);
      // Return default state on parse error instead of throwing
      return { items: [] };
    }
  }

  // Apply patch to project state
  private async applyProjectPatch(operations: Operation[]): Promise<string | unknown> {
    try {
      // Validate operations
      if (!operations || !Array.isArray(operations) || operations.length === 0) {
        console.error("Invalid patch operations:", operations);
        return { error: "Invalid patch operations" };
      }

      const project = await prisma.project.findFirst({
        where: { id: this.projectId }
      });

      if (!project) {
        throw new Error(`Project with ID ${this.projectId} not found`);
      }

      // Initialize with empty items array if state is null
      const currentState = project.state ? JSON.parse(JSON.stringify(project.state)) : { items: [] };
      
      // Apply the patch
      const patchedState = applyPatch(currentState, operations).newDocument;
      console.log({patchedState})
      const updated = await prisma.project.update({
        where: { id: this.projectId },
        data: { state: patchedState }
      });
      console.log({w: JSON.stringify(updated.state)})
      // Update ids
      if (updated.state) {
        const withIds = (updated.state as {items: Array<Item>}).items.map((item) => {
            return {
              ...item,
              id: uuidv4()
            }
        })
        const withIdsState = { items: withIds }
        await prisma.project.update({
          where: { id: this.projectId },
          data: { state: withIdsState as InputJsonObject }
        });
      }
      console.log('Applied patch operations:', updated.state);
      return JSON.stringify(updated.state);
    } catch (error) {
      console.error("Error applying patch to project:", error);
      return { error: String(error) };
    }
  }

  // Image Generation Tool
  private async generateImage(params: z.infer<typeof ImageGenerationSchema>): Promise<MediaGenerationResult> {
    try {
      console.log({
        prompt: params.prompt,
        num_images: 1,
        image_size: params.image_size || "landscape_16_9"
      });
      
      const result = await this.fal.run("fal-ai/minimax-image", {
        input: {
          prompt: params.prompt,
          num_images: 1,
        }
      });

      const itemId = this.generateId();

      return {
        id: itemId,
        url: result.data.images[0].url,
        type: "image",
        metadata: params
      };
    } catch (error) {
      console.error("Image generation error:", error);
      throw error;
    }
  }

  // Video Generation Tool
  private async generateVideoFromImage(params: z.infer<typeof VideoGenerationSchema>): Promise<MediaGenerationResult> {
    try {
      const videoParams = {
        image_url: params.image_url,
        prompt: params.prompt,
        duration: Math.max(params.duration ?? 5, 5).toString(),
      };
      console.log({videoParams});

      const result = await this.fal.run("fal-ai/kling-video/v2/master/image-to-video", {
        input: videoParams
      });

      const itemId = this.generateId();

      return {
        id: itemId,
        url: result.data.video.url,
        type: "video",
        metadata: params
      };
    } catch (error) {
      console.error("Video generation error:", error);
      throw error;
    }
  }

  // Text-to-Speech Tool
  private async generateTTS(params: z.infer<typeof TTSToolSchema>): Promise<MediaGenerationResult> {
    try {
      console.log({params});
      const audioResult = await this.fal.run("fal-ai/orpheus-tts", {
        input: {
          text: params.text,
        }
      });

      const itemId = this.generateId();

      return {
        id: itemId,
        url: audioResult.data.audio.url,
        type: "audio",
        metadata: params
      };
    } catch (error) {
      console.error("Audio generation error:", error);
      throw error;
    }
  }

  // Text-to-Speech Tool
  private async generateSoundEffect(params: z.infer<typeof SoundEffectToolSchema>): Promise<MediaGenerationResult> {
    try {
      console.log({params});
      const audioResult = await this.fal.run("fal-ai/elevenlabs/sound-effects", {
        input: {
          text: params.text,
        }
      });

      const itemId = this.generateId();

      return {
        id: itemId,
        url: audioResult.data.audio.url,
        type: "audio",
        metadata: params
      };
    } catch (error) {
      console.error("Audio generation error:", error);
      throw error;
    }
  }

  // Text-to-Speech Tool
  private async generateMusic(params: z.infer<typeof MusicToolSchema>): Promise<MediaGenerationResult> {
    try {
      const musicResult = await this.fal.run("CassetteAI/music-generator", {
        input: {
          prompt: params.prompt,
          duration: params.duration,
        }
      });
      const itemId = this.generateId();

      return {
        id: itemId,
        url: musicResult.data.audio_file.url,
        type: "audio",
        metadata: params
      };
    } catch (error) {
      console.error("Audio generation error:", error);
      console.log(JSON.stringify(error, null, 2))
      throw error;
    }
  }

  private async editImage(params: z.infer<typeof EditImageSchema>): Promise<MediaGenerationResult> {
    try {
      console.log({params});
      const imageResult = await this.fal.run("fal-ai/gemini-flash-edit/multi", {
        input: {
          prompt: params.prompt,
          image_input_urls: [params.input_image_url]
        }
      });
      console.log({imageResult})
      const itemId = this.generateId();

      return {
        id: itemId,
        url: imageResult.data.image.url,
        type: "image",
        metadata: params
      };
    } catch (error) {
      console.error("Image edit error:", error);
      console.log(JSON.stringify(error, null, 2))
      throw error;
    }
  }

  private async startEndToVideo(params: z.infer<typeof StartEndToVideoSchema>): Promise<MediaGenerationResult> {
    try {
      console.log({params});
      const videoResult = await this.fal.run("fal-ai/vidu/start-end-to-video", {
        input: params
      });
      console.log({videoResult})
      const itemId = this.generateId();

      return {
        id: itemId,
        url: videoResult.data.video.url,
        type: "video",
        metadata: params
      };
    } catch (error) {
      console.error("Image edit error:", error);
      console.log(JSON.stringify(error, null, 2))
      throw error;
    }
  }

  private async referenceToVideo(params: z.infer<typeof ReferenceToVideoSchema>): Promise<MediaGenerationResult> {
    try {
      console.log({params});
      const imageResult = await this.fal .run("fal-ai/vidu/reference-to-video", {
        input: params
      });
      console.log({imageResult})
      const itemId = this.generateId();

      return {
        id: itemId,
        url: imageResult.data.video.url,
        type: "video",
        metadata: params
      };
    } catch (error) {
      console.error("referenceToVideo error:", error);
      console.log(JSON.stringify(error, null, 2))
      throw error;
    }
  }

  // Stream method for real-time updates
  public stream = async (messages: AppMessage[]): Promise<ReadableStream> => {
    const encoder = new StreamEncoder();
    const textEncoder = new TextEncoder();
    const self = this;
    
    return new ReadableStream({
      async start(controller) {
        let controllerClosed = false;
        
        // Initialize history array
        const iterationHistory: IterationHistory[] = [];
        
        // Helper function to safely enqueue data
        const safeEnqueue = (data: unknown) => {
          if (!controllerClosed) {
            try {
              controller.enqueue(data);
            } catch (e) {
              console.error("Error enqueueing data:", e);
            }
          }
        };
        
        // Helper function to safely close the controller
        const safeClose = () => {

          if (!controllerClosed) {
            try {
              controller.close();
              controllerClosed = true;
            } catch (e) {
              console.error("Error closing controller:", e);
            }
          }
        };
        
        try {
          // Send initial message
          safeEnqueue(encoder.encodeChunk(
            { type: 'text-delta', text_delta: 'Processing your request...\n' }
          ));

          const last_message = messages[messages.length - 1];
          const user_msg_content = last_message?.content as (TextMessage | ImageMessage)[] 
          const userInput = user_msg_content.find(f => f.type === "text")?.text;
          
          // System message for the ReAct agent
          const systemMessage = `
You are an AI assistant that helps manage media in a creative project.
You are a react agent (ReAct agent) that uses tools to generate media. Current iteration info: {{iterations}}.
The project uses timeline state to render it on 1024x576 canvas with timeline on UI.
The total canvas timeline lenght should be 8 seconds unless it is stated othervise.
You are Leigh Powis. The best ad director. Also you are the BEST media prompt engineer. You do not miss any details.
Below is typing of the canvas timeline state
{
   items: [
     {
       id: string, // unique id of the item
       name: string, // name of the item
       zIndex: number, // the zIndex of media in timeline - decides which item shows on top at canvas.
       type: "IMAGE" | "VIDEO" | "AUDIO", // type of the item
       data: string, // url of the media or content for the text
       start_timestamp: number, // in milliseconds
       end_timestamp: number, // in milliseconds
       x?: number, // in pixels
       y?: number, // in pixels
       width?: number, // in pixels
       height?: number, // in pixels
       // Additional properties depend on the item type
     }
     ...
   ]
 }

Feel free to generate multiple videos for different scenes.
MAKE SURE THE GENERATED VIDEOS HAS THE SAME resolutions as canvas size.
ALSO, DO NOT USE SAME IMAGE TO GENERATE MULTIPLE VIDEOS. BE CREATIVE when reasoing and prompting AS POSSIBLE for better results.
You can also create multiple videos/images but make sure it covers canvas at all timelines.
You do not need to add images to canvas timeline since this will generate tracks only.
Although you can generate small logos, text etc. if user request.
NEVER USE AN URL THAT IS NOT GENERATED BY YOU.

You will use a ReAct (Reasoning and Acting) approach to solve the user's request.

Current canvas timeline state:
{{stateDescription}}

Here is the history of previous iterations and their results:
{{historyDescription}}

IMPORTANT: You must use the provided tools to generate media. DO NOT create fake URLs or placeholders.
Each tool will return real media URLs that you can use in subsequent steps.
You can also use the patch_state tool to update the canvas timeline state.
But make sure to use it when needed. 
ALWAYS MAKE SURE TO USE IT ON LAST ITERATION TO UPDATE STATE AND PLAN ACCORDINGLY.

The aim is populating the canvas timeline at the end. Make sure to use patch_state tool action to apply changes.
Try as much as hard to create consistent characters and environment.

## Available Tools

1. generate_image
Description: Generates an image based on a text prompt
Parameters:
- prompt (required): Detailed description of the image to generate
- style (optional): One of ["photorealistic", "cartoon", "artistic", "minimalist"]
- image_size (optional): One of ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"]
Example: {"prompt": "Extreme close-up of a single tiger eye, direct frontal view. Detailed iris and pupil. Sharp focus on eye texture and color. Natural lighting to capture authentic eye shine and depth. The word "EXAMPLE" is painted over it in big, white brush strokes with visible texture.", "style": "photorealistic", "image_size": "landscape_16_9"}

3. generate_text_to_speech
Description: Converts text to speech. Use for text to speech audio generation. Can only be used for single speaker also.
Parameters:
- text (required): Text to be converted to speech.
Example: {"text": "I just found a hidden treasure in the backyard! <gasp> Check it out!"}

4. generate_music
Description: Generates music from prompt. Use for music, sound etc. generation.
Parameters:
- prompt (required): Detailed description of the music.
- duration (required): Duration (Min 10, Max 30)
Example: {"text": "Smooth chill hip-hop beat with mellow piano melodies, deep bass, and soft drums, perfect for a night drive. Key: D Minor, Tempo: 90 BPM."}

5. generate_sound_effect
Description: Generates music from prompt. Use for music, sound etc. generation.
Parameters:
- text (required): Dailed description of the sound effect.
Example: {"text": "Spacious braam suitable for high-impact movie trailer moments"}

6. edit_image
Description: Gemini Flash Edit Multi Image is a model that can edit multiple images using a text prompt and a reference image. Useful to have character consistency between scenes.
Parameters:
- prompt (required): The changes required for the image
- input_image_url (required): The url of the image that needs changing.

7. start_end_to_video
Description: Vidu Start-End to Video generates smooth transition videos between specified start and end images.
Parameters:
- prompt (required): Prompt for the transition
- start_image_url (required): Start image url
- end_image_url (required): End image url
Example:
{
    prompt: "Transform the car frame into a complete vehicle.",
    start_image_url: "https://fal.ai/vidu/2-carchasis.png",
    end_image_url: "https://fal.ai/vidu/2-carbody.png"
}

8. reference-to-video
Description: Creates videos by using a reference images and combining them with a prompt.
Parameters:
- prompt (required): Prompt for the transition
- reference_image_urls (required): Reference images to be used in the video.
Example:
{
    prompt: "The little devil is looking at the apple on the beach and walking around it.",
    reference_image_urls: ["https://storage.googleapis.com/falserverless/web-examples/vidu/new-examples/reference1.png", "https://storage.googleapis.com/falserverless/web-examples/vidu/new-examples/reference2.png", "https://storage.googleapis.com/falserverless/web-examples/vidu/new-examples/reference3.png"]
}

9. patch_state
Description: Patches canvas timeline state with RFC 6902 JSON patch standard. NEED STRICT REQUIREMENT TO HAVE JSON FORMAT. OTHERWISE IT WILL FAIL.
Parameters:
- operations (required): Array of JSON patch operations.
Example:
[
  { "op": "remove", "path": "/a/b/c" },
  { "op": "add", "path": "/items/-", "value": [ "foo", "bar" ] },
  { "op": "replace", "path": "/a/b/c", "value": 42 },
]

ALWAYS AND ALWAYS USE CORRECT JSON FORMAT. OTHERWISE IT WILL FAIL. MAKE SURE TO HAVE DOUBLE QUOTES FOR ALL KEYS AND VALUES.
For each step:
1. Analyze current canvas timeline state
2. Think about what needs to be done
3. Choose a tool to use
4. Provide the necessary parameters
5. Decide on the next step
...

## Additional Rules
- The answer MUST contain a sequence of bullet points that explain how you arrived at the answer. This can include aspects of the previous conversation history.
- You MUST obey the function signature of each tool. Do NOT pass in no arguments if the function expects arguments.

## Output Format
To answer the question, please use the following format.
"""
Thought: I need to use a tool to help me.
Action: tool name (one of generate_image, generate_video, generate_text_to_speech) if using a tool.
Action Input: the input to the tool, in a JSON format representing the kwargs (e.g. {"prompt": "hello world", "style": "photorealistic"})
"""

Please ALWAYS start with a Thought. And never include multiple Thoughts at once.
On your first Thought, create a plan for the next iterations.

Please use a valid JSON format for the Action Input with double quotes for both keys and values.

If this format is used, the user will respond in the following format:

""""
Observation: tool response
""""

You should keep repeating the above format until you have enough information
to answer the question without using any more tools. At that point, you MUST respond
in the one of the following two formats:

""""
Thought: I can answer without using any more tools.
Answer: [your answer here]
""""

""""
Thought: I cannot answer the question with the provided tools.
Answer: Sorry, I cannot answer your query.
""""
When you've completed the task:
""""
Thought: I've completed all necessary actions.
Final Answer: <summary of what you've done>
""""


YOU SHOULD NEVER INCLUDE both Final Answer with Action and Action Input.
YOU SHOULD ALWAYS use patch_state action before final iteration.

you don't need to complete all iterations. If the job is done, provide Final Answer but not with patch_state tool.
you MUST include as much detail as possibe when prompting.
You MUST use "patch_state" tool before the last iteration or when you want to stop.
NEVER include multiple Thought: in response. There can only be one Though, Answer, Action, Action Input in response.
        `;
        const maxIterations = 12;
        let iterations = 0;

        const getSysMessage = async () => {
            const projectState = await self.getProjectState();
            
            // Format the current state for the system message
            const stateDescription = JSON.stringify(projectState);
            
            // Format the iteration history for the system message
            const historyDescription = JSON.stringify(iterationHistory);
            
            return systemMessage
              .replace("{{stateDescription}}", stateDescription)
              .replace("{{iterations}}", `${iterations.toString()} of ${maxIterations.toString()}`)
              .replace("{{historyDescription}}", historyDescription);
            }
          // Initial prompt to the agent
          let prompt = `User request: ${userInput}`;
          
          // Maximum number of iterations to prevent infinite loops
          const mediaResults: MediaGenerationResult[] = [];
          
          while (iterations < maxIterations) {
            iterations++;
            const currSysMessage = await getSysMessage();
    
            const response = await self.llm.invoke([
              new SystemMessage(currSysMessage),
              new HumanMessage(prompt)
            ]);
            
            const responseText = response.content.toString();
      
            writeFileSync(`response_${Date.now()}.txt`, responseText);
      
            let thought, action, actionInput, finalAnswer;
            
            try {
              // Check if this is a final answer
              if (responseText.includes("Final Answer:")) {
                const finalAnswerMatch = responseText.match(/Final Answer:\s*(.+?)$/s);
                finalAnswer = finalAnswerMatch ? finalAnswerMatch[1].trim() : null;
                thought = responseText.match(/Thought:\s*(.+?)(?=\n\s*Final Answer:)/s)?.[1].trim();
              } else {
                // Extract tool use information
                [thought, action, actionInput] = extractToolUse(responseText);
              }
            } catch (error) {
              console.error("Error parsing response:", error);
              thought = "Error parsing response";
              action = null;
              actionInput = null;
            }
            
            console.log({thought, action, actionInput})
            
            // Create a new history entry for this iteration
            const historyEntry: IterationHistory = {
              iteration: iterations,
              thought: thought || "No thought provided"
            };
            
            // Stream the thought
            if (thought) {
              safeEnqueue(encoder.encodeChunk({ 
                type: 'text-delta', 
                text_delta: `🤔 ${thought}\n\n` 
              }));
            }
            
            // Check if we've reached a final answer
            if (finalAnswer) {
              safeEnqueue(encoder.encodeChunk({ 
                type: 'text-delta', 
                text_delta: `✅ ${finalAnswer}\n\n` 
              }));
              
              // Add final answer to history
              historyEntry.observation = `Final Answer: ${finalAnswer}`;
              iterationHistory.push(historyEntry);
              break;
            }
            
            if (!action || !actionInput) {
              // Invalid response format
              safeEnqueue(encoder.encodeChunk({ 
                type: 'text-delta', 
                text_delta: `❌ Error: Invalid response format\n\n` 
              }));
              prompt += "\nObservation: Error: Invalid response format. Please provide a valid Thought, Action, and Action Input.";
              
              // Add error to history
              historyEntry.observation = "Error: Invalid response format";
              iterationHistory.push(historyEntry);
              continue;
            }
            
            // Add action and actionInput to history entry
            historyEntry.action = action;
            historyEntry.actionInput = actionInput;
            
            let parsedActionInput;
            try {
              parsedActionInput = actionInputParser(actionInput);
            } catch (error) {
              console.error("JSON parse error:", error, "Input was:", actionInput);
              prompt += "\nObservation: Error: Invalid JSON in Action Input. Please provide valid JSON.";
              continue;
            }
            console.log({parsedActionInput})
            // Stream the action
            safeEnqueue(encoder.encodeChunk({ 
              type: 'text-delta', 
              text_delta: `🛠️ Action: ${action}\n` 
            }));
            
            // Execute the action
            let observation;
            const iterationMediaResults: MediaGenerationResult[] = [];
            
            try {
              switch (action) {
                case "generate_image":
                  safeEnqueue(encoder.encodeChunk({ 
                    type: 'text-delta', 
                    text_delta: `Generating image: "${parsedActionInput.prompt}"\n` 
                  }));
                  
                  const toolCallId = `image_gen_${iterations}`;
                  safeEnqueue(encoder.encodeChunk({ 
                    type: 'tool-call-begin',
                    tool_call_id: toolCallId,
                    tool_name: 'image_generation'
                  }));
                  
                  const imageResult = await self.generateImage(parsedActionInput);
                  mediaResults.push(imageResult);
                  iterationMediaResults.push(imageResult);
                  
                  safeEnqueue(encoder.encodeChunk({ 
                    type: 'tool-result', 
                    tool_call_id: toolCallId,
                    result: imageResult.url
                  }));
                  
                  observation = `Generated image: ${imageResult.url}`;
                  break;
                  
                case "generate_video":
                  safeEnqueue(encoder.encodeChunk({ 
                    type: 'text-delta', 
                    text_delta: `Generating video: "${parsedActionInput.prompt}"\n` 
                  }));
                  
                  const videoToolCallId = `video_gen_${iterations}`;
                  safeEnqueue(encoder.encodeChunk({ 
                    type: 'tool-call-begin',
                    tool_call_id: videoToolCallId,
                    tool_name: 'video_generation'
                  }));
                  
                  const videoResult = await self.generateVideoFromImage(parsedActionInput);
                  mediaResults.push(videoResult);
                  iterationMediaResults.push(videoResult);
                  
                  safeEnqueue(encoder.encodeChunk({
                    type: 'tool-result',
                    tool_call_id: videoToolCallId,
                    result: videoResult.url
                  }));
                  
                  observation += `Generated video: ${videoResult.url}`;
                    break;
                    
                  case "generate_text_to_speech":
                    safeEnqueue(encoder.encodeChunk({ 
                      type: 'text-delta', 
                      text_delta: `Generating TTS: "${parsedActionInput.text}"\n` 
                    }));
                    
                    const audioToolCallId = `tts_gen${iterations}`;
                    safeEnqueue(encoder.encodeChunk({ 
                      type: 'tool-call-begin',
                      tool_call_id: audioToolCallId,
                      tool_name: 'generate_text_to_speech'
                    }));
                    
                    const audioResult = await self.generateTTS(parsedActionInput);
                    mediaResults.push(audioResult);
                    iterationMediaResults.push(audioResult);
                    
                    safeEnqueue(encoder.encodeChunk({ 
                      type: 'tool-result', 
                      tool_call_id: audioToolCallId,
                      result: audioResult.url
                    }));
                    
                    observation = `Generated TTS: ${audioResult.url}`;
                    break;
                    
                case "generate_music":
                      safeEnqueue(encoder.encodeChunk({ 
                        type: 'text-delta', 
                        text_delta: `Generating Music: "${parsedActionInput.prompt}"\n` 
                      }));
                      
                      const musicToolCallId = `music_gen${iterations}`;
                      safeEnqueue(encoder.encodeChunk({ 
                        type: 'tool-call-begin',
                        tool_call_id: musicToolCallId,
                        tool_name: 'generate_music'
                      }));
                      
                      const musicResult = await self.generateMusic(parsedActionInput);
                      mediaResults.push(musicResult);
                      iterationMediaResults.push(musicResult);
                      
                      safeEnqueue(encoder.encodeChunk({ 
                        type: 'tool-result', 
                        tool_call_id: musicToolCallId,
                        result: musicResult.url
                      }));
                      
                      observation = `Generated Music: ${musicResult.url}`;
                      break;
                    
                    case "generate_sound_effect":
                        safeEnqueue(encoder.encodeChunk({ 
                            type: 'text-delta', 
                            text_delta: `Generating sound effect: "${parsedActionInput.prompt}"\n` 
                        }));
                        
                        const soundEffectToolCallId = `sound_effect_gen${iterations}`;
                        safeEnqueue(encoder.encodeChunk({ 
                            type: 'tool-call-begin',
                            tool_call_id: soundEffectToolCallId,
                            tool_name: 'generate_sound_effect'
                        }));
                        
                        const soundEffectResult = await self.generateSoundEffect(parsedActionInput);
                        mediaResults.push(soundEffectResult);
                        iterationMediaResults.push(soundEffectResult);
                        
                        safeEnqueue(encoder.encodeChunk({ 
                            type: 'tool-result', 
                            tool_call_id: soundEffectToolCallId,
                            result: soundEffectResult.url
                        }));
                        
                        observation = `Generated Sound Effect: ${soundEffectResult.url}`;
                        break;
                    
                    case "edit_image":
                        safeEnqueue(encoder.encodeChunk({ 
                            type: 'text-delta', 
                            text_delta: `Editing image with prompt: "${parsedActionInput.prompt ? 
                            (parsedActionInput.prompt.length > 50 ? 
                                parsedActionInput.prompt.substring(0, 50) + '...' : 
                                parsedActionInput.prompt) : 
                            'No prompt provided'}"\n` 
                        }));
                        
                        const editImageToolCallId = `edit_image_call_${iterations}`;
                        safeEnqueue(encoder.encodeChunk({ 
                            type: 'tool-call-begin',
                            tool_call_id: editImageToolCallId,
                            tool_name: 'generate_sound_effect'
                        }));
                        
                        const editImageResult = await self.editImage(parsedActionInput);
                        mediaResults.push(editImageResult);
                        iterationMediaResults.push(editImageResult);
                        
                        safeEnqueue(encoder.encodeChunk({ 
                            type: 'tool-result', 
                            tool_call_id: editImageToolCallId,
                            result: editImageResult.url
                        }));
                        
                        observation = `Output of edit image: ${editImageResult.url}`;
                        break;
                    
                    case "start_end_to_video":
                        safeEnqueue(encoder.encodeChunk({ 
                            type: 'text-delta', 
                            text_delta: `Start to end video with prompt: "${parsedActionInput.prompt}"\n` 
                        }));
                        
                        const startToEndVideoToolCallId = `start_end_to_video_call_${iterations}`;
                        safeEnqueue(encoder.encodeChunk({ 
                            type: 'tool-call-begin',
                            tool_call_id: startToEndVideoToolCallId,
                            tool_name: 'start_end_to_video'
                        }));
                        
                        const startToEndVideoResult = await self.startEndToVideo(parsedActionInput);
                        mediaResults.push(startToEndVideoResult);
                        iterationMediaResults.push(startToEndVideoResult);
                        
                        safeEnqueue(encoder.encodeChunk({ 
                            type: 'tool-result', 
                            tool_call_id: startToEndVideoToolCallId,
                            result: startToEndVideoResult.url
                        }));
                        
                        observation = `Output of start to end video: ${startToEndVideoResult.url}`;
                        break;
                    
                    
                    case "reference-to-video":
                        safeEnqueue(encoder.encodeChunk({ 
                            type: 'text-delta', 
                            text_delta: `Reference to video with prompt: "${parsedActionInput.prompt}"\n` 
                        }));
                        
                        const referenceToVideoToolCallId = `reference-to-video_call_${iterations}`;
                        safeEnqueue(encoder.encodeChunk({ 
                            type: 'tool-call-begin',
                            tool_call_id: referenceToVideoToolCallId,
                            tool_name: 'reference-to-video'
                        }));
                        
                        const referenceToVideoResult = await self.referenceToVideo(parsedActionInput);
                        mediaResults.push(referenceToVideoResult);
                        iterationMediaResults.push(referenceToVideoResult);
                        
                        safeEnqueue(encoder.encodeChunk({ 
                            type: 'tool-result',
                            tool_call_id: referenceToVideoToolCallId,
                            result: referenceToVideoResult.url
                        }));
                        
                        observation = `Output of reference to video: ${referenceToVideoResult.url}`;
                        break;

                case "patch_state":
                case "patch_state_json":
                case "patch_state_diff":
                  safeEnqueue(encoder.encodeChunk({ 
                    type: 'text-delta', 
                    text_delta: `Applying patch to project state...\n` 
                  }));
                  
                  try {
                    // Extract the operations from the input
                    await self.applyProjectPatch(parsedActionInput.operations);
                    
                    observation = `State patched successfully.`;
                  } catch (error) {
                    console.error("Error applying patch:", error);
                    observation = `Error applying patch: ${error instanceof Error ? error.message : String(error)}`;
                  }
                  break;
                  
                default:
                  observation = `Error: Unknown action "${action}"`;
                  break;
              }
              
              // Add observation and media results to history entry
              historyEntry.observation = observation;
              historyEntry.mediaResults = iterationMediaResults.length > 0 ? iterationMediaResults : undefined;
              
              // Add the history entry to the history array
              iterationHistory.push(historyEntry);
              
              // Add the observation to the prompt
              prompt += `\nObservation: ${observation}\n\nThought:`;
              
            } catch (error) {
              console.error(`Error executing action ${action}:`, error);
              const errorMessage = error instanceof Error ? error.message : String(error);
              
              safeEnqueue(encoder.encodeChunk({ 
                type: 'text-delta', 
                text_delta: `❌ Error: ${errorMessage}\n\n` 
              }));
              
              // Add error to history entry
              historyEntry.observation = `Error: ${errorMessage}`;
              iterationHistory.push(historyEntry);
              
              prompt += `\nObservation: Error: ${errorMessage}\n\nThought:`;
            }
          }
          
          // Send summary of what was accomplished
          if (mediaResults.length > 0) {
            const summary = `\n🎉 Created ${mediaResults.length} media items:\n` + 
              mediaResults.map(r => `- ${r.type.charAt(0).toUpperCase() + r.type.slice(1)}: ${r.url}`).join('\n');
            
            safeEnqueue(encoder.encodeChunk({
              type: 'text-delta',
              text_delta: summary
            }));
          } else {
            safeEnqueue(encoder.encodeChunk({
              type: 'text-delta',
              text_delta: '\n❗ No media items were created.'
            }));
          }
          
          safeEnqueue(textEncoder.encode(encoder.encodeChunk({
            type: 'data',
            data: '[DONE]\n\n'
          })));
          safeClose();
        } catch (error) {
          console.error('Stream error:', error);
          
          if (!controllerClosed) {
            safeEnqueue(encoder.encodeChunk({ 
              type: 'error', 
              error: `Error: ${error instanceof Error ? error.message : String(error)}` 
            }));
            safeEnqueue(textEncoder.encode(encoder.encodeChunk({
              type: 'data',
              data: '[DONE]\n\n'
            })));
            safeClose();
          }
        }
      }
    });
  };
}

function extractToolUse(responseText: string): [thought: string | null, action: string | null, actionInput: string | null] {
  // Log response for debugging
  // writeFileSync(`extract_input_${Date.now()}.txt`, responseText);

  let thought: string | null = null;
  let action: string | null = null;
  let actionInput: string | null = null;

  // Extract Thought (allow multiline)
  const thoughtMatch = responseText.match(/^Thought:\s*([\s\S]*?)(?=\nAction:|\nFinal Answer:|$)/);
  thought = thoughtMatch ? thoughtMatch[1].trim() : null;

  // Check for Final Answer first
  if (responseText.includes("Final Answer:")) {
      return [thought, null, null]; // No action/input if it's a final answer
  }

  // Extract Action
  const actionMatch = responseText.match(/\nAction:\s*([\w-]+)/); // Allow hyphens
  action = actionMatch ? actionMatch[1].trim() : null;

  // Extract Action Input (find the JSON block)
  const actionInputMatch = responseText.match(/\nAction Input:\s*(\{[\s\S]*\})/);
   if (actionInputMatch && actionInputMatch[1]) {
      actionInput = actionInputMatch[1].trim();
      // Basic validation: Check if it starts with { and ends with }
      if (!actionInput.startsWith('{') || !actionInput.endsWith('}')) {
          console.warn("Extracted Action Input doesn't seem like a valid JSON object:", actionInput);
          // Optionally try to recover or return null
          actionInput = null; // Or attempt recovery
      }
  }


  if (!thought && !action && !responseText.includes("Final Answer:")) {
      console.warn("Could not extract Thought or Action from response:", responseText.substring(0, 200));
      // Return thought as error if nothing else found
      return ["Error: Could not parse response structure.", null, null];
  }
   if (action && !actionInput) {
      console.warn(`Action '${action}' found, but Action Input JSON is missing or invalid.`);
      // Decide: return null for input, or try a default? Returning null is safer.
       return [thought, action, null]; // Return action but null input
  }


  return [thought, action, actionInput];
}

function actionInputParser(jsonStr: string): any {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Initial JSON parse error:", e, "Input was:", jsonStr);
    
    try {
      // Handle common JSON formatting issues
      const processedString = jsonStr
        .replace(/'/g, '"')  // Replace single quotes with double quotes
        .replace(/(\w+):/g, '"$1":');  // Add quotes to keys
      
      return JSON.parse(processedString);
    } catch (e2) {
      // Don't return empty operations - throw error to force model to fix format
      throw new Error("Invalid JSON format for action input");
    }
  }
}