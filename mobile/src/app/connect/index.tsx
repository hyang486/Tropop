import { Redirect } from 'expo-router';

// tabs-spec §1: Connections is the Qrews tab now; old `/connect` links land on it.
export default function ConnectIndex() {
  return <Redirect href="/qrews" />;
}
