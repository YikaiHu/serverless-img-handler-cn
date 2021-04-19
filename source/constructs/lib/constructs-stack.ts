// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from '@aws-cdk/core';
import { ServerlessImageHandler, ServerlessImageHandlerProps } from './serverless-image-handler';
import { CfnParameter, CfnParameterProps } from '@aws-cdk/core';

const { VERSION, CHINA_REGION } = process.env;
const IS_CHINA_REGION = !!CHINA_REGION;

function paramGroup(label: string, params: (CfnParameter | undefined)[]) {
  return {
    Label: { default: label },
    Parameters: params.map(p => {
      return p ? p.logicalId : ''
    }).filter(id => id)
  };
}

function paramGroupIf(expression: boolean, label: string, params: (CfnParameter | undefined)[]) {
  if (expression) {
    return paramGroup(label, params)
  }
  return undefined;
}

/**
 * @class ConstructsStack
 */
export class ConstructsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cfnParamIf = (expression: boolean, id: string, props?: CfnParameterProps): CfnParameter | undefined => {
      if (expression) {
        return new CfnParameter(this, id, props);
      }
      return undefined
    };
    const cfnParam = (id: string, props?: CfnParameterProps): CfnParameter => {
      return new CfnParameter(this, id, props);
    };

    // CFN parameters
    const apiDomain = cfnParamIf(IS_CHINA_REGION, 'ApiDomain', {
      description: 'Choose an ICP licensed domain for the Image Handler distribution',
      type: 'String',
      allowedPattern: '^$|(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])$'
    });
    const apiCertificateIamId = cfnParamIf(IS_CHINA_REGION, 'ApiCertificateIamId', {
      description: '[Optional] Do you want enable SSL certificate for the Image Handler distribution? If yes, please upload SSL certificate to IAM using AWS CLI',
      type: 'String',
      default: ''
    });
    const deployDemoUiParameter = cfnParam('DeployDemoUI', {
      type: 'String',
      description: 'Would you like to deploy a demo UI to explore the features and capabilities of this solution? This will create an additional Amazon S3 bucket and Amazon CloudFront distribution in your account.',
      default: 'Yes',
      allowedValues: ['Yes', 'No']
    });
    const demoUIDomain = cfnParamIf(IS_CHINA_REGION, 'DemoUIDomain', {
      description: 'Choose an ICP licensed domain for the Image Handler DemoUI',
      type: 'String',
      allowedPattern: '^$|(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])$',
      default: ''
    });
    const demoUICertificateIamId = cfnParamIf(IS_CHINA_REGION, 'DemoUICertificateIamId', {
      description: '[Optional] Do you want enable SSL certificate for the DemoUI? If yes, please upload SSL certificate to IAM using AWS CLI',
      type: 'String',
      default: ''
    });
    const corsEnabledParameter = cfnParam('CorsEnabled', {
      type: 'String',
      description: `Would you like to enable Cross-Origin Resource Sharing (CORS) for the image handler API? Select 'Yes' if so.`,
      default: 'No',
      allowedValues: ['Yes', 'No']
    });
    const corsOriginParameter = cfnParam('CorsOrigin', {
      type: 'String',
      description: `If you selected 'Yes' above, please specify an origin value here. A wildcard (*) value will support any origin. We recommend specifying an origin (i.e. https://example.domain) to restrict cross-site access to your API.`,
      default: '*'
    });
    const sourceBucketsParameter = cfnParam('SourceBuckets', {
      type: 'String',
      description: '(Required) List the buckets (comma-separated) within your account that contain original image files. If you plan to use Thumbor or Custom image requests with this solution, the source bucket for those requests will be the first bucket listed in this field.',
      default: 'defaultBucket, bucketNo2, bucketNo3, ...',
      allowedPattern: '.+'
    });
    const logRetentionPeriodParameter = cfnParam('LogRetentionPeriod', {
      type: 'Number',
      description: 'This solution automatically logs events to Amazon CloudWatch. Select the amount of time for CloudWatch logs from this solution to be retained (in days).',
      default: '1',
      allowedValues: ['1', '3', '5', '7', '14', '30', '60', '90', '120', '150', '180', '365', '400', '545', '731', '1827', '3653']
    });
    const autoWebPParameter = cfnParam('AutoWebP', {
      type: 'String',
      description: `Would you like to enable automatic WebP based on accept headers? Select 'Yes' if so.`,
      default: 'No',
      allowedValues: ['Yes', 'No']
    });
    const enableSignatureParameter = cfnParam('EnableSignature', {
      type: 'String',
      description: `Would you like to enable the signature? If so, select 'Yes' and provide SecretsManagerSecret and SecretsManagerKey values.`,
      default: 'No',
      allowedValues: ['Yes', 'No']
    });
    const secretsManagerParameter = cfnParam('SecretsManagerSecret', {
      type: 'String',
      description: 'The name of AWS Secrets Manager secret. You need to create your secret under this name.',
      default: ''
    });
    const secretsManagerKeyParameter = cfnParam('SecretsManagerKey', {
      type: 'String',
      description: 'The name of AWS Secrets Manager secret key. You need to create secret key with this key name. The secret value would be used to check signature.',
      default: ''
    });
    const enableDefaultFallbackImageParameter = cfnParam('EnableDefaultFallbackImage', {
      type: 'String',
      description: `Would you like to enable the default fallback image? If so, select 'Yes' and provide FallbackImageS3Bucket and FallbackImageS3Key values.`,
      default: 'No',
      allowedValues: ['Yes', 'No']
    });
    const fallbackImageS3BucketParameter = cfnParam('FallbackImageS3Bucket', {
      type: 'String',
      description: 'The name of the Amazon S3 bucket which contains the default fallback image. e.g. my-fallback-image-bucket',
      default: ''
    });
    const fallbackImageS3KeyParameter = cfnParam('FallbackImageS3Key', {
      type: 'String',
      description: 'The name of the default fallback image object key including prefix. e.g. prefix/image.jpg',
      default: ''
    });

    // Serverless Image Handler props
    const sihProps: ServerlessImageHandlerProps = {
      // Api
      apiDomain,
      apiCertificateIamId,
      deployDemoUiParameter,
      // Demo ui
      demoUIDomain,
      demoUICertificateIamId,
      // Cors
      corsEnabledParameter,
      corsOriginParameter,
      sourceBucketsParameter,
      logRetentionPeriodParameter,
      autoWebPParameter,
      enableSignatureParameter,
      secretsManagerParameter,
      secretsManagerKeyParameter,
      enableDefaultFallbackImageParameter,
      fallbackImageS3BucketParameter,
      fallbackImageS3KeyParameter
    };

    // CFN descrption
    this.templateOptions.description = `(SO0023) - Serverless Image Handler with aws-solutions-constructs: This template deploys and configures a serverless architecture that is optimized for dynamic image manipulation and delivery at low latency and cost. Leverages SharpJS for image processing. Template version ${VERSION}`;

    // CFN template format version
    this.templateOptions.templateFormatVersion = '2010-09-09';

    // CFN metadata
    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          paramGroupIf(IS_CHINA_REGION, 'API Configuration', [apiDomain, apiCertificateIamId]),
          paramGroup('CORS Options', [corsEnabledParameter, corsOriginParameter]),
          paramGroup('Image Sources', [sourceBucketsParameter]),
          paramGroup('Demo UI', [deployDemoUiParameter, demoUIDomain, demoUICertificateIamId]),
          paramGroup('Event Logging', [logRetentionPeriodParameter]),
          paramGroup('Image URL Signature (Note: Enabling signature is not compatible with previous image URLs, which could result in broken image links. Please refer to the implementation guide for details: https://docs.aws.amazon.com/solutions/latest/serverless-image-handler/considerations.html)',
            [enableSignatureParameter, secretsManagerParameter, secretsManagerKeyParameter]
          ),
          paramGroup('Default Fallback Image (Note: Enabling default fallback image returns the default fallback image instead of JSON object when error happens. Please refer to the implementation guide for details: https://docs.aws.amazon.com/solutions/latest/serverless-image-handler/considerations.html)',
            [enableDefaultFallbackImageParameter, fallbackImageS3BucketParameter, fallbackImageS3KeyParameter]
          ),
          paramGroup('Auto WebP', [autoWebPParameter])
        ].filter(p => p)
      }
    };

    // Mappings
    new cdk.CfnMapping(this, 'Send', {
      mapping: {
        AnonymousUsage: {
          Data: 'Yes'
        }
      }
    });

    // Serverless Image Handler Construct
    const serverlessImageHander = new ServerlessImageHandler(this, 'ServerlessImageHandler', sihProps);

    const cfnOutput = (id: string, props: cdk.CfnOutputProps): cdk.CfnOutput => {
      return new cdk.CfnOutput(this, id, props);
    }
    const cfnOutputIf = (expression: boolean, id: string, props: cdk.CfnOutputProps): cdk.CfnOutput | undefined => {
      if (expression) {
        new cdk.CfnOutput(this, id, props);
      }
      return undefined;
    }

    // Outputs
    cfnOutput('ApiEndpoint', {
      description: 'Link to API endpoint for sending image requests to.',
      value: serverlessImageHander.node.tryFindChild('ApiCertificateCondition') ?
        cdk.Fn.conditionIf('ApiCertificateCondition', cdk.Fn.sub('https://${ApiDomain}'), cdk.Fn.sub('http://${ApiDomain}')).toString() :
        cdk.Fn.sub('https://${ImageHandlerDistribution.DomainName}')
    });
    cfnOutputIf(IS_CHINA_REGION, 'ApiEndpointCNAME', {
      description: 'CloudFront CNAME for API Endpoint. Configure your DNS resolver and point domain to this address',
      value: cdk.Fn.sub('${ImageHandlerDistribution.DomainName}')
    });

    cfnOutput('DemoUrl', {
      description: 'Link to the demo user interface for the solution.',
      value: serverlessImageHander.node.tryFindChild('DemoUICertificateCondition') ?
        cdk.Fn.conditionIf('DemoUICertificateCondition', cdk.Fn.sub('https://${DemoUIDomain}/index.html'), cdk.Fn.sub('http://${DemoUIDomain}/index.html')).toString() :
        cdk.Fn.sub('https://${DemoDistribution.DomainName}/index.html'),
      condition: serverlessImageHander.node.findChild('DeployDemoUICondition') as cdk.CfnCondition
    });
    cfnOutputIf(IS_CHINA_REGION, 'DemoUrlCNAME', {
      description: 'CloudFront CNAME for DemoUI. Configure your DNS resolver and point domain to this address',
      value: cdk.Fn.sub('${DemoDistribution.DomainName}')
    });

    cfnOutput('SourceBucketsOutput', {
      value: sourceBucketsParameter.valueAsString,
      description: 'Amazon S3 bucket location containing original image files.'
    }).overrideLogicalId('SourceBuckets');
    cfnOutput('CorsEnabledOutput', {
      value: corsEnabledParameter.valueAsString,
      description: 'Indicates whether Cross-Origin Resource Sharing (CORS) has been enabled for the image handler API.'
    }).overrideLogicalId('CorsEnabled');
    cfnOutput('CorsOriginOutput', {
      value: corsOriginParameter.valueAsString,
      description: 'Origin value returned in the Access-Control-Allow-Origin header of image handler API responses.',
      condition: serverlessImageHander.node.findChild('EnableCorsCondition') as cdk.CfnCondition
    }).overrideLogicalId('CorsOrigin');
    cfnOutput('LogRetentionPeriodOutput', {
      value: cdk.Fn.ref('LogRetentionPeriod'),
      description: 'Number of days for event logs from Lambda to be retained in CloudWatch.'
    }).overrideLogicalId('LogRetentionPeriod');
  }
}
