import * as cdk from "@aws-cdk/core";
import { DomainStack } from "./stacks/domain.stack";

const app = new cdk.App();

const domainName = app.node.tryGetContext("domainName");

const domainNameStackName = `ServerlessUIDomain-${domainName
  .split(".")
  .join("dot")}`;

new DomainStack(app, domainNameStackName, {
  domainName,
  //Force the certificate to be created in us-east-1: https://github.com/JakePartusch/serverlessui/issues/20
  env: {
    region: "us-east-1",
  },
});

export const DomainApplication = app;
