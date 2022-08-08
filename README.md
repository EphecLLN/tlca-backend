# tlca-backend

Backend server of the TLCA platform

## Quick install

Start by installing required dependencies:

- [MongoDB](https://www.mongodb.com/try/download/community) (4.2+)
- [Node.js](https://nodejs.org) (16+)
- [Yarn Classic](https://classic.yarnpkg.com)

Then, clone the Git repository, and launch the installation:

    > git clone https://github.com/TLCA-project/tlca-backend.git
    > cd tlca-backend
    > yarn install

Once successfully installed, create a local untracked file in the root folder named `.env.development`. Write the following content in this file:

    > MONGODB_URI=mongodb://localhost:27017/tlca-dev
    > JWT_SECRET=MY_SECRET_STORY

You must of course refer to your own local configuration for the MongoDB server and you can customise the name of the database and the secret JWT key to be used. Then, you can run the backend server locally in development mode:

    > yarn start

The backend server should be ready at [http://localhost:4001](http://localhost:4001). From there, you will be able to easily query the server with Apollo Studio.

## Install in Docker Development Environment

You can also use a Docker Development Environment instead of installing the application on your own machine.

First, install or upgrade [Docker](https://www.docker.com) on your host, to have the latest _Dev Env_ features.

With [VSCode support for remote containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers), you can edit source files that are inside the container directly from the IDE on your local machine.

There are two possible ways to work:

- the source files can remain on your local filesystem, with all the dependencies files, and you use a container to run the application, knowing that any change in the container is reflected back on your local machine,
- or you can keep the source files entirely in the container, with all the dependencies files, edit the code with VSCode on your local machine, check the results on your local browser, knowing that the code does not need to exist on your host filesystem.

In both cases, two containers will be launched: one for the database and another one for the node backend. They are handled by Docker Compose.

Environment variables are handled through the `.docker-env.development` file that you can edit and fit to your needs.

You can also adjust the container configuration by editing the `.docker/docker-compose.yaml` file. Another `docker-compose.yaml` file is available at the root of the `tlca-backend` directory. This one can be used to start the containers directly, outside _Docker Dev Env_.

### Using a local folder

Start a Docker Development Environment from Docker Desktop. For that, first _“Create”_ a _“New Dev Environment”_ and choose the _“Local Directory”_ source. Select the `tlca-backend` directory on your local filesystem, and finish the interactive wizard. You will now have a running _Docker Dev Env_ with two running containers, one for the Mongo database and another one for the backend. You can now push the _“Open in VSCode”_ button next to the backend container to open the code in VSCode.

Once in VSCode, you can edit the source files, but also run the development server. Open a terminal in the container from VSCode, and run:

    > yarn install
    > yarn start

Once the server is started, you will be able to access the backend via [http://localhost:4001](http://localhost:4001).

### Using a remote repository

Use the same procedure as above, but choose source _“Existing Git Repo”_ and provide the URL of the repository (you can specify a specific branch by adding its name prefixed with a `@` character at the end of the git URL). As above, run:

    > yarn install
    > yarn start

and open [http://localhost:4001](http://localhost:4001) in your browser.
