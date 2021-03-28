import * as cdk from "@aws-cdk/core";
import { customAlphabet } from "nanoid";
import { ServerlessUIStack } from "./stacks/serverless-ui.stack";

const app = new cdk.App();

const domainName = app.node.tryGetContext("domainName");
const apiEntries = app.node.tryGetContext("apiEntries");
const uiEntry = app.node.tryGetContext("uiEntry");
const prod = app.node.tryGetContext("prod");
const zoneId = app.node.tryGetContext("zoneId");
const certificateArn = app.node.tryGetContext("certificateArn");
const isNextApp = app.node.tryGetContext("isNextApp");

const nanoid = customAlphabet("0123456789abcdef", 8);
const id = nanoid();

const stackName = prod
  ? "ServerlessUIAppProduction"
  : `ServerlessUIAppPreview${id}`;

new ServerlessUIStack(app, stackName, {
  buildId: prod ? undefined : id,
  domainName,
  zoneId,
  certificateArn,
  apiEntries: apiEntries.split(",").filter((entry: string) => entry),
  uiEntry,
  isNextApp,
});

export const ServerlessUIApplication = app;
