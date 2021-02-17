import {GetItemCommand} from '@aws-sdk/client-dynamodb';
import bcrypt from 'bcrypt';
import {VerificationRequest} from 'next-auth/adapters';
import {SessionProvider} from 'next-auth/client';

import {
  DynamoDBAdapterInstance,
  ERROR_TOKEN_EXPIRED,
  ERROR_TOKEN_EXPIRED_DATE_FORMAT,
  ERROR_TOKEN_INVALID,
} from '../DynamoDBAdapter';

export const getVerificationRequest = ({
  client,
  logger,
  tableOptions,
}: {
  readonly client: DynamoDBAdapterInstance['_client'];
  readonly logger: DynamoDBAdapterInstance['_logger'];
  readonly tableOptions: DynamoDBAdapterInstance['_tableOptions'];
}) => (
  email: string,
  verificationToken: string,
  _secret: string,
  _provider: SessionProvider
): Promise<VerificationRequest | null> => {
  const DEBUG_ID = 'getVerificationRequest';

  logger.debug(DEBUG_ID, email, verificationToken);

  const {verificationRequestsTable} = tableOptions;

  if (!verificationRequestsTable) {
    return Promise.reject(
      new Error('verificationRequestsTable name was not provided')
    );
  }

  const dateNow = new Date();
  const ItemCommandInput = {
    TableName: verificationRequestsTable,
    Key: {
      email: {S: email},
    },
  };

  return new Promise((resolve, reject) =>
    client
      .send(new GetItemCommand(ItemCommandInput))
      .then((clientResponse) => {
        const expiresString = clientResponse?.Item?.expires?.S;
        const token = clientResponse?.Item?.token?.S;

        if (!expiresString || !token) {
          logger.debug(
            DEBUG_ID,
            'Unable to retrieve required values from the database.'
          );

          return resolve(null);
        }

        if (Number.isNaN(Date.parse(expiresString))) {
          return reject(new Error(ERROR_TOKEN_EXPIRED_DATE_FORMAT));
        }

        const expiresDate = new Date(expiresString);

        if (expiresDate < dateNow) {
          return reject(new Error(ERROR_TOKEN_EXPIRED));
        }

        if (!bcrypt.compareSync(verificationToken, token)) {
          return reject(new Error(ERROR_TOKEN_INVALID));
        }

        return resolve({
          identifier: email,
          token,
          expires: expiresDate,
        });
      })
      .catch((error) => {
        logger.error(DEBUG_ID, error);
        reject(error);
      })
  );
};
