import { toast } from "@/hooks/use-toast";

export function toastError(title: string, error: unknown) {
  toast({
    variant: "destructive",
    title,
    description: error instanceof Error ? error.message : "Something went wrong.",
  });
}
