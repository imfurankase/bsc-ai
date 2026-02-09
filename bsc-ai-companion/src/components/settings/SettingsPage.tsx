import { useState } from 'react';
import { Settings, User, Bell, Shield, Palette, Key, Building2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const SettingsPage = () => {
  const { workspaces, activeWorkspaceId } = useAppStore();
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@ai-assistant.com',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    desktop: false,
    chatAlerts: true,
  });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and workspace preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="workspace" className="gap-2">
            <Building2 className="w-4 h-4" />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="w-4 h-4" />
            API Keys
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground">
                  {profile.name.charAt(0)}
                </div>
                <div>
                  <Button variant="outline">Change Avatar</Button>
                  <p className="text-sm text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <Button className="gradient-primary">Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" className="mt-1.5 max-w-md" />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" className="mt-1.5 max-w-md" />
              </div>
              <Button variant="outline">Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workspace Tab */}
        <TabsContent value="workspace" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>Manage your current workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{activeWorkspace?.name}</h3>
                  <p className="text-sm text-muted-foreground">{activeWorkspace?.description}</p>
                </div>
              </div>
              <div>
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  defaultValue={activeWorkspace?.name}
                  className="mt-1.5 max-w-md"
                />
              </div>
              <Button variant="outline">Update Workspace</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive">Delete Workspace</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Desktop Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get browser push notifications</p>
                </div>
                <Switch
                  checked={notifications.desktop}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, desktop: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Chat Alerts</Label>
                  <p className="text-sm text-muted-foreground">Alert on new chat messages</p>
                </div>
                <Switch
                  checked={notifications.chatAlerts}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, chatAlerts: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage API keys for external integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Production Key</p>
                    <p className="text-sm text-muted-foreground font-mono">api_prod_••••••••••••</p>
                  </div>
                  <Button variant="outline" size="sm">Reveal</Button>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Development Key</p>
                    <p className="text-sm text-muted-foreground font-mono">api_dev_••••••••••••</p>
                  </div>
                  <Button variant="outline" size="sm">Reveal</Button>
                </div>
              </div>
              <Button className="gradient-primary">Generate New Key</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
