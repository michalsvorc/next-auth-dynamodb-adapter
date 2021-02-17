import {DeleteItemCommand, DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {jest} from '@jest/globals';
import {AppOptions} from 'next-auth';
import {EmailSessionProvider} from 'next-auth/adapters';
// @ts-ignore declaration file
import logger from 'next-auth/dist/lib/logger';
import {mocked} from 'ts-jest/utils';

import {dynamoDBAdapterFactory} from '../../__tests__/dynamoDBAdapterFactory';
import {mockUser} from '../../__tests__/mockUser';
import {DynamoDBAdapter} from '../DynamoDBAdapter';

jest.mock('bcrypt');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('next-auth/dist/lib/logger');

const mockDeleteItem = mocked(DeleteItemCommand);

beforeEach(() => {
  mocked(logger.debug).mockClear();
  mockDeleteItem.mockClear();
});

afterEach(() => {
  mocked(DynamoDBClient.prototype.send).mockRestore();
});

afterAll(() => {
  mockDeleteItem.mockRestore();
});
const VERIFICATION_TOKEN = 'mockVerificationToken';

const {email} = mockUser;
const sendVerificationRequest = jest.fn(() => Promise.resolve());

mockDeleteItem.mockImplementation(jest.fn());

const deleteVerificationRequestFactory = () => {
  return dynamoDBAdapterFactory().then((adapter) =>
    adapter.deleteVerificationRequest?.(email, VERIFICATION_TOKEN, 'secret', ({
      sendVerificationRequest,
      maxAge: 60,
    } as unknown) as EmailSessionProvider)
  );
};

describe('deleteVerificationRequest', () => {
  it('should reject with an Error when verificationRequestsTable name was not provided', async () => {
    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({});

    const adapter = await new DynamoDBAdapter(
      {region: 'us-east-1'},
      {verificationRequestsTable: undefined}
    ).getAdapter({debug: false} as AppOptions);

    const promise = adapter.deleteVerificationRequest?.(
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
    expect(mockDeleteItem).not.toBeCalled();
    await expect(promise).rejects.toThrowError();
  });

  it('should resolve with void', async () => {
    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({});

    const adapter = await dynamoDBAdapterFactory();
    const result = await adapter.deleteVerificationRequest?.(
      email,
      VERIFICATION_TOKEN,
      'secret',
      ({
        sendVerificationRequest,
        maxAge: 60,
      } as unknown) as EmailSessionProvider
    );

    expect(mockDeleteItem).toBeCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it('should be able to catch an Error and reject with it', async () => {
    const ERROR_MESSAGE = 'mock error message';
    mocked(DynamoDBClient.prototype.send).mockImplementationOnce(
      jest.fn(() => Promise.reject(new Error(ERROR_MESSAGE)))
    );

    const promise = deleteVerificationRequestFactory();

    await expect(promise).rejects.toThrowError(ERROR_MESSAGE);
  });
});
