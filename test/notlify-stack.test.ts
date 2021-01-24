import { SynthUtils } from "@aws-cdk/assert";
import { App } from "@aws-cdk/core";
import { ApplicationStack } from "../lib/stack";

test("Stack with base params", () => {
  const app = new App();
  const stack = new ApplicationStack(app, "TestStack", {
    buildId: "1234",
    domainName: "test.com",
    apiEntries: [],
    uiEntry: "./test/build",
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test("Stack with apiEntry param", () => {
  const app = new App();
  const stack = new ApplicationStack(app, "TestStack", {
    buildId: "1234",
    domainName: "test.com",
    apiEntries: ["./test/lambdas/test.ts"],
    uiEntry: "./test/build",
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test("Stack with apiEntry javascript param", () => {
  const app = new App();
  const stack = new ApplicationStack(app, "TestStack", {
    buildId: "1234",
    domainName: "test.com",
    apiEntries: ["./test/lambdas/test.ts", "./test/lambdas/test2.js"],
    uiEntry: "./test/build",
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test("Stack with no domain", () => {
  const app = new App();
  const stack = new ApplicationStack(app, "TestStack", {
    apiEntries: [],
    uiEntry: "./test/build",
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
