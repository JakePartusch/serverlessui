import { ICertificate } from "@aws-cdk/aws-certificatemanager";
import {
  ARecord,
  AaaaRecord,
  RecordTarget,
  IHostedZone,
} from "@aws-cdk/aws-route53";
import { CloudFrontTarget } from "@aws-cdk/aws-route53-targets";
import {
  IDistribution,
  Distribution,
  ViewerProtocolPolicy,
  AllowedMethods,
  CachePolicy,
  DistributionProps,
} from "@aws-cdk/aws-cloudfront";
import { IFunction, Runtime } from "@aws-cdk/aws-lambda";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import { BucketDeployment, ISource } from "@aws-cdk/aws-s3-deployment";
import { CfnOutput, Construct, RemovalPolicy, Stack } from "@aws-cdk/core";
import { Bucket, IBucket } from "@aws-cdk/aws-s3";
import { PolicyStatement, Effect, AnyPrincipal } from "@aws-cdk/aws-iam";
import * as path from "path";
import { HttpOrigin, S3Origin } from "@aws-cdk/aws-cloudfront-origins";
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";
import { HttpApi, IHttpApi } from "@aws-cdk/aws-apigatewayv2";
import { overrideProps } from "./utils";

interface Domain {
  /**
   * The custom domain name for this deployment
   */
  domainName: string;
  /**
   * The hosted zone associated with the custom domain
   */
  hostedZone: IHostedZone;
  /**
   * The wildcard certificate for this custom domain
   */
  certificate: ICertificate;
}

interface ServerlessUIProps {
  /**
   * The unique id to use in generating the infrastructure and domain. Only used with custom domains
   * Ex. https://{buildId}.my-domain.com
   */
  buildId?: string;
  /**
   * The custom domain to use for this deployment
   */
  domain?: Domain;
  /**
   * Paths to the entry files (JavaScript or TypeScript).
   */
  apiEntries: string[];
  /**
   * The sources from which to deploy the contents of the bucket.
   */
  uiSources: ISource[];
  /**
   * Key-value pairs that Lambda caches and makes available for your Lambda functions.
   *
   * Use environment variables to apply configuration changes, such
   * as test and production environment configurations, without changing your
   * Lambda function source code.
   *
   * @default - No environment variables.
   */
  readonly apiEnvironment?: {
    [key: string]: string;
  };
  /**
   * Optional user provided props to merge with the default props for CloudFront Distribution
   */
  cloudFrontDistributionProps?: Partial<DistributionProps>;
}

export class ServerlessUI extends Construct {
  /**
   * The s3 bucket the website is deployed to
   */
  readonly websiteBucket: IBucket;
  /**
   * The API Gateway API for the function deployments
   */
  readonly httpApi: IHttpApi;
  /**
   * The Node.js Lambda Functions deployed
   */
  readonly functions: IFunction[];
  /**
   * The Cloudfront web distribution for the website and API Gateways
   */
  readonly distribution: IDistribution;

  constructor(scope: Construct, id: string, props: ServerlessUIProps) {
    super(scope, id);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Apply bucket policy to enforce encryption of data in transit
    websiteBucket.addToResourcePolicy(
      new PolicyStatement({
        sid: "HttpsOnly",
        resources: [`${websiteBucket.bucketArn}/*`],
        actions: ["*"],
        principals: [new AnyPrincipal()],
        effect: Effect.DENY,
        conditions: {
          Bool: {
            "aws:SecureTransport": "false",
          },
        },
      })
    );

    const functionFiles = props.apiEntries.map((apiEntry) => ({
      name: path.basename(apiEntry).split(".")[0],
      entry: apiEntry,
    }));

    const lambdas = functionFiles.map((functionFile) => {
      return new NodejsFunction(this, `NodejsFunction-${functionFile.name}`, {
        entry: functionFile.entry,
        handler: "handler",
        runtime: Runtime.NODEJS_14_X,
        bundling: {
          externalModules: [
            "aws-sdk", // Use the 'aws-sdk' available in the Lambda runtime
          ],
        },
        environment: {
          ...props.apiEnvironment,
        },
      });
    });

    const httpApi = new HttpApi(this, "HttpApi");

    lambdas.forEach((lambda, i) => {
      const lambdaFileName = functionFiles[i].name;
      const lambdaProxyIntegration = new LambdaProxyIntegration({
        handler: lambda,
      });

      httpApi.addRoutes({
        path: `/api/${lambdaFileName}`,
        integration: lambdaProxyIntegration,
      });
    });

    /**
     * Build a Cloudfront behavior for each api function that allows all HTTP Methods and has caching disabled.
     */
    const additionalBehaviors = {
      "/api/*": {
        origin: new HttpOrigin(
          `${httpApi.apiId}.execute-api.${Stack.of(this).region}.amazonaws.com`
        ),
        cachePolicy: CachePolicy.CACHING_DISABLED,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    };

    const defaultDistributionProps = {
      defaultBehavior: {
        origin: new S3Origin(websiteBucket),
        allowedMethods: AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      defaultRootObject: "index.html",
      additionalBehaviors,
      certificate: props.domain?.certificate,
      domainNames: props.domain
        ? [
            props.buildId
              ? `${props.buildId}.${props.domain.domainName}`
              : `www.${props.domain.domainName}`,
          ]
        : undefined,
      enableLogging: true,
    };

    const mergedDistributionProps = overrideProps(
      defaultDistributionProps,
      props.cloudFrontDistributionProps ?? {}
    );

    /**
     * Creating a Cloudfront distribution for the website bucket with an aggressive caching policy
     */
    const distribution = new Distribution(
      this,
      "Distribution",
      mergedDistributionProps
    );

    new BucketDeployment(this, "BucketDeployment", {
      sources: props.uiSources,
      destinationBucket: websiteBucket!,
      distribution: distribution,
      retainOnDelete: false,
    });

    if (props.domain) {
      new ARecord(this, "IPv4 AliasRecord", {
        zone: props.domain.hostedZone,
        recordName: props.buildId ?? "www",
        target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      });

      new AaaaRecord(this, "IPv6 AliasRecord", {
        zone: props.domain.hostedZone,
        recordName: props.buildId ?? "www",
        target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      });
    }
    if (!props.domain) {
      new CfnOutput(this, "Base Url", {
        value: `https://${distribution.distributionDomainName}`,
      });
    } else {
      new CfnOutput(this, "Base Url", {
        value: props.buildId
          ? `https://${props.buildId}.${props.domain.domainName}`
          : `https://www.${props.domain.domainName}`,
      });
    }

    functionFiles.map((apiEntry) => {
      if (props.domain) {
        new CfnOutput(this, `Function Path - ${apiEntry.name}`, {
          value: props.buildId
            ? `https://${props.buildId}.${props.domain.domainName}/api/${apiEntry.name}`
            : `https://www.${props.domain.domainName}/api`,
        });
      } else {
        new CfnOutput(this, `Function Path - ${apiEntry.name}`, {
          value: `https://${distribution.distributionDomainName}/api/${apiEntry.name}`,
        });
      }
    });

    this.websiteBucket = websiteBucket;
    this.httpApi = httpApi;
    this.functions = lambdas;
    this.distribution = distribution;
  }
}
