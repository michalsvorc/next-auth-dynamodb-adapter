import {DynamoDBClient, DynamoDBClientConfig} from '@aws-sdk/client-dynamodb';
import {AppOptions, User} from 'next-auth';
import {
  Adapter,
  AdapterInstance,
  Profile,
  Session,
  VerificationRequest,
} from 'next-auth/adapters';
import logger from 'next-auth/dist/lib/logger';

import {createUser} from './methods/createUser';
import {createVerificationRequest} from './methods/createVerificationRequest';
import {deleteVerificationRequest} from './methods/deleteVerificationRequest';
import {getVerificationRequest} from './methods/getVerificationRequest';

export class DynamoDBAdapterInstance
  implements AdapterInstance<User, Profile, Session, VerificationRequest> {
  private readonly _appOptions: AppOptions;
  private readonly _client: DynamoDBClient;
  private readonly _tableOptions: TableOptions;
  private readonly _logger: LoggerMethod;
  readonly createVerificationRequest: ReturnType<
    typeof createVerificationRequest
  >;
  readonly getVerificationRequest: ReturnType<typeof getVerificationRequest>;
  readonly createUser: ReturnType<typeof createUser>;
  readonly deleteVerificationRequest: ReturnType<
    typeof deleteVerificationRequest
  >;

  constructor({
    appOptions,
    clientOptions,
    tableOptions,
  }: {
    readonly appOptions: AppOptions;
    readonly clientOptions: DynamoDBClientConfig;
    readonly tableOptions: TableOptions;
  }) {
    this._appOptions = appOptions;
    this._client = new DynamoDBClient(clientOptions);
    this._tableOptions = tableOptions;

    const {debug} = appOptions;

    this._logger = loggerFactory({debug});

    const methodOptions = {
      client: this._client,
      logger: this._logger,
      tableOptions: this._tableOptions,
    };

    this.createVerificationRequest = createVerificationRequest({
      ...methodOptions,
      appOptions: this._appOptions,
    });

    this.getVerificationRequest = getVerificationRequest(methodOptions);

    this.createUser = createUser(methodOptions);

    this.deleteVerificationRequest = deleteVerificationRequest(methodOptions);
  }

  readonly getUser = (id: string): Promise<User | null> => {
    this._logger.debug('getUser (not implemented)', [id]);

    return Promise.resolve(null);
  };

  readonly getUserByEmail = (email: string): Promise<User | null> => {
    this._logger.debug('getUserByEmail (not implemented)', [email]);

    return Promise.resolve(null);
  };

  readonly getUserByProviderAccountId = (
    providerId: string,
    providerAccountId: string
  ): Promise<User | null> => {
    this._logger.debug('getUserByProviderAccountId (not implemented)', [
      providerId,
      providerAccountId,
    ]);

    return Promise.resolve(null);
  };

  readonly updateUser = (user: User): Promise<User> => {
    this._logger.debug('updateUser (not implemented)', [user]);

    return Promise.resolve(user);
  };

  readonly linkAccount = (
    userId: string,
    _providerId: string,
    _providerType: string,
    _providerAccountId: string,
    _refreshToken: string,
    _accessToken: string,
    _accessTokenExpires: number
  ): Promise<void> => {
    this._logger.debug('linkAccount (not implemented)', [userId]);

    return Promise.resolve();
  };

  readonly createSession = (user: User): Promise<Session> => {
    this._logger.debug('createSession (not implemented)', [user]);

    return Promise.resolve(mockSession);
  };

  readonly getSession = (sessionToken: string): Promise<Session | null> => {
    this._logger.debug('getSession (not implemented)', [sessionToken]);

    return Promise.resolve(mockSession);
  };

  readonly updateSession = (
    session: Session,
    _force?: boolean
  ): Promise<Session> => {
    this._logger.debug('updateSession (not implemented)', [session]);

    return Promise.resolve(mockSession);
  };

  readonly deleteSession = (sessionToken: string): Promise<void> => {
    this._logger.debug('deleteSession (not implemented)', [sessionToken]);

    return Promise.resolve();
  };
}

export class DynamoDBAdapter
  implements Adapter<User, Profile, Session, VerificationRequest> {
  private readonly _clientOptions: DynamoDBClientConfig;
  private readonly _tableOptions: TableOptions;

  constructor(clientOptions: DynamoDBClientConfig, tableOptions: TableOptions) {
    this._clientOptions = clientOptions;
    this._tableOptions = tableOptions;
  }

  getAdapter(
    appOptions: AppOptions
  ): Promise<AdapterInstance<User, Profile, Session, VerificationRequest>> {
    return Promise.resolve(
      new DynamoDBAdapterInstance({
        appOptions: appOptions,
        clientOptions: this._clientOptions,
        tableOptions: this._tableOptions,
      })
    );
  }
}

export interface TableOptions {
  readonly verificationRequestsTable?: string;
  readonly usersTable?: string;
}

export interface LoggerMethod {
  readonly error: typeof logger.error;
  readonly info: typeof logger.info;
  readonly debug: typeof logger.debug | (() => null);
}

export const loggerFactory = ({
  debug,
}: {
  readonly debug: boolean;
}): LoggerMethod => ({
  error: logger.error,
  info: logger.info,
  debug: debug ? logger.debug : () => null,
});

export const mockSession = {
  userId: 'mockUserId',
  expires: new Date(),
  sessionToken: 'mockSessionToken',
  accessToken: 'mockAccessToken',
};

export const VERIFICATION_TOKEN_MAX_AGE = 86400;
export const ERROR_TOKEN_EXPIRED =
  'Invalid token expiration date, request new verification email.';
export const ERROR_TOKEN_EXPIRED_DATE_FORMAT =
  'Token expiration is not Date object';
export const ERROR_TOKEN_INVALID = 'Invalid token signature.';
