import { Inbound } from "inboundemail";

let _client: Inbound | undefined;

export function inbound(): Inbound {
  if (!_client) {
    const apiKey = process.env.INBOUND_API_KEY;
    if (!apiKey) {
      throw new Error("INBOUND_API_KEY is not set");
    }
    _client = new Inbound({ apiKey });
  }
  return _client;
}
