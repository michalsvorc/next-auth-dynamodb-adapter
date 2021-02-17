# DynamoDB adapter for [NextAuth.js](https://next-auth.js.org)

## Overview

### Features

- [passwordless email sign in](https://next-auth.js.org/configuration/providers#sign-in-with-email)
- users table: saves user object on successful sign in with any provider
- stateless sessions
- AWS SDK v3 client

### Data persistance

This adapter implements database persistance only for selected [adapter methods](https://next-auth.js.org/tutorials/creating-a-database-adapter#required-methods):
- createUser
- createVerificationRequest
- getVerificationRequest
- deleteVerificationRequest

### Database sessions

Database sessions are not implemented, this adapter relies on usage of JSON Web Tokens for stateless [session management](https://next-auth.js.org/configuration/options#session).

### Notice

This package is not supported by or affiliated with the  project. Visit community supported [NextAuth.js adapters](https://github.com/nextauthjs/adapters) if this adapter does not meet your requirements.

## Installation

### Base package

Install the base [next-auth](https://github.com/nextauthjs/next-auth#getting-started) package.

### Adapter

#### yarn
```console
$ yarn add next-auth-dynamodb-adapter
```

#### npm
```console
$ npm install next-auth-dynamodb-adapter
```

## Usage

```js
import NextAuth from 'next-auth';
import Providers from 'next-auth/providers'
import {DynamoDBAdapter} from 'next-auth-dynamodb-adapter';

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    // ...add providers here
  ],
  session: {
    // Use JSON Web Tokens for session instead of database sessions.
    jwt: true,
  },
  adapter: new DynamoDBAdapter(
    {
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    },
    {
      usersTable: 'Users',
      verificationRequestsTable: 'VerificationRequests',
    }
  ),
  debug: process.env.NODE_ENV !== 'production'
})
```

## Configuration

`DynamoDBAdapter` class instance takes two initialization objects:

```js
new DynamoDBAdapter(DynamoDBClientConfig, TableNameOptions)
```

### DynamoDBClientConfig

DynamoDB client [configuration object](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/globals.html#dynamodbclientconfig).

`Credentials` AWS account must have read/write permissions to tables specified in the `TableNameOptions`.

### TableNameOptions

All properties are optional. Tables must exist before use.

If you do not specify a table name property, the associated authentication data will not be persisted and you don't need to create that table.

#### usersTable

Stores user object after successful sign in.

- `partition key`: id (String)

#### verificationRequestsTable

Stores passwordless email sign in verification requests, one token for one email address at a time.

- `partition key`: email (String)

## Debug option

Turn debug logger off for the production environment as the output might contain user information and verification tokens.

## License

MIT
