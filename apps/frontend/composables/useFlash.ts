export interface FlashMessage {
  type: "success" | "error";
  text: string;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export function useFlash() {
  const message = useState<FlashMessage | null>("flash", () => null);

  function show(type: FlashMessage["type"], text: string): void {
    message.value = { type, text };
    clearTimeout(timer);
    timer = setTimeout(() => (message.value = null), 4000);
  }

  function clear(): void {
    clearTimeout(timer);
    message.value = null;
  }

  return { message, show, clear };
}
