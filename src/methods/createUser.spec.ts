import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import {jest} from '@jest/globals';
import bcrypt from 'bcrypt';
import {AppOptions} from 'next-auth';
import {Profile} from 'next-auth/adapters';
// @ts-ignore declaration file
import logger from 'next-auth/dist/lib/logger';
import {mocked} from 'ts-jest/utils';

import {dynamoDBAdapterFactory} from '../../__tests__/dynamoDBAdapterFactory';
import {mockUser} from '../../__tests__/mockUser';
import {DynamoDBAdapter} from '../DynamoDBAdapter';

import {isEmailProfile} from './createUser';

jest.mock('bcrypt');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('next-auth/dist/lib/logger');

const mockProfile: Profile = {
  id: '1ab2c3d4',
  ...mockUser,
};

const mockHashFunction = mocked(bcrypt.hash);
const mockCompareFunction = mocked(bcrypt.compareSync);
const mockDeleteItem = mocked(DeleteItemCommand);
const mockGetItem = mocked(GetItemCommand);
const mockPutItem = mocked(PutItemCommand);

beforeEach(() => {
  mocked(logger.debug).mockClear();
  mockHashFunction.mockClear();
  mockCompareFunction.mockClear();
  mockDeleteItem.mockClear();
  mockGetItem.mockClear();
  mockPutItem.mockClear();
});

afterEach(() => {
  mocked(DynamoDBClient.prototype.send).mockRestore();
});

afterAll(() => {
  mockHashFunction.mockRestore();
  mockCompareFunction.mockRestore();
  mockDeleteItem.mockRestore();
  mockGetItem.mockRestore();
  mockPutItem.mockRestore();
});

describe('createUser', () => {
  const createUserFactory = (
    profile:
      | Profile
      | {readonly emailVerified?: Date; readonly email: string} = mockProfile
  ) =>
    dynamoDBAdapterFactory().then((adapter) =>
      adapter.createUser(profile as Profile)
    );

  it('should type guard EmailProfile type', () => {
    const {email} = mockProfile;

    expect(isEmailProfile(mockProfile)).toBe(false);
    expect(isEmailProfile({email})).toBe(true);
  });

  it('should resolve and stop execution when usersTable name was not provided', async () => {
    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({});

    const adapter = await new DynamoDBAdapter(
      {region: 'us-east-1'},
      {usersTable: undefined}
    ).getAdapter({debug: false} as AppOptions);

    const result = await adapter.createUser(mockProfile);

    expect(mockPutItem).not.toBeCalled();
    expect(result).toStrictEqual(mockUser);
  });

  it('should resolve with a User for passwordless email sign in', async () => {
    const {email} = mockProfile;
    const emailVerified = new Date();
    const name = email?.split('@')[0];

    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({});
    const result = await createUserFactory({
      email: email as string,
      emailVerified,
    });

    expect(mockPutItem).toBeCalledTimes(1);
    expect(mockPutItem).toBeCalledWith({
      Item: {
        email: {S: email},
        emailVerified: {S: emailVerified.toISOString()},
        id: {S: email},
        image: {NULL: true},
        name: {S: name},
      },
      TableName: 'usersTable',
    });
    expect(result).toStrictEqual({
      email,
      image: null,
      name,
    });
  });

  it('should resolve with a User for normal sign in', async () => {
    const {email, id, image, name} = mockProfile;

    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({});
    const result = await createUserFactory();

    expect(mockPutItem).toBeCalledTimes(1);
    expect(mockPutItem).toBeCalledWith({
      Item: {
        email: {S: email},
        emailVerified: {NULL: true},
        id: {S: id},
        image: {S: image},
        name: {S: name},
      },
      TableName: 'usersTable',
    });
    expect(result).toStrictEqual(mockUser);
  });

  it('should call put item with NULL values for not provided user fields', async () => {
    const {id, name} = mockProfile;

    // @ts-ignore not assignable to type 'never'
    mocked(DynamoDBClient.prototype.send).mockResolvedValue({});
    const result = await createUserFactory({
      id,
      name,
      email: null,
    });

    expect(mockPutItem).toBeCalledTimes(1);
    expect(mockPutItem).toBeCalledWith({
      Item: {
        email: {NULL: true},
        emailVerified: {NULL: true},
        id: {S: id},
        image: {NULL: true},
        name: {S: name},
      },
      TableName: 'usersTable',
    });
    expect(result).toStrictEqual({
      email: null,
      image: undefined,
      name,
    });
  });

  it('should be able to catch an Error and reject with it', async () => {
    const ERROR_MESSAGE = 'mock error message';

    mocked(DynamoDBClient.prototype.send).mockRejectedValue(
      // @ts-ignore
      new Error(ERROR_MESSAGE)
    );

    const promise = createUserFactory();

    await expect(promise).rejects.toThrowError(ERROR_MESSAGE);
  });
});
