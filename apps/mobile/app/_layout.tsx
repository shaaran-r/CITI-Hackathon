import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { initializeLocalStore } from '../src/local-store';

export default function RootLayout(): React.JSX.Element {
  return (
    <SQLiteProvider databaseName="kaushalsetu.db" onInit={initializeLocalStore}>
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}
