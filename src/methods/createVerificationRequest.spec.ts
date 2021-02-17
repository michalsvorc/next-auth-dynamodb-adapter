import {DynamoDBClient, PutItemCommand} from '@aws-sdk/client-dynamodb';
import {jest} from '@jest/globals';
import bcrypt from 'bcrypt';
import {AppOptions} from 'next-auth';
import {EmailSessionProvider} from 'next-auth/adapters';
// @ts-ignore declaration file
import logger from 'next-auth/dist/lib/logger';
import {mocked} from 'ts-jest/utils';

import {dynamoDBAdapterFactory} from '../../__tests__/dynamoDBAdapterFactory';
import {mockUser} from '../../__tests__/mockUser';
import {DynamoDBAdapter, VERIFICATION_TOKEN_MAX_AGE} from '../DynamoDBAdapter';

jest.mock('bcrypt');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('next-auth/dist/lib/logger');

const mockHashFunction = mocked(bcrypt.hash);
const mockCompareFunction = mocked(bcrypt.compareSync);
const mockPutItem = mocked(PutItemCommand);

beforeEach(() => {
  mocked(logger.debug).mockClear();
  mockHashFunction.mockClear();
  mockCompareFunction.mockClear();
  mockPutItem.mockClear();
});

afterEach(() => {
  mocked(DynamoDBClient.prototype.send).mockRestore();
});

afterAll(() => {
  mockHashFunction.mockRestore();
  mockCompareFunction.mockRestore();
  mockPutItem.mockRestore();
});

describe('createVerificationRequest', () => {
  const MAX_AGE = 60;
  const SECRET = 'mockSecret';
  const TOKEN = 'mockToken';
  const URL = 'https://mock.com';

  const {email} = mockUser;
  const sendVerificationRequest = jest.fn(() => Promise.resolve());

  const createVerificationRequestFactory = () => {
    return dynamoDBAdapterFactory().then((adapter) => {
      return adapter.createVerificationRequest?.(
        email,
        URL,
        TOKEN,
        SECRET,
        ({
          sendVerificationRequest,
          maxAge: MAX_AGE,
        } as unknown) as EmailSessionProvider,
        {} as AppOptions
      );
    });
  };

  mockHashFunction.mockResolvedValue('mockHashedToken');
  mockPutItem.mockImplementation(jest.fn());

  beforeEach(() => {
    sendVerificationRequest.mockClear();
  });

  afterAll(() => {
    sendVerificationRequest.mockRestore();
  });

  it('should reject with an Error when verificationRequestsTable name was not provided', async () => {
    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({});

    const adapter = await new DynamoDBAdapter(
      {region: 'us-east-1'},
      {verificationRequestsTable: undefined}
    ).getAdapter({debug: false} as AppOptions);

    const promise = adapter.createVerificationRequest?.(
      email,
      URL,
      TOKEN,
      SECRET,
      ({
        sendVerificationRequest,
        maxAge: MAX_AGE,
      } as unknown) as EmailSessionProvider,
      {} as AppOptions
    );

    // @ts-ignore possibly undefined
    await promise.catch((_error) => null);

    expect.hasAssertions();
    expect(mockPutItem).not.toBeCalled();

    await expect(promise).rejects.toThrowError();
  });

  it('should call hashing function on the token', async () => {
    const SALT_ROUNDS = 10;
    await createVerificationRequestFactory();

    expect.hasAssertions();
    expect(mockHashFunction).toBeCalledWith(TOKEN, SALT_ROUNDS);
    expect(mockHashFunction).toBeCalledTimes(1);
  });

  it('should call client put item method', async () => {
    await createVerificationRequestFactory();

    expect.hasAssertions();
    expect(mockPutItem).toBeCalledTimes(1);
    expect(mockPutItem).toBeCalledWith(
      expect.objectContaining({
        TableName: 'verificationRequests',
        Item: {
          expires: {S: expect.any(String)},
          email: {S: email},
          token: {S: expect.any(String)},
        },
      })
    );
  });

  it('should call passed sendVerificationRequest callback', async () => {
    await createVerificationRequestFactory();

    expect(sendVerificationRequest).toBeCalledTimes(1);
    expect(sendVerificationRequest).toBeCalledWith(
      expect.objectContaining({
        identifier: email,
        url: URL,
        token: TOKEN,
      })
    );
  });

  describe('token validity expiration', () => {
    beforeAll(() => {
      jest.useFakeTimers('modern');
      jest.setSystemTime(new Date('2000-12-30T00:12:00.000Z').getTime());
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should calculate token expiration Date from passed argument', async () => {
      const result = await createVerificationRequestFactory();

      expect(result?.expires).toStrictEqual(
        new Date(Date.now() + MAX_AGE * 1000)
      );
    });

    it('should calculate token expiration Date from default argument value', async () => {
      const adapter = await dynamoDBAdapterFactory();
      const result = await adapter.createVerificationRequest?.(
        email,
        URL,
        TOKEN,
        SECRET,
        ({
          sendVerificationRequest,
        } as unknown) as EmailSessionProvider,
        {} as AppOptions
      );

      expect(result?.expires).toStrictEqual(
        new Date(Date.now() + VERIFICATION_TOKEN_MAX_AGE * 1000)
      );
    });
  });

  it('should resolve with a VerificationRequest', async () => {
    const promise = createVerificationRequestFactory();

    await expect(promise).resolves.toMatchObject(
      expect.objectContaining({
        identifier: email,
        token: TOKEN,
        expires: expect.any(Date),
      })
    );
  });

  it('should be able to catch an Error and reject with it', async () => {
    const ERROR_MESSAGE = 'mock error message';
    mocked(mockHashFunction).mockRejectedValue(new Error(ERROR_MESSAGE));

    const promise = createVerificationRequestFactory();

    await expect(promise).rejects.toThrowError(ERROR_MESSAGE);
  });
});
