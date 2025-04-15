export type StreamChunkType = 
  | 'text-delta'
  | 'tool-call-begin'
  | 'tool-call-delta'
  | 'tool-result'
  | 'data'
  | 'error';

export interface BaseStreamChunk {
  type: StreamChunkType;
}

export interface TextDeltaChunk extends BaseStreamChunk {
  type: 'text-delta';
  text_delta: string;
}

export interface ToolCallBeginChunk extends BaseStreamChunk {
  type: 'tool-call-begin';
  tool_call_id: string;
  tool_name: string;
}

export interface ToolCallDeltaChunk extends BaseStreamChunk {
  type: 'tool-call-delta';
  tool_call_id: string;
  args_text_delta: string;
}

export interface ToolResultChunk extends BaseStreamChunk {
  type: 'tool-result';
  tool_call_id: string;
  result: any;
}

export interface DataChunk extends BaseStreamChunk {
  type: 'data';
  data: any;
}

export interface ErrorChunk extends BaseStreamChunk {
  type: 'error';
  error: string;
}

export type StreamChunk = 
  | TextDeltaChunk
  | ToolCallBeginChunk
  | ToolCallDeltaChunk
  | ToolResultChunk
  | DataChunk
  | ErrorChunk;

export class StreamEncoder {
  encodeChunk(chunk: StreamChunk): string {
    console.log('chunk', chunk);
    switch (chunk.type) {
      case 'text-delta':
        return `0:${JSON.stringify(chunk.text_delta)}\n`;
      case 'tool-call-begin':
        return `b:${JSON.stringify({ 
          toolCallId: chunk.tool_call_id, 
          toolName: chunk.tool_name 
        })}\n`;
      case 'tool-call-delta':
        return `c:${JSON.stringify({ 
          toolCallId: chunk.tool_call_id, 
          argsTextDelta: chunk.args_text_delta 
        })}\n`;
      case 'tool-result':
        return `a:${JSON.stringify({ 
          toolCallId: chunk.tool_call_id, 
          result: chunk.result 
        })}\n`;
      case 'data':
        return `2:${JSON.stringify([chunk.data])}\n`;
      case 'error':
        return `3:${JSON.stringify(chunk.error)}\n`;
    }
  }
} 