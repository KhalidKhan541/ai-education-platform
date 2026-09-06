'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  User,
  Mail,
  Bell,
  Shield,
  Palette,
  Globe,
  Camera,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';

type SettingsTab = 'profile' | 'notifications' | 'security' | 'appearance' | 'language';

const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'language', label: 'Language', icon: Globe },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [name, setName] = useState(user?.name || 'Alex Johnson');
  const [email, setEmail] = useState(user?.email || 'alex@example.com');
  const [bio, setBio] = useState('Passionate learner focused on web development and AI.');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <p className="mt-1 text-sm text-slate-500">Manage your account preferences</p>
        </div>
        {saved && (
          <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
            Settings saved successfully!
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Profile Settings</h3>
                <p className="mt-1 text-sm text-slate-500">Update your personal information</p>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 text-2xl font-bold text-white">
                    {name.charAt(0)}
                  </div>
                  <button className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                    <Camera className="h-3.5 w-3.5 text-slate-600" />
                  </button>
                </div>
                <div>
                  <p className="font-medium text-slate-900">{name}</p>
                  <p className="text-sm text-slate-500">Level {user?.level || 12} • {user?.xp?.toLocaleString() || '2,450'} XP</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-300"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Notification Preferences</h3>
                <p className="mt-1 text-sm text-slate-500">Choose how you want to be notified</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Assignment reminders', description: 'Get notified before assignments are due', default: true },
                  { label: 'Quiz availability', description: 'When new quizzes are available', default: true },
                  { label: 'Discussion replies', description: 'When someone replies to your discussions', default: true },
                  { label: 'Grade posted', description: 'When your assignment is graded', default: true },
                  { label: 'New courses', description: 'When new courses are published', default: false },
                  { label: 'Weekly progress report', description: 'Summary of your weekly learning activity', default: true },
                  { label: 'Achievement unlocked', description: 'When you earn new badges or achievements', default: true },
                  { label: 'Leaderboard changes', description: 'When your rank changes significantly', default: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
                    <div>
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="text-sm text-slate-500">{item.description}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        defaultChecked={item.default}
                        className="peer sr-only"
                      />
                      <div className="h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-violet-600 peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Security Settings</h3>
                <p className="mt-1 text-sm text-slate-500">Manage your password and security</p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  leftIcon={<Shield className="h-4 w-4" />}
                  rightIcon={
                    <button onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                <Input
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  leftIcon={<Shield className="h-4 w-4" />}
                  rightIcon={
                    <button onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                <Input
                  label="Confirm New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  leftIcon={<Shield className="h-4 w-4" />}
                />
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="font-medium text-slate-900">Two-Factor Authentication</h4>
                <p className="mt-1 text-sm text-slate-500">
                  Add an extra layer of security to your account
                </p>
                <Button variant="outline" className="mt-3">
                  Enable 2FA
                </Button>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Update Password
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Appearance</h3>
                <p className="mt-1 text-sm text-slate-500">Customize the look and feel</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Light', 'Dark', 'System'].map((theme) => (
                      <button
                        key={theme}
                        className={cn(
                          'rounded-lg border-2 p-4 text-center transition-colors',
                          theme === 'Light'
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <div className={cn(
                          'mx-auto mb-2 h-12 w-20 rounded-md',
                          theme === 'Light' && 'bg-white border border-slate-200',
                          theme === 'Dark' && 'bg-slate-800',
                          theme === 'System' && 'bg-gradient-to-r from-white to-slate-800 border border-slate-200'
                        )} />
                        <span className="text-sm font-medium text-slate-700">{theme}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Accent Color</label>
                  <div className="flex gap-3">
                    {['bg-violet-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500', 'bg-pink-500'].map((color) => (
                      <button
                        key={color}
                        className={cn(
                          'h-8 w-8 rounded-full',
                          color,
                          color === 'bg-violet-500' && 'ring-2 ring-offset-2 ring-violet-500'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Appearance
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Language & Region</h3>
                <p className="mt-1 text-sm text-slate-500">Set your language and regional preferences</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Language</label>
                  <select className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-300">
                    <option>English (US)</option>
                    <option>English (UK)</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Japanese</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Timezone</label>
                  <select className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-300">
                    <option>UTC-8 (Pacific Time)</option>
                    <option>UTC-5 (Eastern Time)</option>
                    <option>UTC+0 (GMT)</option>
                    <option>UTC+1 (CET)</option>
                    <option>UTC+9 (JST)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Date Format</label>
                  <select className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-300">
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
