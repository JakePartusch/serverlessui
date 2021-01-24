#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { customAlphabet } from "nanoid";
import { ApplicationStack } from "../lib/stack";

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
  buildId: id,
  domainName,
  zoneId,
  apiEntries: apiEntries.split(","),
  uiEntry,
});

export default app;
