# ExplorViz

ExplorViz is a software visualization as a service approach that researches how to facilitate program comprehension via collaboration and device-heterogenity.

Our [website](https://explorviz.dev) contains additional information such as a quickstart guide and a demo.

## Frontend

This repository contains ExplorViz' frontend component. Below you can find instructions that outline the details of collaborating on this software.

The usability and effectiveness of ExplorViz has been investigated in controlled experiments which resulted in increased efficiency and effectiveness over competing approaches.

This project is a WIP replica of ExplorViz's visualization component. It substitutes [GWT](http://www.gwtproject.org/) client-code with [EmberJS](https://www.emberjs.com/). This is only the frontend, you will need the [backend](https://github.com/ExplorViz/explorviz-backend) as well for production.

## Citation

If you use this software, please cite

- Wilhelm Hasselbring, Alexander Krause, Christian Zirkelbach, (2020): ExplorViz: Research on software visualization, comprehension and collaboration. Software Impacts, Volume 6. DOI https://doi.org/10.1016/j.simpa.2020.100034.
  [[BibTex]](http://eprints.uni-kiel.de/cgi/export/eprint/50471/BibTeX/cau-eprint-50471.bib) | [[Endnote]](http://eprints.uni-kiel.de/cgi/export/eprint/50471/EndNote/cau-eprint-50471.enw)

- Florian Fittkau, Alexander Krause, Wilhelm Hasselbring (2017): Software landscape and application visualization for system comprehension with ExplorViz. Information and Software Technology, Volume 87. pp. 259-277. DOI https://doi.org/10.1016/j.infsof.2016.07.004.
  [[BibTex]](http://eprints.uni-kiel.de/cgi/export/eprint/33464/BibTeX/cau-eprint-33464.bib) | [[Endnote]](http://eprints.uni-kiel.de/cgi/export/eprint/33464/EndNote/cau-eprint-33464.enw)

Citing ExplorViz' collaborative modularization process:

- Zirkelbach, Christian, Krause, Alexander and Hasselbring, Wilhelm (2019): Modularization of Research Software for Collaborative Open Source Development. In Proceedings of the Ninth International Conference on Advanced Collaborative Networks, Systems and Applications (COLLA 2019), June 30 - July 04, 2019, Rome, Italy.
  [[BibTex]](http://eprints.uni-kiel.de/cgi/export/eprint/46777/BibTeX/cau-eprint-46777.bib) | [[Endnote]](http://eprints.uni-kiel.de/cgi/export/eprint/46777/EndNote/cau-eprint-46777.enw)

## Documentation

The API documentation is available [here](https://explorviz.github.io/explorviz-frontend/).

## Deployment

Use our Docker images as described in our [deployment](https://github.com/ExplorViz/deployment) repository.

## Development

### Prerequisites

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js 16](https://nodejs.org/) (with npm 8.13.2 or higher)
- [Ember CLI](https://cli.emberjs.com/release/)
- [Docker](https://www.docker.com) for (mocked) backend

### Installation

- `git clone <repository-url>` this repository
- `cd explorviz-frontend`
- `npm install`

### Running / Development

- Copy configuration file: `cp .env .env-custom`
- In `.env-custom`: change value of `AUTH0_ENABLED` to _false_
- Start application: `npm run dev`
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
