"use client"

import { createContext, useContext, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CredForm } from "@/components/cred-form";


type CredentialsContextType = {
    anthropicKey: string | undefined;
    falKey: string | undefined;
};

const CredentialsContext = createContext<CredentialsContextType | undefined>(
  undefined,
);

const CredentialsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
    const [anthropicKey, setAnthropicKey] = useState<string | undefined>();
    const [falKey, setFalKey] = useState<string | undefined>();

    
    const showDialog = !anthropicKey || !falKey;

    return (
      <CredentialsContext.Provider value={{
        anthropicKey,
        falKey,
      }}>
      {showDialog && <Dialog open={showDialog}>
        <DialogContent className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle>API Keys</DialogTitle>
          <DialogDescription>Please set required API keys to continue</DialogDescription>
        </DialogHeader>
        <CredForm onSetKeys={(data) => {
          setAnthropicKey(data.anthropic_key);
          setFalKey(data.fal_key);
        }} />
        <span className="text-sm italic">API will not stored anywhere.</span>
        </DialogContent>
      </Dialog>}
      {!showDialog && <>{children}</>}
      </CredentialsContext.Provider>
    )
};

const useCredentials = () => {
  const ctx = useContext(CredentialsContext);
  if (!ctx) {
    throw new Error("Credentials provider is missing");
  }
  return ctx;
};

export { useCredentials, CredentialsProvider };