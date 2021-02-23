# DynamoDB adapter for [NextAuth.js](https://next-auth.js.org)

## Overview

### Features

- supports [passwordless email sign in](https://next-auth.js.org/configuration/providers#sign-in-with-email)
- saves user object to users table
- stateless sessions only
- AWS SDK v3 client

### Database sessions

Database sessions are not implemented, this adapter relies on usage of JSON Web Tokens for stateless [session management](https://next-auth.js.org/configuration/options#session).

### Notice

This package is not supported by the [NextAuth.js](https://next-auth.js.org). Visit the community supported NextAuth.js [adapters repository](https://github.com/nextauthjs/adapters) if this package does not meet your requirements.

## Installation

### Base package

Install the [next-auth](https://github.com/nextauthjs/next-auth#getting-started) package.

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
  // Configure one or more authentication providers.
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
  // Turn debug logger off for the production environment, the output might contain user information and verification tokens.
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

AWS account passed to the `credentials` property must have read/write access to `TableNameOptions` tables.

### TableNameOptions

Specify a table name (*String*). Table with that name and correct partition key must exist in your AWS account.

#### usersTable

- optional
- partition key: `id` (*String*)
- description: stores user object after successful sign in.

#### verificationRequestsTable

- optional
- partition key: `email` (*String*)
- description: stores passwordless email sign in verification requests, one token for one email address at a time.

## License

MIT
