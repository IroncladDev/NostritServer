import NDK, { NostrEvent } from "@nostr-dev-kit/ndk";
import Evt from "lib/event";
import handleCodeReview from "lib/handlers/code-review";
import handleImageGen from "lib/handlers/image-gen";
import getSigner from "./lib/signer";

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nostr.swiss-enigma.ch",
  "wss://relay.f7z.io",
];

const ndk = new NDK({
  explicitRelayUrls: RELAYS,
  signer: getSigner(),
});

Evt.setNDK(ndk);

handleCodeReview();
handleImageGen();

ndk.connect(2000).then(() => {
  console.log("Connected");
});
