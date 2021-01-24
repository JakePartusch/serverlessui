#!/usr/bin/env node
"use strict";

import * as arg from "arg";
import * as child_process from "child_process";
import * as glob from "glob";

const main = async () => {
  const args = arg({
    "--help": Boolean,
    "--domain": String,
    "--functions": String,
    "--dir": String,
  });

  const domain = args["--domain"];
  const functions = args["--functions"] || "./functions";
  const dir = args["--dir"] || "./dist";

  const files = glob.sync(`${functions}/**/*.ts`);

  const apiFiles = files.join(",");

  child_process.execSync(
    `cdk synth -c domainName=${domain} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node node_modules/@jakepartusch/notlify/bin/application.js" --quiet`,
    {
      stdio: "inherit",
    }
  );

  child_process.execSync(
    `cdk deploy -c domainName=${domain} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node node_modules/@jakepartusch/notlify/bin/application.js" --require-approval never`,
    {
      stdio: "inherit",
    }
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
