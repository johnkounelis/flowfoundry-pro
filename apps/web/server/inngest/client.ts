import { Inngest } from "inngest";
import { readEnv } from "@flowfoundry/config";

const env = readEnv();
export const inngestClient = new Inngest({ id: "flowfoundry-pro", eventKey: env.INNGEST_EVENT_KEY });
