'use client';

import { NotificationsPage } from '@/components/notifications/NotificationsPage';

export default function NurseNotificationsPage() {
  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <NotificationsPage rolePrefix="/nurse" />
    </div>
  );
}
