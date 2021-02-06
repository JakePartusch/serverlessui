import * as cdk from "@aws-cdk/core";
import { customAlphabet } from "nanoid";
import { ServerlessUIStack } from "./stacks/serverless-ui.stack";

const app = new cdk.App();

const domainName = app.node.tryGetContext("domainName");
const apiEntries = app.node.tryGetContext("apiEntries");
const uiEntry = app.node.tryGetContext("uiEntry");
const isProd = app.node.tryGetContext("prod");

const nanoid = customAlphabet("0123456789abcdef", 8);
const id = nanoid();

const stackName = isProd ? "NotlifyAppProduction" : `NotlifyAppPreview${id}`;
const zoneId = "Z03627292WZKGOOSA618D";
const certificateArn =
  "arn:aws:acm:us-east-1:644660454389:certificate/31b94cec-360e-4b3c-bb57-7d00ad8322e2";

new ServerlessUIStack(app, stackName, {
  buildId: isProd ? undefined : id,
  domainName,
  zoneId,
  certificateArn,
  apiEntries: apiEntries.split(",").filter((entry: string) => entry),
  uiEntry,
});

export const ServerlessUIApplication = app;
