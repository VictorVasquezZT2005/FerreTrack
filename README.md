# Firebase Studio - FerreTrack

This is a NextJS starter for FerreTrack in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Variables

Create a `.env.local` file in the root of your project and add the following environment variables:

\`\`\`
MONGODB_URI="your_mongodb_atlas_connection_string"
MONGODB_DB_NAME="your_database_name" # e.g., ferretrack
\`\`\`

Replace `your_mongodb_atlas_connection_string` with the connection string you obtained from MongoDB Atlas (make sure to include your username and password).
Replace `your_database_name` with the name of the database you want to use within your Atlas cluster.

## Running the Application

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
2. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

The application will be available at http://localhost:9002.
