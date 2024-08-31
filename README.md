
# Check Management App
This is a Check Management Application built using Node.js, Express, EJS, and PostgreSQL. The app provides authentication and role-based access for administrators, agents, and cashiers to manage checks, banks, and accounts.

## Prerequisites
Before you begin, ensure you have the following installed on your system:

-Node.js (v14.x or later)
-npm (Node Package Manager)
-PostgreSQL (Database)
## Installation
To set up and run the project, follow these steps:

1. **Clone the Repository:**

Open a terminal and clone the repository using the command:

2. **git clone <repository-url>:**

Replace <repository-url> with the URL of your GitHub repository.

3. **Navigate to the Project Folder:**

Change directory to the project folder with:

cd path/to/cloned-folder

Replace path/to/cloned-folder with the path to the cloned repository.

4. **Install Dependencies:**

Run the following command to install the required npm packages:

npm install

5.**Create a .env File:**

In the root directory of the project, create a .env file with the following content:

-DB_USER='yourUserName'
-DB_HOST='localhost'
-DB_DATABASE='yourDatabaseName'
-DB_PASSWORD='yourDatabasePassword'
-DB_PORT=5432
-SESSION_SECRET='yourSessionSecret'
Replace DB_USER, DB_DATABASE, and DB_PASSWORD with your PostgreSQL credentials and database name. Replace SESSION_SECRET with a secret key for session management.

6.**Set Up the Database:**

Create a PostgreSQL database using the name you specified in the .env file.
In PostgreSQL, execute the db.sql script to create the database .

7.**Run the Application:**

Start the app with the following command:

node app.js

## Usage
Open your web browser and navigate to http://localhost:3000 (or the port specified in your configuration) to access the application.








