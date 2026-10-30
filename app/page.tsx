import { requireChatGPTUser } from './chatgpt-auth';
import Connection from './connection';
export const dynamic = 'force-dynamic';
export default async function Home() {
  await requireChatGPTUser('/');
  return <Connection />;
}
