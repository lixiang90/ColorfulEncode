import { getScripts } from '@/lib/scriptLoader';
import ChatClient from '@/components/ChatClient';

export default function Home() {
  const scripts = getScripts();

  return <ChatClient initialScripts={scripts} />;
}
