'use client';

import { NotificationsPage } from '@/components/notifications/NotificationsPage';
import { NursePageHeader } from '@/components/nurse/NursePageHeader';

export default function NurseNotificationsPage() {
  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <NursePageHeader />
      <NotificationsPage rolePrefix="/nurse" />
    </div>
  );
}
