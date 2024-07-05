## Prerequisites

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js 20](https://nodejs.org/) (as required per package.json)
- [Ember CLI](https://cli.emberjs.com/release/)
- [Docker](https://www.docker.com) for (mocked) backend

## Installation

- `git clone <repository-url>` this repository
- `cd frontend`
- `npm install` to install all required Node dependencies

## Running / Development

- Copy configuration file for environment variables: `cp .env .env-custom`
- In `.env-custom`: change value of `AUTH0_ENABLED` to _false_ (such that no login is required)
- Start the application: `npm run dev`
- (Update mocked backend stack: `cd .dev && docker compose pull`)
- Start mocked backend: `cd .dev && docker compose up -d`
- Open frontend at [http://localhost:4200](http://localhost:4200)

### IDE Setup

- We use Visual Studio Code (VSC)
- We recommend to install the [Ember.js Extension Pack](https://marketplace.visualstudio.com/items?itemName=EmberTooling.emberjs)
- Husky enables pre-commit hooks for linting and testing, see [Husky Documentation](https://typicode.github.io/husky/get-started.html) for more details. The pre-commit hooks can be configured in `.husky/pre-commit`

### Ember.js

We use Ember.js as a frontend framework.
The [documentation of Ember.js](https://guides.emberjs.com/release/getting-started/quick-start/) is a good starting point to get to know Ember.js.
For instance, the documentation explains how to make use of the many generators for code (try `ember help generate` for more details).

### Linting and Tests

- Run `ember test` or `ember test --server` to run all tests
- Run `npm run lint` to check linting
- `npm run lint:fix` also tries to fix any linting errors automatically
- The code formatting and tests are also checked in our Gitlab CI/CD pipeline

### Building

- `ember build --prod`
- For a given Docker tag `X`: `docker build --no-cache -t explorviz/explorviz-frontend:X`
