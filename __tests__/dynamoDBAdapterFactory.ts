import {AppOptions, User} from 'next-auth';
import {
  AdapterInstance,
  Profile,
  Session,
  VerificationRequest,
} from 'next-auth/adapters';

import {DynamoDBAdapter} from '../src/DynamoDBAdapter';

export const dynamoDBAdapterFactory = (
  {debug} = {debug: false}
): Promise<AdapterInstance<User, Profile, Session, VerificationRequest>> =>
  new DynamoDBAdapter(
    {region: 'us-east-1'},
    {
      usersTable: 'usersTable',
      verificationRequestsTable: 'verificationRequests',
    }
  ).getAdapter({debug} as AppOptions);
