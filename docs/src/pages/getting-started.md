---
title: Getting Started
layout: ../layouts/Main.astro
---

## Get Up and Running in 5 Minutes

You can get a new Serverless UI site deployed to you AWS account in just a few steps:

1. **AWS Prerequisites**

   In order to deploy to AWS, you will have to configure your machine with local credentials. You will find the best instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html).

1. **Install the Serverless UI Command-Line Interface**

   ```shell
   npm install -g @serverlessui/cli
   ```

1. **Deploy your static website**

   Finally, tell the Serverless UI where to find your static files.

   ```shell
   sui deploy --dir="dist"
   ```
