import { UserManagement } from '../components/auth/UserManagement';
import { useAuth } from '../hooks/useAuth';

export const UsersPage = () => {
  const { users, addUser, updateUser } = useAuth();
  return <UserManagement users={users} onAdd={addUser} onUpdate={updateUser} />;
};
