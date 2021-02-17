import {DynamoDBClient, GetItemCommand} from '@aws-sdk/client-dynamodb';
import {jest} from '@jest/globals';
import bcrypt from 'bcrypt';
import {AppOptions} from 'next-auth';
import {EmailSessionProvider} from 'next-auth/adapters';
// @ts-ignore declaration file
import logger from 'next-auth/dist/lib/logger';
import {mocked} from 'ts-jest/utils';

import {dynamoDBAdapterFactory} from '../../__tests__/dynamoDBAdapterFactory';
import {mockUser} from '../../__tests__/mockUser';
import {
  DynamoDBAdapter,
  ERROR_TOKEN_EXPIRED,
  ERROR_TOKEN_EXPIRED_DATE_FORMAT,
  ERROR_TOKEN_INVALID,
} from '../DynamoDBAdapter';

jest.mock('bcrypt');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('next-auth/dist/lib/logger');

const mockHashFunction = mocked(bcrypt.hash);
const mockCompareFunction = mocked(bcrypt.compareSync);
const mockGetItem = mocked(GetItemCommand);

beforeEach(() => {
  mocked(logger.debug).mockClear();
  mockHashFunction.mockClear();
  mockCompareFunction.mockClear();
  mockGetItem.mockClear();
});

afterEach(() => {
  mocked(DynamoDBClient.prototype.send).mockRestore();
});

afterAll(() => {
  mockHashFunction.mockRestore();
  mockCompareFunction.mockRestore();
  mockGetItem.mockRestore();
});

describe('getVerificationRequest', () => {
  const TOKEN = 'mockToken';
  const VERIFICATION_TOKEN = 'mockVerificationToken';

  const {email} = mockUser;
  const sendVerificationRequest = jest.fn(() => Promise.resolve());

  beforeEach(() => {
    mockCompareFunction.mockReturnValue(true);
    sendVerificationRequest.mockClear();
  });

  const getVerificationRequestFactory = () => {
    return dynamoDBAdapterFactory().then((adapter) => {
      return adapter.getVerificationRequest?.(
        email,
        VERIFICATION_TOKEN,
        'secret',
        ({
          sendVerificationRequest,
          maxAge: 60,
        } as unknown) as EmailSessionProvider
      );
    });
  };

  it('should reject with an Error when verificationRequestsTable name was not provided', async () => {
    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({});

    const adapter = await new DynamoDBAdapter(
      {region: 'us-east-1'},
      {verificationRequestsTable: undefined}
    ).getAdapter({debug: false} as AppOptions);

    const promise = adapter.getVerificationRequest?.(
      email,
      VERIFICATION_TOKEN,
      'secret',
      ({
        sendVerificationRequest,
        maxAge: 60,
      } as unknown) as EmailSessionProvider
    );

    // @ts-ignore possibly undefined
    await promise.catch((_error) => null);

    expect.hasAssertions();
    expect(mockGetItem).not.toBeCalled();
    await expect(promise).rejects.toThrowError();
  });

  it('should resolve with null when retrieving token value from DB failed', async () => {
    const Item = {
      expires: {S: new Date().toISOString()},
    };

    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({Item});

    const result = await getVerificationRequestFactory();

    expect(mockGetItem).toBeCalledTimes(1);
    expect(result).toBeNull();
  });

  it('should resolve with null when retrieving expires value from DB failed', async () => {
    const Item = {
      token: {S: TOKEN},
    };

    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({Item});

    const result = await getVerificationRequestFactory();

    expect(mockGetItem).toBeCalledTimes(1);
    expect(result).toBeNull();
  });

  it('should reject with an Error and delete DB record when expires value is past current date', async () => {
    const Item = {
      expires: {S: new Date(Date.now() - 60).toISOString()},
      token: {S: TOKEN},
    };

    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({Item});

    const promise = getVerificationRequestFactory();

    await promise.catch((_error) => null);

    expect(mockGetItem).toBeCalledTimes(1);

    await expect(promise).rejects.toThrowError(ERROR_TOKEN_EXPIRED);
  });

  it('should reject with an Error and delete DB record when expires value can not be parsed as a Date', async () => {
    const Item = {
      expires: {S: 'not a date'},
      token: {S: TOKEN},
    };

    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({Item});

    const promise = getVerificationRequestFactory();

    await promise.catch((_error) => null);

    expect(mockGetItem).toBeCalledTimes(1);

    await expect(promise).rejects.toThrowError(ERROR_TOKEN_EXPIRED_DATE_FORMAT);
  });

  it('should reject with an Error and delete DB record when token verification failed', async () => {
    const Item = {
      expires: {S: new Date(Date.now() + 5000).toISOString()},
      token: {S: TOKEN},
    };

    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({Item});
    mocked(mockCompareFunction).mockReturnValue(false);

    const promise = getVerificationRequestFactory();

    await promise.catch((_error) => null);

    expect(mockCompareFunction).toBeCalledTimes(1);
    expect(mockGetItem).toBeCalledTimes(1);
    await expect(promise).rejects.toThrowError(ERROR_TOKEN_INVALID);
  });

  it('should resolve with a VerificationRequest', async () => {
    const tokenExpiresString = new Date(Date.now() + 5000).toISOString();

    const Item = {
      expires: {S: tokenExpiresString},
      token: {S: TOKEN},
    };

    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({Item});

    const adapter = await dynamoDBAdapterFactory();
    const result = await adapter.getVerificationRequest?.(
      email,
      VERIFICATION_TOKEN,
      'secret',
      ({
        sendVerificationRequest,
        maxAge: 60,
      } as unknown) as EmailSessionProvider
    );

    expect(mockGetItem).toBeCalledTimes(1);
    expect(result).toStrictEqual({
      expires: new Date(tokenExpiresString),
      identifier: email,
      token: TOKEN,
    });
  });

  it('should be able to catch an Error and reject with it', async () => {
    const ERROR_MESSAGE = 'mock error message';

    mocked(DynamoDBClient.prototype.send).mockImplementationOnce(
      jest.fn(() => Promise.reject(new Error(ERROR_MESSAGE)))
    );

    const promise = getVerificationRequestFactory();

    await expect(promise).rejects.toThrowError(ERROR_MESSAGE);
  });
});
