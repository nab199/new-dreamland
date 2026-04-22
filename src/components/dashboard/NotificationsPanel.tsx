import React from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';

export interface DashboardNotification {
  id: number;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

interface NotificationsPanelProps {
  notifications: DashboardNotification[];
  unreadCount: number;
  onClose: () => void;
  onMarkAllRead: () => void | Promise<void>;
  onMarkRead: (id: number) => void | Promise<void>;
}

export default function NotificationsPanel({
  notifications,
  unreadCount,
  onClose,
  onMarkAllRead,
  onMarkRead,
}: NotificationsPanelProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-start justify-end p-4 sm:p-6 pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto bg-black/5" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 pointer-events-auto flex flex-col max-h-[80vh] overflow-hidden mt-16 sm:mt-20">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-stone-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                {unreadCount} NEW
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-stone-400 hover:text-emerald-600 transition-colors p-1"
                title="Mark all as read"
              >
                <CheckCheck size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-stone-50/50">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => onMarkRead(notification.id)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  notification.is_read
                    ? 'bg-white/50 border-transparent opacity-80'
                    : 'bg-white border-emerald-100 shadow-sm'
                } hover:bg-stone-50`}
              >
                <div className="flex gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      notification.is_read
                        ? 'bg-stone-100 text-stone-400'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    <Bell size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4
                        className={`text-sm font-bold truncate ${
                          notification.is_read ? 'text-stone-600' : 'text-stone-900'
                        }`}
                      >
                        {notification.title}
                      </h4>
                      <span className="text-[10px] text-stone-400 whitespace-nowrap">
                        {new Date(notification.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p
                      className={`text-xs leading-relaxed line-clamp-2 ${
                        notification.is_read ? 'text-stone-400' : 'text-stone-500'
                      }`}
                    >
                      {notification.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-300 mx-auto mb-3">
                <Bell size={24} />
              </div>
              <p className="text-sm font-medium text-stone-400">No notifications yet</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-stone-100 text-center bg-white">
          <button
            onClick={onClose}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            Close panel
          </button>
        </div>
      </div>
    </div>
  );
}
