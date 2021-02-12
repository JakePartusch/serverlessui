<p align="center">
    <img alt="Serverless UI" src="./undraw_To_the_stars_qhyy.svg" width="60" />
</p>
<h1 align="center">
  Serverless UI
</h1>

<h3 align="center">
  💻 🚀 ☁ 
</h3>
<h3 align="center">
  Deploying to AWS on Easy Mode
</h3>
<p align="center">
  Serverless UI is a free, open source command-line utility for quickly building and deploying serverless applications to AWS
</p>

- **Own your code** Get all of the benefits and security of a hosted AWS application, without all of the setup. Deploy to a new AWS account, or an existing account and get running in five minutes!

- **Full-stack Serverless** Deploy your back-end code alongside your UI for a seamless serverless experience. Serverless UI deploys your functions as Node.js 14.x lambdas behind an API Gateway and Cloudfront for an optimal blend of performance and scalability.

- **Deploy Previews** Automatically deploy each iteration of your application as a separate stack to iterate and test with confidence.

## What’s In This Document

- [Get Up and Running in 5 Minutes](#-get-up-and-running-in-5-minutes)
- [CLI Reference](#-cli-reference)
- [Setting up a Custom Domain](#-learning-gatsby)
- [The Serverless UI Architecture](#-migration-guides)
- [Under the Hood: CDK Constructs](#-migration-guides)
- [License](#license)

## 🚀 Get Up and Running in 5 Minutes

You can get a new Serverless UI site deployed to you AWS account in just a few steps:

1. **AWS Prerequisites**

   In order to deploy to AWS, you'll have to setup your machine with locally configured credentials. You'll find the best instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html).

1. **Install the AWS CDK.**

   ```shell
   npm install -g aws-cdk
   ```

1. **Install the Serverless UI Command-Line Interface**

   ```shell
   npm install -g @serverlessui/cli
   ```

1. **Bootstrap your AWS Environment**

   Next, bootstrap the CDK environment for quicker subsequent deployments

   ```shell
   cdk bootstrap aws://ACCOUNT-NUMBER-1/REGION-1
   ```

1. **Deploy your static website**

   Next, tell the Serverless UI where to find your website

   ```shell
   sui deploy --dir="./dist"
   ```

## 📖 CLI Reference

1. [deploy](#deploy)
2. [configure-domain](#configure-domain)

### `deploy`

```shell
sui deploy
```

#### Options

|    Option     | Description                                        |     Default     |
| :-----------: | -------------------------------------------------- | :-------------: |
|    `--dir`    | The directory of your website                      |   `"./dist"`    |
| `--functions` | The directory of the functions to deploy           | `"./functions"` |
|   `--prod`    | Custom Domains only: `false` will deploy a preview |      false      |

> Note: The `--dir` directory should be only static files. You may need to run a build step prior to deploying

#### Examples

- Deploy a preview of static website in a `./build` directory with no functions

```shell
sui deploy --dir="./build"
...
❯ Website Url: https://xxxxx.cloudfront.net
```

- Deploy a preview of static website with serverless functions

```shell
sui deploy --dir="./build" --functions="./lambdas"
❯ Website Url: https://xxxxx.cloudfront.net
❯ API Url: https://xxxxx.cloudfrone.net/api/my-function-name
❯ API Url: https://xxxxx.cloudfrone.net/api/my-other-function-name
```

- Production deploy
  > Note: A custom domain must be configured for production deploys. See [configure-domain](#configure-domain)

```shell
sui deploy --prod --dir="./build" --functions="./lambdas"
❯ Website Url: https://www.my-domain.com
❯ API Url: https://www.my-domain.com/api/my-function-name
❯ API Url: https://www.my-domain.com/api/my-other-function-name
```

## License

Licensed under the [MIT License](./LICENSE).
