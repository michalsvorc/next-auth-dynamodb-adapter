import {DeleteItemCommand} from '@aws-sdk/client-dynamodb';
import {SessionProvider} from 'next-auth/client';

import {DynamoDBAdapterInstance} from '../DynamoDBAdapter';

export const deleteVerificationRequest = ({
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
): Promise<void> => {
  const DEBUG_ID = 'deleteVerification';

  logger.debug(DEBUG_ID, email, verificationToken);

  const {verificationRequestsTable} = tableOptions;

  if (!verificationRequestsTable) {
    return Promise.reject(
      new Error('verificationRequestsTable name was not provided')
    );
  }

  const ItemCommandInput = {
    TableName: verificationRequestsTable,
    Key: {
      email: {S: email},
    },
  };

  return new Promise((resolve, reject) =>
    client
      .send(new DeleteItemCommand(ItemCommandInput))
      .then((_clientResponse) => resolve())
      .catch((error) => {
        logger.error(DEBUG_ID, error);
        reject(error);
      })
  );
};
