# Firebase Studio - FerreTrack

This is a NextJS starter for FerreTrack in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Variables

Create a `.env.local` file in the root of your project and add the following environment variables:

```
MONGODB_URI="your_mongodb_atlas_connection_string"
MONGODB_DB_NAME="your_database_name" # e.g., ferretrack
GOOGLE_API_KEY="your_google_ai_api_key" # For Genkit AI features
```

Replace `your_mongodb_atlas_connection_string` with the connection string you obtained from MongoDB Atlas (make sure to include your username and password).
Replace `your_database_name` with the name of the database you want to use within your Atlas cluster.
Replace `your_google_ai_api_key` with your API key for Google AI Studio (Gemini). You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```

The application will be available at http://localhost:9002.

## Genkit AI Development

If you are working with AI features, you might also want to run the Genkit development server:

```bash
npm run genkit:dev
```
Or for watching changes:
```bash
npm run genkit:watch
```
The Genkit developer UI will be available at http://localhost:4000.
