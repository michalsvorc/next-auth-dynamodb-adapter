import {PutItemCommand} from '@aws-sdk/client-dynamodb';
import {User} from 'next-auth';
import {Profile} from 'next-auth/adapters';

import {DynamoDBAdapterInstance} from '../DynamoDBAdapter';

export const createUser = ({
  client,
  logger,
  tableOptions,
}: {
  readonly client: DynamoDBAdapterInstance['_client'];
  readonly logger: DynamoDBAdapterInstance['_logger'];
  readonly tableOptions: DynamoDBAdapterInstance['_tableOptions'];
}) => (profile: Profile | EmailProfile): Promise<User> => {
  // TODO
  const DEBUG_ID = 'createUser';

  logger.debug(DEBUG_ID, profile);

  const {usersTable} = tableOptions;

  const {email} = profile;

  const emailVerified = !isEmailProfile(profile)
    ? null
    : profile?.emailVerified;
  const name = !isEmailProfile(profile)
    ? profile.name
    : (email as string).split('@')[0];
  const id = !isEmailProfile(profile) ? profile?.id : (email as string);
  const image = !isEmailProfile(profile) ? profile?.image : null;

  const user = {
    email,
    image,
    name,
  };

  if (!usersTable) {
    logger.debug(DEBUG_ID, 'userTable name was not provided');
    return Promise.resolve(user);
  }

  return new Promise((resolve, reject) =>
    client
      .send(
        new PutItemCommand({
          TableName: usersTable,
          Item: {
            email: email ? {S: email} : {NULL: true},
            emailVerified: emailVerified
              ? {S: emailVerified.toISOString()}
              : {NULL: true},
            id: {S: id},
            image: image ? {S: image} : {NULL: true},
            name: {S: name},
          },
        })
      )
      .then((clientResponse) => {
        logger.debug(DEBUG_ID, JSON.stringify({clientResponse}));
        return resolve(user);
      })
      .catch((error) => {
        logger.error(DEBUG_ID, error);
        reject(error);
      })
  );
};

export type EmailProfile = Pick<Profile, 'email'> & {
  readonly emailVerified?: Date;
};

export const isEmailProfile = (
  profile: Profile | EmailProfile
): profile is EmailProfile => {
  return !('id' in profile) && 'email' in profile;
};
