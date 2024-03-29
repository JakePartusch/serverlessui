<p align="center">
    <img alt="Serverless UI" src="./docs/images/undraw_To_the_stars_qhyy.svg" width="150" />
</p>
<h1 align="center">
  Serverless UI
</h1>

<h3 align="center">
  💻 🚀 ☁ 
</h3>
<h3 align="center">
  Deploying Websites to AWS on Easy Mode
</h3>
<p align="center">
  Serverless UI is a free, open source command-line utility for quickly building and deploying serverless applications on AWS
</p>

- **Bring your own UI** It doesn't matter if it's React, Vue, Svelte or JQuery. If it compiles down to static files, then it is supported.

- **Serverless Functions** Your functions become endpoints, automatically. Serverless UI deploys each function in your `/functions` directory as a Node.js lambda behind a CDN and API Gateway for an optimal blend of performance and scalability.

- **Deploy Previews** Automatically deploy each iteration of your application with a separate URL to continuously integrate and test with confidence.

- **Custom Domains** Quickly configure a custom domain to take advantage of production deploys!

- **TypeScript Support** Write your serverless functions in JavaScript or TypeScript. Either way, they'll be bundled down extremely quickly and deployed as Node.js 14 lambdas.

- **Own your code** Skip the 3rd Party services — get all of the benefits and security of a hosted AWS application, without going through a middleman. Deploy to a new AWS account, or an existing account and get up and running in five minutes!

## What's in this Document

- [What's in this Document](#whats-in-this-document)
- [🚀 Get Up and Running in 5 Minutes](#-get-up-and-running-in-5-minutes)
- [📖 CLI Reference](#-cli-reference)
  - [`deploy`](#deploy)
    - [Options](#options)
    - [Examples](#examples)
  - [`configure-domain`](#configure-domain)
    - [Options](#options-1)
    - [Examples](#examples-1)
    - [Additional Steps](#additional-steps)
- [Continuous Integration](#continuous-integration)
  - [GitHub Actions](#github-actions)
- [👩‍🔬 Experimental Features](#-experimental-features)
  - [\_\_experimental_privateS3](#__experimental_privates3)
- [👩‍💻 Advanced Use Cases](#-advanced-use-cases)
  - [Serverless UI Advanced Example](#serverless-ui-advanced-example)
- [FAQ](#faq)
- [License](#license)

## 🚀 Get Up and Running in 5 Minutes

You can get a new Serverless UI site deployed to you AWS account in just a few steps:

1. **AWS Prerequisites**

   In order to deploy to AWS, you'll have to configure your machine with local credentials. You'll find the best instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html).

1. **Install the Serverless UI Command-Line Interface**

   ```shell
   npm install -g @serverlessui/cli
   ```

1. **Deploy your static website**

   Finally, tell the Serverless UI where to find your website's static files.

   ```shell
   sui deploy --dir="dist"
   ```

## 📖 CLI Reference

1. [deploy](#deploy)
2. [configure-domain](#configure-domain)

### `deploy`

```shell
sui deploy
```

#### Options

|    Option     | Description                                           |    Default    |
| :-----------: | ----------------------------------------------------- | :-----------: |
|    `--dir`    | The directory of your website's static files          |   `"dist"`    |
| `--functions` | The directory of the functions to deploy as endpoints | `"functions"` |
|   `--prod`    | Custom Domains only: `false` will deploy a preview    |    `false`    |

> Note: The `--dir` directory should be only static files. You may need to run a build step prior to deploying

#### Examples

- Deploy a preview of static website in a `build` directory with no functions

```shell
sui deploy --dir="build"
...
❯ Website Url: https://xxxxx.cloudfront.net
```

- Deploy a preview of static website with serverless functions

```shell
sui deploy --dir="build" --functions="lambdas"
...
❯ Website Url: https://xxxxx.cloudfront.net
❯ API Url: https://xxxxx.cloudfront.net/api/my-function-name
❯ API Url: https://xxxxx.cloudfront.net/api/my-other-function-name
```

- Production deploy
  > Note: A custom domain must be configured for production deploys. See [configure-domain](#configure-domain)

```shell
sui deploy --prod --dir="build" --functions="lambdas"
...
❯ Website Url: https://www.my-domain.com
❯ API Url: https://www.my-domain.com/api/my-function-name
❯ API Url: https://www.my-domain.com/api/my-other-function-name
```

### `configure-domain`

This step only needs to be completed once, but it may take anywhere from 20 minutes - 48 hours to fully propogate

```shell
sui configure-domain [--domain]
```

#### Options

|   Option   | Description        | Default |
| :--------: | ------------------ | :-----: |
| `--domain` | Your custom domain |  None   |

#### Examples

Deploy a Hosted Zone and Certificate to us-east-1 (required region for Cloudfront)

```shell
sui configure-domain --domain="serverlessui.app"
```

#### Additional Steps

A minute or two after running this command, the deploy will "hang" while trying to validate the domain prior to creating the wildcard certificate.

1.  **Navigate to Route53**

    Find your Hosted Zone and take note of the Zone Id and Name Servers

    <p align="center">
        <img alt="Serverless UI" src="./docs/images/hosted-zone-id.png" width="600" />
    </p>
    <p align="center">
        <img alt="Serverless UI" src="./docs/images/name-servers.png" width="600" />
    </p>

2.  **Update the Nameservers on your Domain Registrar's website (eg. Namecheap)**

    <p align="center">
        <img alt="Serverless UI" src="./docs/images/domain-registrar.png" width="600" />
    </p>

3.  **Wait**

    The DNS resolution can be as quick as 10 minutes or take up to 48 hours. After some time, the Serverless UI command may timeout, but running it again should pick up where it left off.

4.  **Navigate to Certificate Manager**

    After the `configure-domain` command has completed successfully, navigate to Certificate Manager and take note of the Certificate Arn (eg. "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx")

5.  **Create a Serverless UI config file**

    Place the config file in the root of your project

    > serverlessui.config.js

    ```js
    module.exports = {
      domain: "serverlessui.app",
      zoneId: "Z10011111YYYYGGGRRR",
      certificateArn:
        "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx",
    };
    ```

## Continuous Integration

Since Serverless UI is a command-line tool available via npm, it will work in almost any CI environment.

### GitHub Actions

> Note: Checkout the action in this repo for a live example https://github.com/JakePartusch/serverlessui/actions

```yaml
name: Serverless UI Build & Deploy Preview

on: [pull_request]

jobs:
  deploy-pr-preview:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v1
        with:
          node-version: "12.x"
      - run: npm ci
      - run: npm run build
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2
      - run: npm install -g @serverlessui/cli
      - run: sui deploy --dir="build"
      - name: Add PR Comment
        uses: actions/github-script@v3
        with:
          github-token: ${{secrets.GITHUB_TOKEN}}
          script: |
            const outputs = require(`${process.env.GITHUB_WORKSPACE}/cdk.out/outputs.json`);
            const stackName = Object.keys(outputs).find((key) =>
              key.startsWith("ServerlessUI")
            );
            const baseUrlKey = Object.keys(outputs[stackName]).find((key) =>
              key.startsWith("ServerlessUIBaseUrl")
            );
            github.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `✅ Your deploy preview is ready: ${outputs[stackName][baseUrlKey]}`,
            });
```

## 👩‍🔬 Experimental Features

In order to use experimental features, a `serverlessui.config.js` file must exist at the base of the project.

### \_\_experimental_privateS3

This experimental feature allows the configuration of a private S3 bucket — which may be desired for enhanced security. This feature can be enabled in `serverlessui.config.js`:

```javascript
module.exports = {
  __experimental_privateS3: true,
};
```

## 👩‍💻 Advanced Use Cases

For existing serverless projects or those that may have additional CloudFormation and/or CDK infrastructure, Serverless UI provides CDK constructs for each of the cli actions:

```javascript
import { ServerlessUI, DomainCertificate } from '@serverlessui/construct;
```

### Serverless UI Advanced Example

For a full-featured example, check out:
https://github.com/JakePartusch/serverlessui-advanced-example

```javascript
const { functions } = new ServerlessUI(this, "ServerlessUI", {
  buildId: "advanced-example",
  uiSources: [Source.asset(`${__dirname}/../build`)],
  apiEntries: [`${__dirname}/../functions/graphql.ts`],
  apiEnvironment: {
    TABLE_NAME: table.tableName,
  },
  domain: {
    domainName: "serverlessui.app",
    hostedZone: HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId: "Z1XXXXXXXXXXXXX",
      zoneName: "serverlessui.app",
    }),
    certificate: Certificate.fromCertificateArn(
      this,
      "Certificate",
      "arn:aws:acm:us-east-1:xxxxxxxxxx:certificate/xxxxxx-xxxx-xxxx-xxxxxx"
    ),
  },
});
```

## FAQ

- Q. How is this different than Netlify or Vercel?
  - Serverless UI allows you to enjoy the benefits of pre-configured infrastructure without going through a middleman. This allows for fewer accounts, tighter security and seamless integration with a wealth of AWS services. Additionally, you receive these benefits "at cost" since this is deployed directly to your AWS account.

## License

Licensed under the [MIT License](./LICENSE).
