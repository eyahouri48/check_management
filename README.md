# Check Management App

This is a Check Management Application built using Node.js, Express, EJS, and PostgreSQL. The app provides authentication and role-based access for administrators, agents, and cashiers to manage checks, banks, and accounts.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v14.x or later)
- [npm](https://www.npmjs.com/) (Node Package Manager)
- [PostgreSQL](https://www.postgresql.org/) (Database)

## Installation

Follow these steps to get the project up and running:

1. **Extract the Zipped Folder:**

   Download and extract the zipped folder containing the project files.

2. **Open a Terminal:**

   Navigate to the extracted project folder using your terminal or command prompt:

   ```bash
   cd path/to/extracted-folder
3. **Install Dependencies:**

   in you terminal , run the following command to install the required npm packages: npm install

4. **Create a .env File:**
In the root directory of the project, create a .env file with the following content:
DB_USER='yourUserName'
DB_HOST='localhost'
DB_DATABASE='yourDatabaseName'
DB_PASSWORD='yourDatabasePassword'
DB_PORT=5432
SESSION_SECRET='yourSessionSecret'

Replace DB_USER,DB_DATABASE,DB_PASSWORD with your PostgreSQL credentials and database name.
Replace SESSION_SECRET with a secret key for session management.

5. **Set Up the database:**
Create a PostgreSQL database using the name you specified in the .env file. Run any necessary migrations or SQL scripts to set up your database schema.

6. **Run the application:**
in your terminal run the following command to start the app : node app.js



