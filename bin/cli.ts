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
    "--prod": Boolean,
  });

  const domain = args["--domain"];
  const functions = args["--functions"] || "./functions";
  const dir = args["--dir"] || "./dist";

  const files = glob.sync(`${functions}/**/*.{js,ts}`);

  const apiFiles = files.join(",");
  const applicationFile = `${__dirname}/application.js`;
  const domainCli = domain ? `-c domainName=${domain}` : "";
  const prodCli = args["--prod"] ? "-c prod=true" : "";

  child_process.execSync(
    `cdk synth ${prodCli} ${domainCli} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node ${applicationFile}" --quiet`,
    {
      stdio: "inherit",
    }
  );

  child_process.execSync(
    `cdk deploy ${prodCli} ${domainCli} -c apiEntries="${apiFiles}" -c uiEntry=${dir} -a "node ${applicationFile}" --require-approval never`,
    {
      stdio: "inherit",
    }
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
