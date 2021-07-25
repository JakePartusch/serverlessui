---
title: Serverless UI - Introduction
layout: ../layouts/Main.astro
---

<img src="https://repository-images.githubusercontent.com/332943848/36285f00-76ac-11eb-9664-bda0e8e63696" alt="ServerlessUI" width="638" height="320" >

## What is Serverless UI?

Serverless UI is a free, open source command-line utility for quickly building and deploying serverless applications on AWS. Serverless UI supports a variety of features, such as deploy previews, custom domains and serverless functions.

## Features

- **Bring your own UI** It does not matter if it is React, Vue, Svelte or JQuery. If it compiles down to static files, then it is supported.

- **Serverless Functions** Your functions become endpoints, automatically. Serverless UI deploys each function in your `/functions` directory as a Node.js lambda behind a CDN and API Gateway for an optimal blend of performance and scalability.

- **Deploy Previews** Automatically deploy each iteration of your application with a separate URL to continuously integrate and test with confidence.

- **Custom Domains** Quickly configure a custom domain to take advantage of production deploys!

- **TypeScript Support** Write your serverless functions in JavaScript or TypeScript. Either way, they will be bundled down extremely quickly and deployed as Node.js 14 lambdas.

- **Own your code** Skip the 3rd Party services — get all of the benefits and security of a hosted AWS application, without going through a middleman. Deploy to a new AWS account, or an existing account and get up and running in five minutes!

## Project Status

**Serverless UI is still an early beta, missing features and bugs are to be expected!** If you can stomach it, then Astro-built sites are production ready and several production websites built with Astro already exist in the wild. We will update this note once we get closer to a stable, v1.0 release.

## Quick Start

```bash
# In order to deploy to AWS, you will have to configure your machine with local credentials. You will find the best instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html).

# Install the Serverless UI Command-Line Interface
npm install -g @serverlessui/cli

# Tell the Serverless UI where to find your website's static files.
sui deploy --dir="dist"
```
