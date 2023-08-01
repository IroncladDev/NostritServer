import { NDKEvent } from "@nostr-dev-kit/ndk";
import Evt from "lib/event";

export default function createHandler({
  kinds,
  tags,
  amount,
  callback
}: {
  kinds: number[];
  tags: string[];
  amount: number;
  callback: (e: Evt) => void;
}) {
  if (amount < 1000) throw new Error("Amount must be greater than or equal to 1000");

  return () => {
    Evt.ndk!.subscribe({
      kinds,
      since: Math.floor(Date.now() / 1000),
      "#j": tags,
    }, {
      closeOnEose: false
    })
      .on("event", async (e: NDKEvent) => callback(new Evt(e, amount)))
  }
}