"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2 } from "lucide-react";
import { createCaptures, type CreateCapturesResult } from "@/app/actions/captures";

const INITIAL_STATE: CreateCapturesResult = {
  created: [],
  duplicates: [],
  invalid: [],
};

const PLACEHOLDER_TEXT = `Paste X/Twitter URLs here (one per line, or comma/space separated)

Example:
https://x.com/user/status/123456789
https://twitter.com/user/status/987654321`;

export function CaptureForm({
  onCaptureCreated,
}: {
  onCaptureCreated?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: CreateCapturesResult, formData: FormData) => {
      const result = await createCaptures(formData);
      if (result.created.length > 0 && onCaptureCreated) {
        onCaptureCreated();
      }
      return result;
    },
    INITIAL_STATE
  );

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <Textarea
          name="urls"
          placeholder={PLACEHOLDER_TEXT}
          rows={6}
          className="font-mono text-sm"
          disabled={isPending}
        />
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Camera className="h-4 w-4 mr-2" />
          )}
          {isPending ? "Creating captures..." : "Capture"}
        </Button>
      </form>

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {state.created.length > 0 && (
        <div className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          {state.created.length} capture(s) queued successfully.
        </div>
      )}

      {state.duplicates.length > 0 && (
        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
          {state.duplicates.length} URL(s) already queued or in progress.
        </div>
      )}

      {state.invalid.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <p className="font-medium text-destructive mb-1">Invalid URLs:</p>
          <ul className="list-disc list-inside text-muted-foreground">
            {state.invalid.map((item, i) => (
              <li key={i}>
                <code className="text-xs">{item.input}</code> - {item.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
