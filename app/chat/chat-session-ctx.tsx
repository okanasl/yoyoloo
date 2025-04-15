"use client"

import { createContext, useContext } from "react";
import { AssistantRuntime, AssistantRuntimeProvider, CompositeAttachmentAdapter, ThreadMessageLike } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { useProjectDetails } from "@/modules/projects/ctx/project-details-ctx";
import { StrictImageAttachmentAdapter } from "./image-attachment-adapter";
import { useCredentials } from "./keys-ctx";


type ChatSessionContextType = {
  runtime: AssistantRuntime;
};

const ChatSessionContext = createContext<ChatSessionContextType | undefined>(
  undefined,
);

const ChatSessionProvider = ({
  children,
  initialMessages,
  projectId,
}: {
  children: React.ReactNode;
  projectId: string;
  initialMessages?: ThreadMessageLike[] | undefined
}) => {
    const {anthropicKey, falKey} = useCredentials();

    const {project} = useProjectDetails();
    const queryClient = useQueryClient();

    
    const runtime = useChatRuntime({
      api: `/api/chat?projectId=${projectId}`,
      initialMessages,
      adapters: {
        attachments: new CompositeAttachmentAdapter([
          new StrictImageAttachmentAdapter(),
        ]),
      },
      body: {
        projectId,
        anthropicKey,
        falKey,
      },
      onResponse: async (resp) => {
        const clonedResp = resp.clone();
        if (!clonedResp.body) {
          return;
        }
        const reader = clonedResp.body.getReader();
        const dec = new TextDecoder();

        const asyncProcessResponse = async () => {
          let done, value;
          while (!done) {
            ({ value, done } = await reader.read());
            // Release the lock if the stream is done
            if (done) {
              reader.releaseLock();
            }
            // Decode text from the stream
            const strval = dec.decode(value, { stream: true });
            if (strval) {
              const chunksInPayload = strval.split('\n');
              for (const strChunk of chunksInPayload) {
                // If it is not valid JSON, ignore
                console.log(strChunk)
              }
            }
          }
          // invalidate query so that it re-loads with new state
          queryClient.invalidateQueries({ queryKey: ['project', project?.id] });
        };
        asyncProcessResponse();
      }
    });


    return (
      <ChatSessionContext.Provider value={{
        runtime,
      }}>
        <AssistantRuntimeProvider runtime={runtime}>
            {children}
        </AssistantRuntimeProvider>
      </ChatSessionContext.Provider>
    )
};

const useChatSession = () => {
  const ctx = useContext(ChatSessionContext);
  if (!ctx) {
    throw new Error("ChatSession provider is missing");
  }
  return ctx;
};

export { useChatSession, ChatSessionProvider };