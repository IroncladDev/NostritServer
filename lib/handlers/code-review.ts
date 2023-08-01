import NDK, { NostrEvent } from "@nostr-dev-kit/ndk";
import Evt from "lib/event";
import { Configuration, OpenAIApi } from "openai";
import createHandler from "./createHandler";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const promptOpenAI = async (prompt: string) => {
  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-16k",
    messages: [{
      role: "system",
      content: "You are a professional open-source developer who offers code reviews based on git diffs."
    }, {
      role: "user",
      content: prompt,
    }],
  });

  return chatCompletion.data.choices[0].message
}

export default createHandler({
  kinds: [68005],
  tags: ["code-review"],
  amount: 10000,
  callback: async (e) => {
    try {
      const payRequestEvent = await e.requirePayment({
        message: "I'd be happy to give you a code review for a few sats.  Once you've paid, I'll begin the code review request."
      })

      const payReq = new Evt(payRequestEvent);
      await payReq.awaitPayment();

      await e.emit({
        kind: 68001,
        content: "Thanks! I'm currently looking through your code and will provide a code review in a moment.",
        tags: [["status", "started"]],
      } as NostrEvent);

      const res = await promptOpenAI(e.event.content);

      if (res?.content) {
        await e.emit({
          kind: 68001,
          content: res?.content,
          tags: [["status", "success"]],
        } as NostrEvent);
      } else {
        await e.emit({
          kind: 68001,
          content: "There was an error calling OpenAI.",
          tags: [["status", "failed"]],
        } as NostrEvent)
      }
    } catch (err) {
      await e.emit({
        kind: 68001,
        content: "Payment timed out",
        tags: [["status", "failed"]],
      } as NostrEvent);
    }
  },
});