import {jest} from '@jest/globals';
import {Profile} from 'next-auth/adapters';

import {dynamoDBAdapterFactory} from '../__tests__/dynamoDBAdapterFactory';
import {mockUser} from '../__tests__/mockUser';

import {loggerFactory, mockSession} from './DynamoDBAdapter';

jest.mock('bcrypt');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('next-auth/dist/lib/logger');

const mockProfile: Profile = {
  id: '1ab2c3d4',
  ...mockUser,
};

describe('logger', () => {
  it('should output debug logs when debug option is true', async () => {
    const logger = loggerFactory({debug: true});

    expect(logger.debug('test')).toBeUndefined();
  });

  it('should output null when debug option is false', async () => {
    const logger = loggerFactory({debug: false});

    expect(logger.debug('test')).toBeNull();
  });
});

describe('getUser (not implemented)', () => {
  it('should resolve with a User or null', async () => {
    const adapter = await dynamoDBAdapterFactory();
    const result = await adapter.getUser(mockProfile.id);

    expect(result).toBeNull();
  });
});

describe('getUserByEmail (not implemented)', () => {
  it('should resolve with a User or null', async () => {
    const adapter = await dynamoDBAdapterFactory();
    const result = await adapter.getUserByEmail(mockUser.email);

    expect(result).toBeNull();
  });
});

describe('getUserByProviderAccountId (not implemented)', () => {
  const PROVIDER_ID = 'mockProviderId';
  const PROVIDER_ACCOUNT_ID = 'mockProviderAccountId';

  it('should resolve with a User or null', async () => {
    const adapter = await dynamoDBAdapterFactory();
    const result = await adapter.getUserByProviderAccountId(
      PROVIDER_ID,
      PROVIDER_ACCOUNT_ID
    );

    expect(result).toBeNull();
  });
});

describe('updateUser (not implemented)', () => {
  it('should resolve with a User', async () => {
    const adapter = await dynamoDBAdapterFactory();
    const result = await adapter.updateUser(mockUser);

    expect(result).toStrictEqual(mockUser);
  });
});

describe('linkAccount (not implemented)', () => {
  const ACCESS_TOKEN = 'mockAccessToken';
  const ACCESS_TOKEN_EXPIRES = 60;
  const PROVIDER_ACCOUNT_ID = 'mockProviderAccountId';
  const PROVIDER_ID = 'mockProviderId';
  const PROVIDER_TYPE = 'mockProviderType';
  const REFRESH_TOKEN = 'mockRefreshToken';

  it('should resolve with void', async () => {
    const adapter = await dynamoDBAdapterFactory();
    const result = await adapter.linkAccount(
      mockProfile.id,
      PROVIDER_ID,
      PROVIDER_TYPE,
      PROVIDER_ACCOUNT_ID,
      REFRESH_TOKEN,
      ACCESS_TOKEN,
      ACCESS_TOKEN_EXPIRES
    );

    expect(result).toBeUndefined();
  });
});

describe('createSession (not implemented)', () => {
  it('should resolve with a Session', async () => {
    const adapter = await dynamoDBAdapterFactory();
    const result = await adapter.createSession(mockUser);

    expect(result).toBe(mockSession);
  });
});

describe('getSession (not implemented)', () => {
  const SESSION_TOKEN = 'mockSessionToken';

  it('should resolve with a Session', async () => {
    const adapter = await dynamoDBAdapterFactory();
    const result = await adapter.getSession(SESSION_TOKEN);

    expect(result).toBe(mockSession);
  });
});

describe('updateSession (not implemented)', () => {
  const FORCE_FLAG = false;

  it('should resolve with a Session', async () => {
    const adapter = await dynamoDBAdapterFactory();
    const result = await adapter.updateSession(mockSession, FORCE_FLAG);

    expect(result).toBe(mockSession);
  });
});

describe('deleteSession (not implemented)', () => {
  const SESSION_TOKEN = 'mockSessionToken';

  it('should resolve with void', async () => {
    const adapter = await dynamoDBAdapterFactory();
    const result = await adapter.deleteSession(SESSION_TOKEN);

    expect(result).toBeUndefined();
  });
});
