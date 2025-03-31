## Prerequisites

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js 20](https://nodejs.org/) (as required per package.json)
- [Docker](https://www.docker.com) for (mocked) backend

## Installation

- `git clone <repository-url>` this repository
- `cd frontend`
- `pnpm install` to install all required Node dependencies

## Running / Development

- Start the application with custom env file: `pnpm run dev`
- (Update mocked backend stack: `cd .dev && docker compose pull`)
- Start mocked backend: `cd .dev && docker compose up -d`
- Open frontend at [http://localhost:4200](http://localhost:4200)

### IDE Setup

- We use Visual Studio Code (VSC)
- We recommend to install the [Ember.js Extension Pack](https://marketplace.visualstudio.com/items?itemName=EmberTooling.emberjs)
- Husky enables pre-commit hooks for linting and testing, see [Husky Documentation](https://typicode.github.io/husky/get-started.html) for more details. The pre-commit hooks can be configured in `.husky/pre-commit`

### React

We use React as a frontend library with various package such as react-router, Zustand and so on.

### Linting and Tests

- Run `pnpm dlx eslint` to check linting
- The code formatting and tests are also checked in our Gitlab CI/CD pipeline

### Building

- `vite build`
- For a given Docker tag `X`: `docker build --no-cache -t explorviz/explorviz-frontend:X`
