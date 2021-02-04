#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { customAlphabet } from "nanoid";
import { ApplicationStack } from "construct";

const app = new cdk.App();

const domainName = app.node.tryGetContext("domainName");
const apiEntries = app.node.tryGetContext("apiEntries");
const uiEntry = app.node.tryGetContext("uiEntry");
const isProd = app.node.tryGetContext("prod");

const nanoid = customAlphabet("0123456789abcdef", 8);
const id = nanoid();

const stackName = isProd ? "NotlifyAppProduction" : `NotlifyAppPreview${id}`;
const zoneId = "Z03627292WZKGOOSA618D";

new ApplicationStack(app, stackName, {
  buildId: isProd ? undefined : id,
  domainName,
  zoneId,
  apiEntries: apiEntries.split(",").filter((entry: string) => entry),
  uiEntry,
});

app.synth();

// export default app;
