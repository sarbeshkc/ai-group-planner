// src/lib/permissions.ts
export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export interface Permission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  manage: boolean; // Can manage other users' permissions
}

// Define permissions for each role
const rolePermissions: Record<Role, Record<string, Permission>> = {
  owner: {
    group: { create: true, read: true, update: true, delete: true, manage: true },
    plan: { create: true, read: true, update: true, delete: true, manage: true },
    task: { create: true, read: true, update: true, delete: true, manage: true },
    user: { create: true, read: true, update: true, delete: true, manage: true },
  },
  admin: {
    group: { create: true, read: true, update: true, delete: false, manage: false },
    plan: { create: true, read: true, update: true, delete: true, manage: true },
    task: { create: true, read: true, update: true, delete: true, manage: true },
    user: { create: true, read: true, update: true, delete: false, manage: true },
  },
  member: {
    group: { create: false, read: true, update: false, delete: false, manage: false },
    plan: { create: true, read: true, update: true, delete: false, manage: false },
    task: { create: true, read: true, update: true, delete: true, manage: false },
    user: { create: false, read: true, update: false, delete: false, manage: false },
  },
  viewer: {
    group: { create: false, read: true, update: false, delete: false, manage: false },
    plan: { create: false, read: true, update: false, delete: false, manage: false },
    task: { create: false, read: true, update: false, delete: false, manage: false },
    user: { create: false, read: true, update: false, delete: false, manage: false },
  },
};

// Check if a user has permission to perform an action
export const hasPermission = (
  userRole: Role,
  resourceType: 'group' | 'plan' | 'task' | 'user',
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
): boolean => {
  return rolePermissions[userRole][resourceType][action];
};

// Get group member role
export const getMemberRole = (
  groupData: any,
  userId: string
): Role | null => {
  if (!groupData || !userId) return null;
  
  // Check if user is the owner
  if (groupData.createdBy === userId) return 'owner';
  
  // Check if user has a specific role assigned
  if (groupData.memberRoles && groupData.memberRoles[userId]) {
    return groupData.memberRoles[userId] as Role;
  }
  
  // Default role for group members
  if (groupData.members && 
      (groupData.members.includes(userId) || groupData.members[userId])) {
    return 'member';
  }
  
  return null;
};