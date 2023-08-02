# ExplorViz

ExplorViz is a software visualization as a service approach that researches how to facilitate program comprehension via collaboration and device-heterogenity.

Our [website](https://explorviz.dev) contains additional information such as a quickstart guide and a demo.

## Frontend

This repository contains ExplorViz' frontend component. Below you can find instructions that outline the details of collaborating on this software.

### Prerequisites

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js 16](https://nodejs.org/) (with npm 8.13.2 or higher)
- [Ember CLI](https://cli.emberjs.com/release/)

### Installation

- `git clone <repository-url>` this repository
- `cd explorviz-frontend`
- `npm install`

### Running / Development

- Copy configuration file: `cp .env .env-custom`
- In `.env-custom`: change `AUTH0_ENABLED` to false.
- Start application: `DOTENV=.env-custom ember s`
- Start mocked backend: `cd .dev && docker compose up -d`
- Open frontend at [http://localhost:4200](http://localhost:4200).

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
