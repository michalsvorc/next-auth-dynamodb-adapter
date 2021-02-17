import {PutItemCommand} from '@aws-sdk/client-dynamodb';
import bcrypt from 'bcrypt';
import {AppOptions} from 'next-auth';
import {EmailSessionProvider, VerificationRequest} from 'next-auth/adapters';

import {VERIFICATION_TOKEN_MAX_AGE} from '../DynamoDBAdapter';
import {DynamoDBAdapterInstance} from '../DynamoDBAdapter';

export const createVerificationRequest = ({
  client,
  logger,
  appOptions,
  tableOptions,
}: {
  readonly client: DynamoDBAdapterInstance['_client'];
  readonly logger: DynamoDBAdapterInstance['_logger'];
  readonly appOptions: DynamoDBAdapterInstance['_appOptions'];
  readonly tableOptions: DynamoDBAdapterInstance['_tableOptions'];
}) => (
  email: string,
  url: string,
  token: string,
  _secret: string,
  provider: EmailSessionProvider,
  _options: AppOptions
): Promise<VerificationRequest> => {
  const DEBUG_ID = 'createVerificationRequest';

  logger.debug(DEBUG_ID, email);

  const {verificationRequestsTable} = tableOptions;

  if (!verificationRequestsTable) {
    return Promise.reject(
      new Error('verificationRequestsTable name was not provided')
    );
  }

  const {baseUrl} = appOptions;
  const {sendVerificationRequest, maxAge} = provider;
  const expires = new Date(
    Date.now() + (maxAge || VERIFICATION_TOKEN_MAX_AGE) * 1000
  );

  return new Promise((resolve, reject) =>
    bcrypt
      .hash(token, 10)
      .then((hashedToken) =>
        client.send(
          new PutItemCommand({
            TableName: verificationRequestsTable,
            Item: {
              expires: {S: expires.toISOString()},
              email: {S: email},
              token: {S: hashedToken},
            },
          })
        )
      )
      .then((_clientResponse) =>
        sendVerificationRequest({
          identifier: email,
          url,
          token,
          baseUrl,
          provider,
        })
      )
      .then((_verificationSenderResponse) =>
        resolve({
          identifier: email,
          token,
          expires,
        })
      )
      .catch((error) => {
        logger.error(DEBUG_ID, error);
        reject(error);
      })
  );
};
