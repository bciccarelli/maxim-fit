import { redirect } from 'next/navigation';

export default function OldSettingsPage() {
  redirect('/dashboard/settings');
}
