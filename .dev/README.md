## Prerequisites

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js 20](https://nodejs.org/) (as required per package.json)
- [Ember CLI](https://cli.emberjs.com/release/)
- [Docker](https://www.docker.com) for (mocked) backend

## Installation

- `git clone <repository-url>` this repository
- `cd explorviz-frontend`
- `npm install`

## Running / Development

- Copy configuration file: `cp .env .env-custom`
- In `.env-custom`: change value of `AUTH0_ENABLED` to _false_
- Start application: `npm run dev`
- (Update mocked backend stack: `cd .dev && docker compose pull`)
- Start mocked backend: `cd .dev && docker compose up -d`
- Open frontend at [http://localhost:4200](http://localhost:4200)

### Code Generators

Make use of the many generators for code, try `ember help generate` for more details

### Running Tests

- `ember test`
- `ember test --server`

### Linting

- `npm run lint`
- `npm run lint:fix`

### Building

- `ember build --prod`
- For a given Docker tag `X`: `docker build --no-cache -t explorviz/explorviz-frontend:X`
