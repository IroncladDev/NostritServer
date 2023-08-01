import { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import fs from "fs";

type IConfig = {
  key: string;
  discount?: number;
  undercut?: number;
  processWithoutPaymentLimit?: number;
  serveResultsWithoutPaymentLimit?: number;
  prompt?: string;
  jobReqMessage?: string;
};

const configFile = "config.json";

export function getConfig(): IConfig {
  let config: IConfig;

  if (fs.existsSync(configFile)) {
    return JSON.parse(fs.readFileSync(configFile, "utf8"));
  }

  console.log("Generating new config");
  config = {
    key: NDKPrivateKeySigner.generate().privateKey as string,
  };

  saveConfig(config);

  return config;
}

export function saveConfig(config: IConfig): void {
  fs.writeFileSync(configFile, JSON.stringify(config));
}

export default function getSigner(): NDKPrivateKeySigner {
  const config = getConfig();
  if (config.key == null) {
    throw new Error("Config key is not defined");
  }
  return new NDKPrivateKeySigner(config.key);
}
