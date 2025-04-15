"use client"

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { Input } from "../ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "../ui/button"
import { useForm } from "react-hook-form"
import { Separator } from "../ui/separator"

const formSchema = z.object({
    fal_key: z.string().min(1, {
      message: "FAL_KEY is required.",
    }),
    anthropic_key: z.string().min(1, {
      message: "ANTHROPIC_KEY is required.",
    }),
  })

export  type APIKeysType = z.infer<typeof formSchema>;

function CredForm({onSetKeys}: {onSetKeys: (data: APIKeysType) => void}) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
      })

      function onSubmit(values: z.infer<typeof formSchema>) {
        onSetKeys(values)
      }

    return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
            control={form?.control}
            name="anthropic_key"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Anthropic API KEY</FormLabel>
                <FormControl>
                    <Input placeholder="sk-ant-..." {...field} />
                </FormControl>
                <FormDescription>Visit <a className="text-blue-400 underline" target="_blank" href="https://console.anthropic.com/settings/keys">Anthropic Console</a></FormDescription>
                <FormMessage />
                </FormItem>
            )}
        />
        <Separator className="my-4" />
        <FormField
            control={form?.control}
            name="fal_key"
            render={({ field }) => (
                <FormItem>
                <FormLabel>fal.ai API KEY</FormLabel>
                <FormControl>
                    <Input placeholder="47f***-****" {...field} />
                </FormControl>
                <FormDescription>Visit <a className="text-blue-400 underline" target="_blank" href="https://fal.ai/dashboard/keys">Fal AI Dashboard</a></FormDescription>
                <FormMessage />
                </FormItem>
            )}
        />

        <Separator className="my-4" />
        <div className="flex justify-end">
          <Button>
              Submit
          </Button>
        </div>
        </form>
      </Form>
      )
}

export { CredForm }