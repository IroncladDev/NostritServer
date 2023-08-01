import fetch from "node-fetch";

export type InvoiceResponse =
  | {
      pr: string;
      verify: string;
    }
  | {
      status: string;
      reason: string;
    };

export const createInvoiceAddress = async (amount: number) => {
  const res = await fetch(
    "https://getalby.com/lnurlp/ironclad/callback?amount=" + amount,
  );
  const data = await res.json();

  return data as InvoiceResponse;
};

export const checkInvoiceUrl = async (verifyUrl: string) => {
  const res = await fetch(verifyUrl);
  const data = await res.json();

  return Boolean((data as { settled?: boolean })?.settled);
};
