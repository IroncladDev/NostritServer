import NDK, { NostrEvent } from "@nostr-dev-kit/ndk";
import Evt from "lib/event";
import createHandler from "./createHandler";
import fetch, { FormData } from "node-fetch";

const createImageFromText = async (prompt: string) => {
  const form = new FormData();
  form.append('prompt', prompt);

  const res = await fetch("https://clipdrop-api.co/text-to-image/v1", {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CLIPDROP_API_KEY,
    },
    body: form,
  });

  if (res.ok) {
    const imageBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    const base64String = buffer.toString("base64");
    const bs4 = `data:image/png;base64,${base64String}`;

    // For the sake of the demo, I am uploading the image to my discord CDN
    const imageUpload = await fetch("https://upload.connerow.dev/upload-base64", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "*/*"
      },
      body: JSON.stringify({
        image: bs4
      })
    });
    const upload = await imageUpload.json() as Record<string, string>;

    if (upload.url) {
      return upload.url as string;
    } else {
      return null;
    }
  } else {
    return null;
  }
}

export default createHandler({
  kinds: [68006],
  tags: ["image-gen"],
  amount: 25000,
  callback: async (e) => {
    try {
      const payRequestEvent = await e.requirePayment({
        message: "I'll generate you an image for 25 sats."
      })

      const payReq = new Evt(payRequestEvent);
      await payReq.awaitPayment();

      await e.emit({
        kind: 68001,
        content: "Awesome.  I'll send you the result when it's finished.",
        tags: [["status", "started"]],
      } as NostrEvent);

      const url = await createImageFromText(e.event.content);

      console.log(url)

      if (url) {
        await e.emit({
          kind: 68001,
          content: `Here is the completed image generation:\n\n\n![image](${url})\n\n\nImage URL: ${url}`,
          tags: [["status", "success"]],
        } as NostrEvent);
      } else {
        await e.emit({
          kind: 68001,
          content: "There was an error generating the image.",
          tags: [["status", "failed"]],
        } as NostrEvent);
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