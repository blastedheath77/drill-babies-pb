import { PageHeader } from '@/components/page-header';
import { ProfileClient } from './profile-client';

export default async function ProfilePage() {
  // This page requires authentication, but we'll handle that in the client component
  return (
    <>
      <PageHeader
        title="Profile Settings"
        description="Manage your account settings, preferences, and profile information."
      />
      
      <div className="max-w-4xl mx-auto">
        <ProfileClient />
      </div>
    </>
  );
}