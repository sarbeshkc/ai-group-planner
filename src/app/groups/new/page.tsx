// src/app/groups/new/page.tsx
import GroupForm from '@/components/forms/GroupForm';

export default function NewGroupPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Create a New Group</h1>
      <GroupForm />
    </div>
  );
}