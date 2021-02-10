import * as cdk from "@aws-cdk/core";
import { DomainStack } from "./stacks/domain.stack";

const app = new cdk.App();

const domainName = app.node.tryGetContext("domainName");

new DomainStack(app, "ServelessUIDomain", {
  domainName,
});

export const DomainApplication = app;
