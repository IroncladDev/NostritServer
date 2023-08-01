import NDK, { NDKEvent, NostrEvent } from "@nostr-dev-kit/ndk";
import { checkInvoiceUrl, createInvoiceAddress } from "lib/payments";

export default class Evt {
  public event: NDKEvent;
  public amount: number = 10000;
  public static ndk?: NDK;

  // Sets the base NDK event
  constructor(e: NDKEvent, amount?: number) {
    this.event = e;
    if (amount) this.amount = amount;
  }

  // Configures the NDK to be used
  public static setNDK(ndk: NDK) {
    Evt.ndk = ndk;
  }

  // Emits a NostrEvent
  async emit(data: NostrEvent) {
    const jobResult = new NDKEvent(Evt!.ndk, data);

    jobResult.tag(this.event);

    await jobResult.sign();
    await jobResult.publish();

    return jobResult;
  }

  // Adds a price to an event job and optionally an invoice
  async addAmount(includeInvoice: boolean = true) {
    const tag = ["amount", this.amount.toString()];

    if (includeInvoice) {
      const invoice = await createInvoiceAddress(this.amount);
      if ("verify" in invoice) {
        tag.push(invoice.pr, invoice.verify);
      }
    }

    this.event.tags.push(tag);
  }

  // Waits for a Zap payment
  awaitZapPayment(onResolve: () => void, onReject: () => void) {
    const zapmon = Evt.ndk!.subscribe(
      {
        kinds: [68005, 9735],
        ...this.event.filter(),
      },
      {
        closeOnEose: false,
      },
    );

    zapmon.on("event", async (e) => {
      if (e.kind === 9735) {
        onResolve();
      } else if (e.kind === 68005) {
        onReject();
      }
    });
  }

  // Waits for a lightning invoice
  awaitLnInvoice(onResolve: () => void, onReject: () => void) {
    const amountTag = this.event.getMatchingTags("amount")[0];
    const pr = amountTag[2];
    const verifyUrl = amountTag[3];

    let iterations = 0;

    if (!verifyUrl || !pr) return;
    
    console.log("checking invoice status...");

    const checkInterval = setInterval(() => {
      checkInvoiceUrl(verifyUrl).then((paid) => {
        if (paid) {
          console.log("invoice paid");
          clearInterval(checkInterval);
          onResolve();
        }
      });
      iterations++;

      if (iterations > 50) { // clear and timeout after fifty iterations
        console.log("invoice not paid");
        clearInterval(checkInterval);
        onReject();
      }
    }, 2000);
  }

  // Waits for a payment
  async awaitPayment() {
    const promise = new Promise<void>((resolve, reject) => {
      console.log("waiting for payment...");
      this.awaitZapPayment(resolve, reject);
      this.awaitLnInvoice(resolve, reject);
    });

    return promise;
  }

  // Requires a payment
  async requirePayment({
    publish = true,
    message
  }: {
    publish?: boolean;
    message?: string;
  }) {
    if (!this.amount) {
      throw new Error("No amount specified");
    }

    const payReq = new NDKEvent(Evt.ndk, {
      kind: 68001,
      content: message || "Payment Required",
      tags: [["status", "payment-required"]],
    } as NostrEvent);
    await new Evt(payReq, this.amount).addAmount(true);
    payReq.tag(this.event, "job");

    await payReq.sign();

    if (publish) await payReq.publish();
    console.log("published payment request");
    return payReq;
  }
}
